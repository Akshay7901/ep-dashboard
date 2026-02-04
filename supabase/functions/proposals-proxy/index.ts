import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const API_BASE_URL = 'https://api.ethicspress.com';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const ticketNumber = url.searchParams.get('ticket');
    const limit = url.searchParams.get('limit') || '50';
    const offset = url.searchParams.get('offset') || '0';

    // Get authorization token from request headers
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader) {
      console.error('No authorization token provided');
      return new Response(
        JSON.stringify({ error: 'Authorization token is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    let apiUrl: string;
    
    if (ticketNumber) {
      // Fetch single proposal by ticket number
      const safeTicket = encodeURIComponent(ticketNumber);
      apiUrl = `${API_BASE_URL}/api/proposals/${safeTicket}`;
      console.log(`Fetching proposal details: ${ticketNumber} (encoded: ${safeTicket})`);
    } else {
      // Fetch list of proposals
      apiUrl = `${API_BASE_URL}/api/proposals?limit=${limit}&offset=${offset}`;
      console.log(`Fetching proposals list: limit=${limit}, offset=${offset}`);
    }

    // Some upstream APIs behave differently depending on request headers.
    // For GET requests, avoid sending Content-Type (no body) and prefer an Accept header.
    // Also forward a small allow-list of headers that can affect API routing/auth.
    const accept = req.headers.get('accept') || 'application/json';
    const userAgent = req.headers.get('user-agent');
    const xForwardedFor = req.headers.get('x-forwarded-for');

    const upstreamHeaders: Record<string, string> = {
      'Accept': accept,
      'Authorization': authHeader,
    };
    if (userAgent) upstreamHeaders['User-Agent'] = userAgent;
    if (xForwardedFor) upstreamHeaders['X-Forwarded-For'] = xForwardedFor;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: upstreamHeaders,
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error(`Upstream API error`, {
        status: response.status,
        url: apiUrl,
        body: responseText,
      });

      // Forward upstream status + body so the client can see the real failure.
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
    
    if (ticketNumber) {
      console.log(`Successfully fetched proposal: ${ticketNumber}`);
    } else {
      console.log(`Successfully fetched ${data.proposals?.length || 0} proposals`);
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
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
