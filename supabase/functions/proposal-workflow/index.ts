import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token from header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const { action, proposalData, status, previousStatus, ticketNumber } = await req.json();

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === 'ensureProposal') {
      // Ensure a local proposal record exists
      if (!proposalData || !proposalData.ticket_number) {
        return new Response(JSON.stringify({ error: 'Missing proposal data' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check if proposal already exists by ticket number
      const { data: existing } = await supabase
        .from('proposals')
        .select('id')
        .eq('ticket_number', proposalData.ticket_number)
        .maybeSingle();

      if (existing) {
        return new Response(JSON.stringify({ id: existing.id }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create new local proposal record
      const { data: newProposal, error: insertError } = await supabase
        .from('proposals')
        .insert({
          ticket_number: proposalData.ticket_number,
          name: proposalData.name || proposalData.title || 'Untitled',
          author_name: proposalData.author_name || proposalData.author || 'Unknown',
          author_email: proposalData.author_email || proposalData.email || 'unknown@email.com',
          author_phone: proposalData.author_phone || proposalData.phone,
          description: proposalData.description || proposalData.short_description,
          status: proposalData.status || 'submitted',
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Insert error:', insertError);
        return new Response(JSON.stringify({ error: insertError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ id: newProposal.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'updateStatus') {
      // Update proposal status - always use ticketNumber to look up the proposal
      const lookupTicket = ticketNumber || proposalData?.ticket_number;
      
      if (!lookupTicket) {
        return new Response(JSON.stringify({ error: 'Missing ticket number' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      let proposalId: string | null = null;

      // Always look up by ticket number first (never trust proposalData.id as it may be the ticket number string)
      const { data: existing } = await supabase
        .from('proposals')
        .select('id')
        .eq('ticket_number', lookupTicket)
        .maybeSingle();

      if (existing) {
        proposalId = existing.id;
      } else if (proposalData) {
        // Create new record first
        const { data: newProposal, error: insertError } = await supabase
          .from('proposals')
          .insert({
            ticket_number: lookupTicket,
            name: proposalData.name || proposalData.title || 'Untitled',
            author_name: proposalData.author_name || proposalData.author || 'Unknown',
            author_email: proposalData.author_email || proposalData.email || 'unknown@email.com',
            status: previousStatus || 'submitted',
          })
          .select('id')
          .single();

        if (insertError) {
          console.error('Insert error:', insertError);
          return new Response(JSON.stringify({ error: insertError.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        proposalId = newProposal.id;
      }

      if (!proposalId) {
        return new Response(JSON.stringify({ error: 'Could not find or create proposal' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Update the status
      const updateData: Record<string, unknown> = { status };
      if (status === 'locked') {
        updateData.finalised_at = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from('proposals')
        .update(updateData)
        .eq('id', proposalId);

      if (updateError) {
        console.error('Update error:', updateError);
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Log the workflow action
      await supabase.from('workflow_logs').insert({
        proposal_id: proposalId,
        action: `Status changed from ${previousStatus} to ${status}`,
        previous_status: previousStatus,
        new_status: status,
      });

      return new Response(JSON.stringify({ success: true, id: proposalId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});