import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { useToast } from '@/shared/hooks/use-toast';
import { StickyNote, Plus, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { apiRequest } from '@/shared/lib/queryClient';

interface AdminNote {
  id: string;
  content: string;
  adminId: string;
  adminName: string;
  createdAt: string;
}

interface UserAdminNotesProps {
  userId: string;
}

export function UserAdminNotes({ userId }: UserAdminNotesProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newNote, setNewNote] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const { data: notes, isLoading } = useQuery<AdminNote[]>({
    queryKey: ['/api/admin/users', userId, 'notes'],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/users/${userId}/notes`);
      return res.json();
    }
  });

  const addNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest('POST', `/api/admin/users/${userId}/notes`, { content });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users', userId, 'notes'] });
      setNewNote('');
      setIsAdding(false);
      toast({
        title: 'Note Added',
        description: 'Admin note has been saved.'
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to add note. Please try again.',
        variant: 'destructive'
      });
    }
  });

  const handleSubmit = () => {
    if (!newNote.trim()) return;
    addNoteMutation.mutate(newNote.trim());
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="user-admin-notes">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <StickyNote className="h-5 w-5" />
              Admin Notes
            </CardTitle>
            <CardDescription>
              Internal notes (not visible to user)
            </CardDescription>
          </div>
          {!isAdding && (
            <Button variant="outline" size="sm" onClick={() => setIsAdding(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Note
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Add New Note Form */}
        {isAdding && (
          <div className="mb-4 p-3 border rounded-lg bg-muted/30">
            <Textarea
              placeholder="Add a note about this user..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="mb-2"
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setIsAdding(false); setNewNote(''); }}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!newNote.trim() || addNoteMutation.isPending}
              >
                {addNoteMutation.isPending ? 'Saving...' : 'Save Note'}
              </Button>
            </div>
          </div>
        )}

        {/* Notes List */}
        <div className="space-y-3">
          {(!notes || notes.length === 0) && !isAdding ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No admin notes yet
            </p>
          ) : (
            notes?.map((note) => (
              <div key={note.id} className="p-3 border rounded-lg">
                <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>{note.adminName}</span>
                  <span>•</span>
                  <span>{formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
