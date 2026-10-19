/**
 * Icon button that copies text and briefly shows a check mark
 */

import { useState } from 'react';
import { clsx } from 'clsx';
import { Copy, Check } from 'lucide-react';
import { copyToClipboard } from '../../../lib/network-api';

interface CopyButtonProps {
  text: string;
  size?: number;
  className?: string;
  title?: string;
}

export function CopyButton({ text, size = 12, className, title = 'Copy' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <button
      className={clsx('ds-icon-btn', className)}
      onClick={handleCopy}
      title={title}
    >
      {copied ? (
        <Check size={size} className="text-emerald-500" />
      ) : (
        <Copy size={size} />
      )}
    </button>
  );
}
