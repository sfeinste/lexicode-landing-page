// Existing types for backward compatibility
export interface Documentation {
  id: string;
  repository_id: string;
  content: string;
  generation_id: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentationItem extends Documentation {
  repository?: {
    id: string;
    repo_full_name: string;
    repo_name: string;
    repo_owner: string;
    language: string;
    default_branch: string;
  };
}

// New types for file-based documentation
export interface DocumentationFile {
  file_path: string;
  file_type?: string;
  language?: string;
  lines_of_code?: number;
  has_documentation: boolean;
}

export interface DocumentationFileDetail {
  file_path: string;
  file_type?: string;
  language?: string;
  lines_of_code?: number;
  documentation: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface DocumentationSummary {
  repository_id: string;
  content: string;
  metadata: {
    total_files: number;
    languages: { [key: string]: number };
    total_lines: number;
    documentation_coverage: number;
  };
  created_at: string;
  updated_at: string;
}

export interface FileDocumentationResponse {
  repository_id: string;
  files: DocumentationFile[];
  total_files: number;
}

export interface GenerateFileDocumentationResponse {
  message: string;
  result: {
    repository_id: string;
    generation_id: string;
    files_documented: number;
    metadata: {
      total_files: number;
      languages: { [key: string]: number };
      total_lines: number;
      documentation_coverage: number;
    };
  };
}

// File tree types for UI
export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileTreeNode[];
  language?: string;
  hasDocumentation?: boolean;
}

// Async job types
export interface GenerateDocumentationJobResponse {
  message: string;
  jobId: string;
  status: 'pending';
}

export interface JobProgress {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  currentFile?: number;
  totalFiles?: number;
  error?: string;
  completedAt?: Date;
}