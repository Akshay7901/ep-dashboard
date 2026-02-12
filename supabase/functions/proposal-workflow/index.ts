import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { action, proposalData, status, previousStatus, ticketNumber } = body;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === 'ensureProposal') {
      if (!proposalData || !proposalData.ticket_number) {
        return new Response(JSON.stringify({ error: 'Missing proposal data' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

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
      const lookupTicket = ticketNumber || proposalData?.ticket_number;
      
      if (!lookupTicket) {
        return new Response(JSON.stringify({ error: 'Missing ticket number' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      let proposalId: string | null = null;

      const { data: existing } = await supabase
        .from('proposals')
        .select('id')
        .eq('ticket_number', lookupTicket)
        .maybeSingle();

      if (existing) {
        proposalId = existing.id;
      } else if (proposalData) {
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

    if (action === 'saveComment') {
      const { proposalId, commentText, reviewFormData, duplicateOf, reviewerEmail, ticketNumber: commentTicket } = body;
      
      if (!proposalId) {
        return new Response(JSON.stringify({ error: 'Missing proposalId' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Resolve proposal: if not UUID, look up by ticket number and ensure local record
      let localProposalId = proposalId;
      let resolvedTicket = commentTicket || '';
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      if (!uuidRegex.test(proposalId)) {
        resolvedTicket = resolvedTicket || proposalId;
        const { data: existing } = await supabase
          .from('proposals')
          .select('id, ticket_number')
          .eq('ticket_number', proposalId)
          .maybeSingle();

        if (existing) {
          localProposalId = existing.id;
          resolvedTicket = existing.ticket_number || resolvedTicket;
        } else {
          const { data: newProposal, error: insertError } = await supabase
            .from('proposals')
            .insert({
              ticket_number: proposalId,
              name: 'Untitled',
              author_name: 'Unknown',
              author_email: 'unknown@email.com',
              status: 'submitted',
            })
            .select('id')
            .single();

          if (insertError) {
            return new Response(JSON.stringify({ error: insertError.message }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          localProposalId = newProposal.id;
        }
      } else {
        // UUID provided - look up ticket_number
        if (!resolvedTicket) {
          const { data: existing } = await supabase
            .from('proposals')
            .select('ticket_number')
            .eq('id', proposalId)
            .maybeSingle();
          resolvedTicket = existing?.ticket_number || '';
        }
      }

      // Generate a deterministic UUID from email for reviewer_id
      const reviewerId = await emailToUuid(reviewerEmail || 'unknown');

      // Upsert: check if a comment from this reviewer already exists for this proposal
      const { data: existingComment } = await supabase
        .from('reviewer_comments')
        .select('id')
        .eq('proposal_id', localProposalId)
        .eq('reviewer_id', reviewerId)
        .maybeSingle();

      if (existingComment) {
        const { error: updateError } = await supabase
          .from('reviewer_comments')
          .update({
            comment_text: commentText || '',
            review_form_data: reviewFormData || {},
            is_duplicate_of: duplicateOf || null,
            submitted_for_authorization: reviewFormData?.submittedForAuthorization || false,
          })
          .eq('id', existingComment.id);

        if (updateError) {
          return new Response(JSON.stringify({ error: updateError.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } else {
        const { error: insertError } = await supabase
          .from('reviewer_comments')
          .insert({
            proposal_id: localProposalId,
            reviewer_id: reviewerId,
            comment_text: commentText || '',
            review_form_data: reviewFormData || {},
            is_duplicate_of: duplicateOf || null,
            submitted_for_authorization: reviewFormData?.submittedForAuthorization || false,
          });

        if (insertError) {
          return new Response(JSON.stringify({ error: insertError.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // Also POST to external API if we have a ticket number and auth token
      if (resolvedTicket && authHeader) {
        try {
          const API_BASE_URL = 'https://api.ethicspress.com';
          const externalBody = JSON.stringify({
            comment: commentText || '',
            review_form_data: reviewFormData || {},
            reviewer_email: reviewerEmail || '',
          });
          const extRes = await fetch(
            `${API_BASE_URL}/api/proposals/${encodeURIComponent(resolvedTicket)}/comments`,
            {
              method: 'POST',
              headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              },
              body: externalBody,
            }
          );
          if (!extRes.ok) {
            console.error('External comment POST failed:', extRes.status, await extRes.text().catch(() => ''));
          } else {
            console.log('Comment synced to external API');
          }
        } catch (extErr) {
          console.error('Failed to sync comment to external API:', extErr);
        }
      }

      return new Response(JSON.stringify({ success: true, localProposalId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'getComments') {
      const { proposalId: pid, ticketNumber: commentsTicket } = body;
      if (!pid) {
        return new Response(JSON.stringify({ error: 'Missing proposalId' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      let localPid = pid;
      let resolvedTicket = commentsTicket || '';

      if (!uuidRegex.test(pid)) {
        resolvedTicket = resolvedTicket || pid;
        const { data: existing } = await supabase
          .from('proposals')
          .select('id, ticket_number')
          .eq('ticket_number', pid)
          .maybeSingle();
        if (!existing) {
          return new Response(JSON.stringify({ comments: [] }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        localPid = existing.id;
        resolvedTicket = existing.ticket_number || resolvedTicket;
      } else {
        if (!resolvedTicket) {
          const { data: existing } = await supabase
            .from('proposals')
            .select('ticket_number')
            .eq('id', pid)
            .maybeSingle();
          resolvedTicket = existing?.ticket_number || '';
        }
      }

      // Fetch local comments
      const { data: commentsData, error: commentsError } = await supabase
        .from('reviewer_comments')
        .select('*')
        .eq('proposal_id', localPid)
        .order('created_at', { ascending: false });

      if (commentsError) {
        return new Response(JSON.stringify({ error: commentsError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Also fetch external API comments if we have ticket and auth
      let externalComments: any[] = [];
      if (resolvedTicket && authHeader) {
        try {
          const API_BASE_URL = 'https://api.ethicspress.com';
          const extRes = await fetch(
            `${API_BASE_URL}/api/proposals/${encodeURIComponent(resolvedTicket)}/comments`,
            {
              method: 'GET',
              headers: {
                'Authorization': authHeader,
                'Accept': 'application/json',
              },
            }
          );
          if (extRes.ok) {
            const extData = await extRes.json();
            externalComments = Array.isArray(extData) ? extData : (extData?.comments || []);
          }
        } catch (extErr) {
          console.error('Failed to fetch external comments:', extErr);
        }
      }

      return new Response(JSON.stringify({ 
        comments: commentsData || [], 
        externalComments 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'saveAssignment') {
      const { ticketNumber: assignTicket, reviewerEmails } = body;
      if (!assignTicket || !Array.isArray(reviewerEmails)) {
        return new Response(JSON.stringify({ error: 'Missing ticketNumber or reviewerEmails' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Ensure local proposal record exists
      const { data: existing } = await supabase
        .from('proposals')
        .select('id')
        .eq('ticket_number', assignTicket)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('proposals')
          .update({ assigned_reviewer_emails: reviewerEmails })
          .eq('id', existing.id);
      } else {
        // Create a minimal local record so assignment persists
        await supabase
          .from('proposals')
          .insert({
            ticket_number: assignTicket,
            assigned_reviewer_emails: reviewerEmails,
            name: assignTicket,
            author_name: 'Unknown',
            author_email: 'unknown@unknown.com',
            status: 'under_review',
          });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'getLocalProposalById') {
      const { proposalId } = body;
      if (!proposalId) {
        return new Response(JSON.stringify({ error: 'Missing proposalId' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data } = await supabase
        .from('proposals')
        .select('*')
        .eq('id', proposalId)
        .maybeSingle();

      return new Response(JSON.stringify({ proposal: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'getLocalProposal') {
      const { ticketNumber: lookupTicket } = body;
      if (!lookupTicket) {
        return new Response(JSON.stringify({ error: 'Missing ticketNumber' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data } = await supabase
        .from('proposals')
        .select('*')
        .eq('ticket_number', lookupTicket)
        .maybeSingle();

      return new Response(JSON.stringify({ proposal: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'getLocalProposals') {
      const { ticketNumbers } = body;
      if (!Array.isArray(ticketNumbers) || ticketNumbers.length === 0) {
        return new Response(JSON.stringify({ proposals: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data } = await supabase
        .from('proposals')
        .select('*')
        .in('ticket_number', ticketNumbers);

      return new Response(JSON.stringify({ proposals: data || [] }), {
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

// Convert email to a deterministic UUID-format string
async function emailToUuid(email: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(email.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  const hex = Array.from(hashArray.slice(0, 16))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  // Format as UUID v4-like
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${(parseInt(hex[16], 16) & 0x3 | 0x8).toString(16)}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
