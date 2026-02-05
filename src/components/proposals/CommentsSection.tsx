 import React, { useState } from 'react';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Textarea } from '@/components/ui/textarea';
 import { Avatar, AvatarFallback } from '@/components/ui/avatar';
 import { MessageSquare, Send, Loader2 } from 'lucide-react';
 import { useComments } from '@/hooks/useComments';
 import { formatDistanceToNow } from 'date-fns';
 
 interface CommentsSectionProps {
   ticketNumber: string;
 }
 
 const CommentsSection: React.FC<CommentsSectionProps> = ({ ticketNumber }) => {
   const [newComment, setNewComment] = useState('');
   const { comments, isLoading, addComment, isAddingComment } = useComments(ticketNumber);
 
   const handleSubmit = (e: React.FormEvent) => {
     e.preventDefault();
     if (newComment.trim()) {
       addComment({ comment: newComment.trim() });
       setNewComment('');
     }
   };
 
   const getInitials = (name: string) => {
     return name
       .split(' ')
       .map(n => n[0])
       .join('')
       .toUpperCase()
       .slice(0, 2);
   };
 
   return (
     <Card>
       <CardHeader>
         <CardTitle className="text-lg flex items-center gap-2">
           <MessageSquare className="h-5 w-5" />
           Comments
           {comments.length > 0 && (
             <span className="text-sm font-normal text-muted-foreground">
               ({comments.length})
             </span>
           )}
         </CardTitle>
       </CardHeader>
       <CardContent className="space-y-4">
         {/* Add Comment Form */}
         <form onSubmit={handleSubmit} className="space-y-3">
           <Textarea
             placeholder="Add a comment..."
             value={newComment}
             onChange={(e) => setNewComment(e.target.value)}
             rows={3}
             className="resize-none"
           />
           <Button 
             type="submit" 
             disabled={!newComment.trim() || isAddingComment}
             size="sm"
           >
             {isAddingComment ? (
               <Loader2 className="h-4 w-4 mr-2 animate-spin" />
             ) : (
               <Send className="h-4 w-4 mr-2" />
             )}
             Add Comment
           </Button>
         </form>
 
         {/* Comments List */}
         {isLoading ? (
           <div className="flex items-center justify-center py-8">
             <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
           </div>
         ) : comments.length === 0 ? (
           <p className="text-sm text-muted-foreground text-center py-4">
             No comments yet. Be the first to add one!
           </p>
         ) : (
           <div className="space-y-4">
             {comments.map((comment) => (
               <div key={comment.id} className="flex gap-3">
                 <Avatar className="h-8 w-8">
                   <AvatarFallback className="text-xs">
                     {getInitials(comment.author || 'U')}
                   </AvatarFallback>
                 </Avatar>
                 <div className="flex-1 space-y-1">
                   <div className="flex items-center gap-2">
                     <span className="text-sm font-medium">{comment.author}</span>
                     {comment.role && (
                       <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                         {comment.role}
                       </span>
                     )}
                     <span className="text-xs text-muted-foreground">
                       {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                     </span>
                   </div>
                   <p className="text-sm text-foreground whitespace-pre-wrap">
                     {comment.comment}
                   </p>
                 </div>
               </div>
             ))}
           </div>
         )}
       </CardContent>
     </Card>
   );
 };
 
 export default CommentsSection;