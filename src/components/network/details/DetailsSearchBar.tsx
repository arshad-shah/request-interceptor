/**
 * In-panel search bar (opened with Cmd/Ctrl+F)
 */

import type { RefObject } from 'react';
import { Search } from 'lucide-react';
import Input from '@/components/ui/Input';

interface DetailsSearchBarProps {
  searchInputRef: RefObject<HTMLInputElement>;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onClose: () => void;
}

export function DetailsSearchBar({
  searchInputRef,
  searchTerm,
  setSearchTerm,
  onClose,
}: DetailsSearchBarProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)]">
      <div className="flex-1 min-w-0">
        <Input
          ref={searchInputRef}
          size="sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search headers, body, cookies..."
          leftIcon={<Search />}
          clearable
          onClear={() => setSearchTerm('')}
          autoFocus
        />
      </div>
      <button
        onClick={onClose}
        className="text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
      >
        Close
      </button>
    </div>
  );
}
