export interface KnipIssue {
  file: string;
  dependencies: Array<{ name: string; line: number; col: number; pos: number }>;
  devDependencies: Array<{
    name: string;
    line: number;
    col: number;
    pos: number;
    file: string;
  }>;
  optionalPeerDependencies: Array<{
    name: string;
    line: number;
    col: number;
    pos: number;
  }>;
  unlisted: Array<{ name: string; line?: number; col?: number; pos?: number }>;
  binaries: string[];
  unresolved: string[];
  exports: string[];
  types: string[];
  enumMembers: any;
  duplicates: string[];
}

export interface KnipResult {
  files: string[];
  issues: KnipIssue[];
}

export interface WebviewMessage {
  type: string;
  [key: string]: any;
}
