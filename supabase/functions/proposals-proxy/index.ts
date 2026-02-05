import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

  const response = await fetch(apiUrl, fetchOptions);
  const responseText = await response.text();

  if (!response.ok) {
    console.error(`Upstream API error`, {
      status: response.status,
      url: apiUrl,
      body: responseText,
    });

    return new Response(
      JSON.stringify({
        error: `Upstream API error (${response.status})`,
        upstream: {
          status: response.status,
          url: apiUrl,
          body: responseText,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status,
      }
    );
  }

  const data = responseText ? JSON.parse(responseText) : null;
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  });
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;

    // Get authorization token from request headers
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader) {
      console.error('No authorization token provided');
      return new Response(
        JSON.stringify({ error: 'Authorization token is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const headers = buildUpstreamHeaders(req, authHeader);

    // Route: GET /proposals-proxy/peer-reviewers - List peer reviewers
    if (path.endsWith('/peer-reviewers') && req.method === 'GET') {
      console.log('Fetching peer reviewers list');
      return await proxyRequest('GET', `${API_BASE_URL}/api/proposals/users/peer-reviewers`, headers);
    }

    // Route: POST /proposals-proxy/peer-reviewers - Create peer reviewer
    if (path.endsWith('/peer-reviewers') && req.method === 'POST') {
      const body = await req.text();
      console.log('Creating peer reviewer');
      return await proxyRequest('POST', `${API_BASE_URL}/api/proposals/users/peer-reviewers`, headers, body);
    }

    // Route: DELETE /proposals-proxy/peer-reviewers/:id - Delete peer reviewer
    const peerReviewerDeleteMatch = path.match(/\/peer-reviewers\/([^\/]+)$/);
    if (peerReviewerDeleteMatch && req.method === 'DELETE') {
      const reviewerId = peerReviewerDeleteMatch[1];
      console.log(`Deleting peer reviewer: ${reviewerId}`);
      return await proxyRequest('DELETE', `${API_BASE_URL}/api/proposals/users/peer-reviewers/${encodeURIComponent(reviewerId)}`, headers);
    }

    // Route: GET /proposals-proxy/comments/:ticket - Get proposal comments
    const commentsGetMatch = path.match(/\/comments\/([^\/]+)$/);
    if (commentsGetMatch && req.method === 'GET') {
      const ticketNumber = commentsGetMatch[1];
      console.log(`Fetching comments for: ${ticketNumber}`);
      return await proxyRequest('GET', `${API_BASE_URL}/api/proposals/${encodeURIComponent(ticketNumber)}/comments`, headers);
    }

    // Route: POST /proposals-proxy/comments/:ticket - Add comment to proposal
    const commentsPostMatch = path.match(/\/comments\/([^\/]+)$/);
    if (commentsPostMatch && req.method === 'POST') {
      const ticketNumber = commentsPostMatch[1];
      const body = await req.text();
      console.log(`Adding comment to: ${ticketNumber}`);
      return await proxyRequest('POST', `${API_BASE_URL}/api/proposals/${encodeURIComponent(ticketNumber)}/comments`, headers, body);
    }

    // Route: POST /proposals-proxy/assign/:ticket - Assign proposal to peer reviewers
    const assignMatch = path.match(/\/assign\/([^\/]+)$/);
    if (assignMatch && req.method === 'POST') {
      const ticketNumber = assignMatch[1];
      const body = await req.text();
      console.log(`Assigning proposal: ${ticketNumber}`);
      return await proxyRequest('POST', `${API_BASE_URL}/api/proposals/${encodeURIComponent(ticketNumber)}/assign`, headers, body);
    }

    // Route: PATCH /proposals-proxy/status/:ticket - Update proposal status
    const statusMatch = path.match(/\/status\/([^\/]+)$/);
    if (statusMatch && req.method === 'PATCH') {
      const ticketNumber = statusMatch[1];
      const body = await req.text();
      console.log(`Updating status for: ${ticketNumber}`);
      return await proxyRequest('PATCH', `${API_BASE_URL}/api/proposals/${encodeURIComponent(ticketNumber)}/status`, headers, body);
    }

    // Route: POST /proposals-proxy/revise/:ticket - Create proposal revision
    const reviseMatch = path.match(/\/revise\/([^\/]+)$/);
    if (reviseMatch && req.method === 'POST') {
      const ticketNumber = reviseMatch[1];
      const body = await req.text();
      console.log(`Creating revision for: ${ticketNumber}`);
      return await proxyRequest('POST', `${API_BASE_URL}/api/proposals/${encodeURIComponent(ticketNumber)}/revise`, headers, body);
    }

    // Route: DELETE /proposals-proxy/proposal/:ticket - Delete proposal
    const deleteMatch = path.match(/\/proposal\/([^\/]+)$/);
    if (deleteMatch && req.method === 'DELETE') {
      const ticketNumber = deleteMatch[1];
      console.log(`Deleting proposal: ${ticketNumber}`);
      return await proxyRequest('DELETE', `${API_BASE_URL}/api/proposals/${encodeURIComponent(ticketNumber)}`, headers);
    }

    // Default route: Original GET proposals behavior
    if (req.method === 'GET') {
      const ticketNumber = url.searchParams.get('ticket');
      const limit = url.searchParams.get('limit') || '50';
      const offset = url.searchParams.get('offset') || '0';

      let apiUrl: string;
      
      if (ticketNumber) {
        const safeTicket = encodeURIComponent(ticketNumber);
        apiUrl = `${API_BASE_URL}/api/proposals/${safeTicket}`;
        console.log(`Fetching proposal details: ${ticketNumber}`);
      } else {
        apiUrl = `${API_BASE_URL}/api/proposals?limit=${limit}&offset=${offset}`;
        console.log(`Fetching proposals list: limit=${limit}, offset=${offset}`);
      }

      return await proxyRequest('GET', apiUrl, headers);
    }

    // Method not supported for this path
    return new Response(
      JSON.stringify({ error: 'Method not allowed or invalid path' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
    );

  } catch (error: unknown) {
    console.error('Error fetching proposals:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch proposals';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
