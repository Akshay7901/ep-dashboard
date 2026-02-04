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
      apiUrl = `${API_BASE_URL}/api/proposals/${ticketNumber}`;
      console.log(`Fetching proposal details: ${ticketNumber}`);
    } else {
      // Fetch list of proposals
      apiUrl = `${API_BASE_URL}/api/proposals?limit=${limit}&offset=${offset}`;
      console.log(`Fetching proposals list: limit=${limit}, offset=${offset}`);
    }

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error: ${response.status} - ${errorText}`);
      throw new Error(`API responded with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
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
