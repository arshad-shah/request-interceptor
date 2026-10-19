import type { RefObject } from 'react';
import {
  Braces,
  Brackets,
  Check,
  CircleOff,
  Copy,
  FileJson,
  Hash,
  Link2,
  Search,
  ToggleRight,
  Type,
} from 'lucide-react';
import Input from '@/components/ui/Input';
import type { CopiedTarget } from './types';

interface JsonTreeToolbarProps {
  sizeLabel: string;
  countLabel: string;
  showParsedIndicator: boolean;
  searchable: boolean;
  searchInputRef: RefObject<HTMLInputElement>;
  searchTerm: string;
  matchCount: number;
  currentMatchIdx: number;
  copied: CopiedTarget;
  onSearch: (query: string) => void;
  onNextMatch: () => void;
  onCopyAll: () => void;
}

/** Header with size/count metadata, the search box and the copy-all action. */
export function JsonTreeToolbar({
  sizeLabel,
  countLabel,
  showParsedIndicator,
  searchable,
  searchInputRef,
  searchTerm,
  matchCount,
  currentMatchIdx,
  copied,
  onSearch,
  onNextMatch,
  onCopyAll,
}: JsonTreeToolbarProps) {
  return (
    <div className="jt-toolbar">
      <div className="jt-toolbar-left">
        <div className="jt-brand">
          <FileJson size={14} className="text-amber-500" />
          <span>JSON</span>
        </div>
        <div className="jt-meta">
          <span>{sizeLabel}</span>
          <span className="jt-separator">•</span>
          <span>{countLabel}</span>
          {showParsedIndicator && (
            <>
              <span className="jt-separator">•</span>
              <span className="jt-parsed-indicator" title="Embedded JSON strings have been parsed">
                <Link2 size={10} className="inline" />
                <span>Parsed</span>
              </span>
            </>
          )}
        </div>
      </div>

      <div className="jt-toolbar-center">
        {searchable && (
          <div className="flex-1 max-w-[220px] min-w-[140px]">
            <Input
              ref={searchInputRef}
              size="sm"
              value={searchTerm}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search... (Ctrl+F)"
              leftIcon={<Search />}
              clearable
              onClear={() => onSearch('')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onNextMatch();
                }
              }}
              rightIcon={
                searchTerm ? (
                  <span className="jt-search-count">
                    {matchCount > 0 ? `${currentMatchIdx + 1}/${matchCount}` : '0'}
                  </span>
                ) : undefined
              }
            />
          </div>
        )}
      </div>

      <div className="jt-toolbar-right">
        <button
          onClick={onCopyAll}
          className="jt-toolbar-btn"
          title="Copy JSON"
        >
          {copied === 'all' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  );
}

/** Type legend shown under long, non-compact trees. */
export function JsonTreeLegend() {
  return (
    <div className="jt-legend">
      <span className="jt-legend-item">
        <Braces size={10} className="text-slate-400" /> Object
      </span>
      <span className="jt-legend-item">
        <Brackets size={10} className="text-slate-400" /> Array
      </span>
      <span className="jt-legend-item">
        <Type size={10} className="text-emerald-400" /> String
      </span>
      <span className="jt-legend-item">
        <Hash size={10} className="text-amber-400" /> Number
      </span>
      <span className="jt-legend-item">
        <ToggleRight size={10} className="text-violet-400" /> Boolean
      </span>
      <span className="jt-legend-item">
        <CircleOff size={10} className="text-gray-400" /> Null
      </span>
    </div>
  );
}
