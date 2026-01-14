import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  React.useEffect(() => {
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

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.3 }}
            className={cn(
              "relative bg-ds-bg-elevated rounded-ds-lg shadow-ds-lg",
              "w-full max-w-md max-h-[90vh] overflow-hidden",
              "border border-ds-border-subtle",
              className
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const DialogHeader: React.FC<DialogHeaderProps> = ({ children, className }) => (
  <div className={cn(
    "flex items-center justify-between p-6 border-b border-ds-border-subtle",
    className
  )}>
    {children}
  </div>
);

const DialogBody: React.FC<DialogBodyProps> = ({ children, className }) => (
  <div className={cn("p-6", className)}>
    {children}
  </div>
);

const DialogFooter: React.FC<DialogFooterProps> = ({ children, className }) => (
  <div className={cn(
    "flex items-center justify-end gap-3 p-6 border-t border-ds-border-subtle bg-ds-bg-surface/50",
    className
  )}>
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
        <h3 className="text-lg font-semibold text-ds-text-primary">{title}</h3>
        <Button variant="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </Dialog.Header>

      <Dialog.Body>
        <p className="text-ds-text-secondary leading-relaxed text-lg">{message}</p>
      </Dialog.Body>

      <Dialog.Footer>
        <Button variant="secondary" onClick={onClose}>
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
