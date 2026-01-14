import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import Button from './Button';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

interface DialogHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface DialogBodyProps {
  children: React.ReactNode;
  className?: string;
}

interface DialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
}

const Dialog: React.FC<DialogProps> & {
  Header: React.FC<DialogHeaderProps>;
  Body: React.FC<DialogBodyProps>;
  Footer: React.FC<DialogFooterProps>;
} = ({ isOpen, onClose, children, className }) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="ds-modal-backdrop" onClick={onClose}>
      <div
        className={cn('ds-modal', className)}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

const DialogHeader: React.FC<DialogHeaderProps> = ({ children, className }) => (
  <div className={cn('ds-modal-header', className)}>
    {children}
  </div>
);

const DialogBody: React.FC<DialogBodyProps> = ({ children, className }) => (
  <div className={cn('ds-modal-body', className)}>
    {children}
  </div>
);

const DialogFooter: React.FC<DialogFooterProps> = ({ children, className }) => (
  <div className={cn('ds-modal-footer', className)}>
    {children}
  </div>
);

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary'
}) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <Dialog.Header>
        <h3 className="ds-modal-title">{title}</h3>
        <button onClick={onClose} className="ds-icon-btn">
          <X size={18} />
        </button>
      </Dialog.Header>

      <Dialog.Body>
        <p className="ds-body">{message}</p>
      </Dialog.Body>

      <Dialog.Footer>
        <Button variant="default" onClick={onClose}>
          {cancelText}
        </Button>
        <Button
          variant={variant === 'danger' ? 'danger' : 'primary'}
          onClick={handleConfirm}
        >
          {confirmText}
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
};

Dialog.Header = DialogHeader;
Dialog.Body = DialogBody;
Dialog.Footer = DialogFooter;

export default Dialog;
export { ConfirmDialog };
