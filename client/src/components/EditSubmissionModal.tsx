import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface EditSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; description: string; tags: string[] }) => void;
  submission: {
    id: string;
    title: string;
    description?: string;
    tags?: string[];
  };
}

export function EditSubmissionModal({ isOpen, onClose, onSubmit, submission }: EditSubmissionModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  useEffect(() => {
    if (submission && isOpen) {
      setTitle(submission.title || '');
      setDescription(submission.description || '');
      setTagsInput(submission.tags?.join(', ') || '');
    }
  }, [submission, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Parse tags from comma-separated input
    const tags = tagsInput
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    onSubmit({ title, description, tags });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div 
        className="bg-background rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        data-testid="edit-submission-modal"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Edit Submission</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            data-testid="close-modal-button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter submission title"
              required
              data-testid="input-title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your submission..."
              rows={4}
              data-testid="input-description"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Enter tags separated by commas (e.g., digital art, abstract, colorful)"
              data-testid="input-tags"
            />
            <p className="text-sm text-muted-foreground">Separate tags with commas</p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="gradient-glory hover:opacity-90 transition-opacity"
              data-testid="button-save"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
