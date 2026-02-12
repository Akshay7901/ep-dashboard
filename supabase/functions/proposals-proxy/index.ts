import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-custom-path, x-custom-method',
};

const API_BASE_URL = 'https://api.ethicspress.com';

// Helper to build upstream headers
function buildUpstreamHeaders(req: Request, authHeader: string): Record<string, string> {
  const accept = req.headers.get('accept') || 'application/json';
  const userAgent = req.headers.get('user-agent');
  const xForwardedFor = req.headers.get('x-forwarded-for');

  const headers: Record<string, string> = {
    'Accept': accept,
    'Authorization': authHeader,
    'Content-Type': 'application/json',
  };
  if (userAgent) headers['User-Agent'] = userAgent;
  if (xForwardedFor) headers['X-Forwarded-For'] = xForwardedFor;
  return headers;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}

function errorResponse(message: string, status: number, upstream?: unknown): Response {
  return jsonResponse(
    upstream
      ? { error: message, upstream }
      : { error: message },
    status
  );
}

// Generic proxy request handler
async function proxyRequest(
  method: string,
  apiUrl: string,
  headers: Record<string, string>,
  body?: string
): Promise<Response> {
  const fetchOptions: RequestInit = {
    method,
    headers,
  };

  if (body && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
    fetchOptions.body = body;
  }

  let response: globalThis.Response;
  try {
    response = await fetch(apiUrl, fetchOptions);
  } catch (networkError: unknown) {
    // Network-level errors (HTTP2 connection errors, timeouts, DNS failures, etc.)
    // Return a structured 200 response so the frontend can handle it gracefully
    // instead of crashing the edge function with a 500.
    const errMsg = networkError instanceof Error ? networkError.message : String(networkError);
    console.error(`Network error proxying ${method} ${apiUrl}:`, errMsg);
    return jsonResponse(
      {
        error: `Network error communicating with upstream API`,
        upstream: {
          status: 0,
          url: apiUrl,
          body: errMsg,
        },
      },
      200
    );
  }

  const responseText = await response.text();

  if (!response.ok) {
    console.error(`Upstream API error`, {
      status: response.status,
      url: apiUrl,
      body: responseText,
    });

    // IMPORTANT: Some clients/platforms treat non-2xx responses as a runtime error and can blank-screen.
    // For upstream 4xx errors (business-rule conflicts, permission issues), return 200 with a
    // structured payload so the frontend can show a friendly message without the function being flagged.
    if ([400, 401, 403, 404, 405, 409].includes(response.status)) {
      let parsedBody: unknown = responseText;
      try {
        parsedBody = responseText ? JSON.parse(responseText) : null;
      } catch {
        // keep raw string
      }

      return jsonResponse(
        {
          error: `Upstream API error (${response.status})`,
          upstream: {
            status: response.status,
            url: apiUrl,
            body: parsedBody,
          },
        },
        200
      );
    }

    return errorResponse(
      `Upstream API error (${response.status})`,
      response.status,
      {
        status: response.status,
        url: apiUrl,
        body: responseText,
      }
    );
  }

  let data: unknown = null;
  if (responseText && responseText.trim().length > 0) {
    try {
      data = JSON.parse(responseText);
    } catch {
      // Upstream sometimes returns plain text (or non-JSON) even on 200s.
      // Never crash the function—just pass through raw text.
      data = { raw: responseText };
    }
  }
  return jsonResponse(data, 200);
}

type LocalOverride = {
  id: string;
  status: string;
  contract_sent?: boolean | null;
  contract_sent_at?: string | null;
  finalised_at?: string | null;
  finalised_by?: string | null;
  value?: number | null;
  updated_at?: string | null;
  ticket_number?: string | null;
};

function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('Missing backend env vars for local override lookup');
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

async function getLocalOverrideByTicket(ticketNumber: string): Promise<LocalOverride | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('proposals')
    .select('id,status,contract_sent,contract_sent_at,finalised_at,finalised_by,value,updated_at,ticket_number')
    .eq('ticket_number', ticketNumber)
    .maybeSingle();

  if (error) {
    console.error('Local override lookup failed', { ticketNumber, error });
    return null;
  }

  return (data as LocalOverride | null) ?? null;
}

async function getLocalOverridesByTickets(ticketNumbers: string[]): Promise<Map<string, LocalOverride>> {
  const map = new Map<string, LocalOverride>();
  if (ticketNumbers.length === 0) return map;

  const supabase = getSupabaseClient();
  if (!supabase) return map;

  const { data, error } = await supabase
    .from('proposals')
    .select('id,status,contract_sent,contract_sent_at,finalised_at,finalised_by,value,updated_at,ticket_number')
    .in('ticket_number', ticketNumbers);

  if (error) {
    console.error('Local overrides lookup failed', { error });
    return map;
  }

  for (const row of (data || [])) {
    if (row.ticket_number) {
      map.set(row.ticket_number, row as LocalOverride);
    }
  }

  return map;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    // Check for custom path header (used when invoking from Supabase client)
    const customPath = req.headers.get('x-custom-path');
    const customMethod = req.headers.get('x-custom-method');
    const path = customPath || url.pathname;
    const method = customMethod || req.method;

    // Get authorization token from request headers
    const authHeader = req.headers.get('authorization');

    if (!authHeader) {
      console.error('No authorization token provided');
      return errorResponse('Authorization token is required', 401);
    }

    const headers = buildUpstreamHeaders(req, authHeader);

    // Route: GET /peer-reviewers - List peer reviewers
    if (path.endsWith('/peer-reviewers') && method === 'GET') {
      console.log('Fetching peer reviewers list');
      return await proxyRequest('GET', `${API_BASE_URL}/api/proposals/users/peer-reviewers`, headers);
    }

    // Route: POST /peer-reviewers - Create peer reviewer
    if (path.endsWith('/peer-reviewers') && method === 'POST') {
      const body = await req.text();
      console.log('Creating peer reviewer');
      return await proxyRequest('POST', `${API_BASE_URL}/api/proposals/users/peer-reviewers`, headers, body);
    }

    // Route: DELETE /peer-reviewers/:id - Delete peer reviewer
    const peerReviewerDeleteMatch = path.match(/\/peer-reviewers\/([^\/]+)$/);
    if (peerReviewerDeleteMatch && method === 'DELETE') {
      const reviewerId = peerReviewerDeleteMatch[1];
      console.log(`Deleting peer reviewer: ${reviewerId}`);
      return await proxyRequest('DELETE', `${API_BASE_URL}/api/proposals/users/peer-reviewers/${encodeURIComponent(reviewerId)}`, headers);
    }

    // Route: GET /comments/:ticket - Get proposal comments
    const commentsGetMatch = path.match(/\/comments\/([^\/]+)$/);
    if (commentsGetMatch && method === 'GET') {
      const ticketNumber = commentsGetMatch[1];
      console.log(`Fetching comments for: ${ticketNumber}`);
      return await proxyRequest('GET', `${API_BASE_URL}/api/proposals/${encodeURIComponent(ticketNumber)}/comments`, headers);
    }

    // Route: POST /comments/:ticket - Add comment to proposal
    const commentsPostMatch = path.match(/\/comments\/([^\/]+)$/);
    if (commentsPostMatch && method === 'POST') {
      const ticketNumber = commentsPostMatch[1];
      const body = await req.text();
      console.log(`Adding comment to: ${ticketNumber}`);
      return await proxyRequest('POST', `${API_BASE_URL}/api/proposals/${encodeURIComponent(ticketNumber)}/comments`, headers, body);
    }

    // Route: POST /reassign/:ticket - Reassign proposal to another peer reviewer
    const reassignMatch = path.match(/\/reassign\/([^\/]+)$/);
    if (reassignMatch && method === 'POST') {
      const ticketNumber = reassignMatch[1];
      const body = await req.text();
      console.log(`Reassigning proposal: ${ticketNumber}`);
      return await proxyRequest('POST', `${API_BASE_URL}/api/proposals/${encodeURIComponent(ticketNumber)}/reassign`, headers, body);
    }

    // Route: POST /assign/:ticket - Assign proposal to peer reviewers
    const assignMatch = path.match(/\/assign\/([^\/]+)$/);
    if (assignMatch && method === 'POST') {
      const ticketNumber = assignMatch[1];
      const body = await req.text();
      console.log(`Assigning proposal: ${ticketNumber}`);
      return await proxyRequest('POST', `${API_BASE_URL}/api/proposals/${encodeURIComponent(ticketNumber)}/assign`, headers, body);
    }

    // Route: DELETE /assign/:ticket - Unassign all reviewers from proposal
    const unassignMatch = path.match(/\/assign\/([^\/]+)$/);
    if (unassignMatch && method === 'DELETE') {
      const ticketNumber = unassignMatch[1];
      console.log(`Unassigning reviewers from proposal: ${ticketNumber}`);
      return await proxyRequest('DELETE', `${API_BASE_URL}/api/proposals/${encodeURIComponent(ticketNumber)}/assign`, headers);
    }

    // Route: PATCH /status/:ticket - Update proposal status
    const statusMatch = path.match(/\/status\/([^\/]+)$/);
    if (statusMatch && method === 'PATCH') {
      const ticketNumber = statusMatch[1];
      const body = await req.text();
      console.log(`Updating status for: ${ticketNumber}`);
      return await proxyRequest('PATCH', `${API_BASE_URL}/api/proposals/${encodeURIComponent(ticketNumber)}/status`, headers, body);
    }

    // Route: POST /revise/:ticket - Create proposal revision
    const reviseMatch = path.match(/\/revise\/([^\/]+)$/);
    if (reviseMatch && method === 'POST') {
      const ticketNumber = reviseMatch[1];
      const body = await req.text();
      console.log(`Creating revision for: ${ticketNumber}`);
      return await proxyRequest('POST', `${API_BASE_URL}/api/proposals/${encodeURIComponent(ticketNumber)}/revise`, headers, body);
    }

    // Route: DELETE /proposal/:ticket - Delete proposal
    const deleteMatch = path.match(/\/proposal\/([^\/]+)$/);
    if (deleteMatch && method === 'DELETE') {
      const ticketNumber = deleteMatch[1];
      console.log(`Deleting proposal: ${ticketNumber}`);
      return await proxyRequest('DELETE', `${API_BASE_URL}/api/proposals/${encodeURIComponent(ticketNumber)}`, headers);
    }

    // Default route: Original GET proposals behavior
    if (method === 'GET') {
      const ticketNumber = url.searchParams.get('ticket');
      const limit = url.searchParams.get('limit') || '50';
      const offset = url.searchParams.get('offset') || '0';

      if (ticketNumber) {
        const safeTicket = encodeURIComponent(ticketNumber);
        const apiUrl = `${API_BASE_URL}/api/proposals/${safeTicket}`;
        console.log(`Fetching proposal details: ${ticketNumber}`);

        // Get upstream details
        const upstreamRes = await proxyRequest('GET', apiUrl, headers);
        if (!upstreamRes.ok) return upstreamRes;

        const upstreamData = await upstreamRes.json().catch(() => null) as any;

        // Merge in local workflow override (status + local UUID), so refresh shows correct actions
        const localOverride = await getLocalOverrideByTicket(ticketNumber);

        if (upstreamData && localOverride) {
          upstreamData.status = localOverride.status; // overrides external 'new'/'under_review' etc
          upstreamData.local_override = localOverride;
        } else if (upstreamData) {
          upstreamData.local_override = null;
        }

        return jsonResponse(upstreamData, 200);
      }

      // List endpoint - merge local overrides and fetch address/country for each proposal
      const apiUrl = `${API_BASE_URL}/api/proposals?limit=${limit}&offset=${offset}`;
      console.log(`Fetching proposals list: limit=${limit}, offset=${offset}`);

      const upstreamRes = await proxyRequest('GET', apiUrl, headers);
      if (!upstreamRes.ok) return upstreamRes;

      const upstreamData = await upstreamRes.json().catch(() => null) as any;

      if (upstreamData?.proposals && Array.isArray(upstreamData.proposals)) {
        const ticketNumbers = upstreamData.proposals.map((p: any) => p.ticket_number).filter(Boolean);
        const overrideMap = await getLocalOverridesByTickets(ticketNumbers);

        // Fetch detail for each proposal in parallel to get address/country and assigned_reviewers
        const detailPromises = upstreamData.proposals.map(async (p: any) => {
          try {
            const detailRes = await fetch(
              `${API_BASE_URL}/api/proposals/${encodeURIComponent(p.ticket_number)}`,
              { method: 'GET', headers }
            );
            if (detailRes.ok) {
              const detail = await detailRes.json();
              return {
                ticket_number: p.ticket_number,
                address: detail?.current_data?.address || null,
                assigned_reviewers: detail?.assigned_reviewers || null,
              };
            }
          } catch {
            // ignore individual failures
          }
          return { ticket_number: p.ticket_number, address: null, assigned_reviewers: null };
        });

        const details = await Promise.all(detailPromises);
        const detailsMap = new Map(details.map((d: any) => [d.ticket_number, d]));

        for (const proposal of upstreamData.proposals) {
          const override = overrideMap.get(proposal.ticket_number);
          if (override) {
            proposal.status = override.status;
            proposal.local_override = override;
          } else {
            proposal.local_override = null;
          }
          // Attach detail data from detail response
          const detail = detailsMap.get(proposal.ticket_number);
          proposal.address = detail?.address || null;
          proposal.assigned_reviewers = detail?.assigned_reviewers || null;
        }
      }

      return jsonResponse(upstreamData, 200);
    }

    // Method not supported for this path
    return errorResponse('Method not allowed or invalid path', 405);

  } catch (error: unknown) {
    console.error('Error fetching proposals:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch proposals';
    return errorResponse(errorMessage, 500);
  }
});
