import React from 'react';
import { X, Check } from 'lucide-react';
import Button from '@/components/ui/Button';

interface FormFooterProps {
  isEditing: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}

const FormFooter: React.FC<FormFooterProps> = ({
  isEditing,
  isSubmitting,
  onCancel,
  onSubmit,
}) => (
  <div className="flex items-center justify-end gap-2 px-4 py-3 bg-[var(--bg-surface)] border-t border-[var(--border-subtle)]">
    <Button
      variant="default"
      onClick={onCancel}
      leftIcon={<X size={14} />}
      aria-label="Cancel"
    >
      Cancel
    </Button>
    <Button
      variant="primary"
      onClick={onSubmit}
      disabled={isSubmitting}
      leftIcon={isEditing ? <Check size={14} /> : undefined}
      aria-label={isEditing ? 'Save changes' : 'Add interception'}
    >
      {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Interception'}
    </Button>
  </div>
);

export default FormFooter;
