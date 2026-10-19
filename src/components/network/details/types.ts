/**
 * Shared prop types for the request details tabs
 */

/** Collapsed-section state owned by the details container so it survives tab switches. */
export interface SectionStateProps {
  collapsedSections: Set<string>;
  toggleSection: (section: string) => void;
}

export interface InsightCounts {
  total: number;
  errors: number;
  warnings: number;
}

export type ShowToast = (message: string) => void;

export type CopyHandler = (text: string, label: string) => void;
