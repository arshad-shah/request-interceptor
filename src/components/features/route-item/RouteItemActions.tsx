import React from 'react';
import { Edit, Trash2 } from 'lucide-react';
import Button from '@/components/ui/Button';

interface RouteItemActionsProps {
  onEdit: () => void;
  onDelete: () => void;
}

const RouteItemActions: React.FC<RouteItemActionsProps> = ({ onEdit, onDelete }) => (
  <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
    <Button
      variant="default"
      size="sm"
      leftIcon={<Edit size={14} />}
      onClick={onEdit}
      aria-label="Edit route"
    >
      Edit
    </Button>
    <Button
      variant="danger"
      size="sm"
      leftIcon={<Trash2 size={14} />}
      onClick={onDelete}
      aria-label="Delete route"
    >
      Delete
    </Button>
  </div>
);

export default RouteItemActions;
