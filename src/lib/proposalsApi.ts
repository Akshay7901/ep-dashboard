 import { supabase } from '@/integrations/supabase/client';
 
 // Types for API responses
 export interface PeerReviewer {
   id: string;
   email: string;
   name: string;
   created_at?: string;
 }
 
 export interface ProposalComment {
   id: string;
   ticket_number: string;
   comment: string;
   author: string;
   author_email: string;
   created_at: string;
   role?: string;
 }
 
 export interface StatusUpdate {
   status: string;
   notes?: string;
 }
 
 export interface AssignmentRequest {
   reviewer_ids: string[];
 }
 
 // Get auth token from localStorage
 const getAuthToken = (): string | null => {
   return localStorage.getItem('auth_token');
 };
 
 // Helper to build headers
 const buildHeaders = () => {
   const token = getAuthToken();
   return {
     'Authorization': token ? `Bearer ${token}` : '',
   };
 };
 
 // Peer Reviewers API
 export const peerReviewersApi = {
   list: async (): Promise<PeerReviewer[]> => {
     const { data, error } = await supabase.functions.invoke('proposals-proxy/peer-reviewers', {
       method: 'GET',
       headers: buildHeaders(),
     });
     
     if (error) throw error;
   // Handle various response structures from the API
   if (Array.isArray(data)) return data;
   if (data?.reviewers && Array.isArray(data.reviewers)) return data.reviewers;
   if (data?.data && Array.isArray(data.data)) return data.data;
   return [];
   },
 
   create: async (reviewer: { email: string; name: string }): Promise<PeerReviewer> => {
     const { data, error } = await supabase.functions.invoke('proposals-proxy/peer-reviewers', {
       method: 'POST',
       headers: buildHeaders(),
       body: reviewer,
     });
     
     if (error) throw error;
     return data;
   },
 
   delete: async (reviewerId: string): Promise<void> => {
     const { error } = await supabase.functions.invoke(`proposals-proxy/peer-reviewers/${reviewerId}`, {
       method: 'DELETE',
       headers: buildHeaders(),
     });
     
     if (error) throw error;
   },
 };
 
 // Comments API
 export const commentsApi = {
   list: async (ticketNumber: string): Promise<ProposalComment[]> => {
     const { data, error } = await supabase.functions.invoke(`proposals-proxy/comments/${ticketNumber}`, {
       method: 'GET',
       headers: buildHeaders(),
     });
     
     if (error) throw error;
     return data?.comments || data || [];
   },
 
   add: async (ticketNumber: string, comment: { comment: string }): Promise<ProposalComment> => {
     const { data, error } = await supabase.functions.invoke(`proposals-proxy/comments/${ticketNumber}`, {
       method: 'POST',
       headers: buildHeaders(),
       body: comment,
     });
     
     if (error) throw error;
     return data;
   },
 };
 
 // Status API
 export const statusApi = {
   update: async (ticketNumber: string, statusUpdate: StatusUpdate): Promise<void> => {
     const { error } = await supabase.functions.invoke(`proposals-proxy/status/${ticketNumber}`, {
       method: 'PATCH',
       headers: buildHeaders(),
       body: statusUpdate,
     });
     
     if (error) throw error;
   },
 };
 
 // Assignments API
 export const assignmentsApi = {
   assign: async (ticketNumber: string, assignment: AssignmentRequest): Promise<void> => {
     const { error } = await supabase.functions.invoke(`proposals-proxy/assign/${ticketNumber}`, {
       method: 'POST',
       headers: buildHeaders(),
       body: assignment,
     });
     
     if (error) throw error;
   },
 };
 
 // Revisions API
 export const revisionsApi = {
   create: async (ticketNumber: string, revisionData: Record<string, unknown>): Promise<void> => {
     const { error } = await supabase.functions.invoke(`proposals-proxy/revise/${ticketNumber}`, {
       method: 'POST',
       headers: buildHeaders(),
       body: revisionData,
     });
     
     if (error) throw error;
   },
 };
 
 // Delete Proposal API
 export const proposalApi = {
   delete: async (ticketNumber: string): Promise<void> => {
     const { error } = await supabase.functions.invoke(`proposals-proxy/proposal/${ticketNumber}`, {
       method: 'DELETE',
       headers: buildHeaders(),
     });
     
     if (error) throw error;
   },
 };