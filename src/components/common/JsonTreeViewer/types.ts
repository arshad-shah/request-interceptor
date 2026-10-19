export type PathSegment = string | number;

export type TreeNodeType = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';

export interface TreeNode {
  id: number;
  key: PathSegment | null;
  path: PathSegment[];
  depth: number;
  type: TreeNodeType;
  isContainer: boolean;
  length: number;
  value: unknown;
  parentId: number | null;
  childIds: number[];
  /** For string nodes that contain valid JSON */
  hasEmbeddedJson?: boolean;
  /** The parsed embedded JSON data */
  embeddedJsonData?: unknown;
}

export type NodeMap = Map<number, TreeNode>;

export interface JsonTreeViewerProps {
  data: unknown;
  className?: string;
  maxHeight?: number | string;
  initialExpandDepth?: number;
  showToolbar?: boolean;
  showLineNumbers?: boolean;
  searchable?: boolean;
  onCopyPath?: (path: string) => void;
  compact?: boolean;
  /** Automatically parse embedded JSON strings */
  parseEmbeddedJson?: boolean;
}

/** Which copy target last succeeded: a key path, a node value, or the whole document */
export type CopiedTarget = string | null;
