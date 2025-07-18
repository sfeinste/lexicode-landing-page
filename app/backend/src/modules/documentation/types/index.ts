export interface DocumentationFile {
  id: string;
  repository_id: string;
  generation_id?: string;
  file_path: string;
  file_type?: string;
  language?: string;
  lines_of_code?: number;
  generated_documentation?: string;
  metadata?: any;
  created_at: Date;
  updated_at: Date;
}

export interface DocumentationSummary {
  id: string;
  repository_id: string;
  generation_id?: string;
  content: string;
  metadata?: any;
  created_at: Date;
  updated_at: Date;
}

export interface DocumentationGeneration {
  id: string;
  repository_id: string;
  user_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  trigger_type: 'manual' | 'webhook' | 'scheduled';
  input_data?: any;
  output_data?: any;
  error_data?: any;
  files_processed: number;
  files_failed: number;
  processing_time_seconds?: number;
  started_at?: Date;
  completed_at?: Date;
  created_at: Date;
}

export interface FileDocumentationResult {
  file_path: string;
  documentation: string;
  metadata: {
    file_type?: string;
    language?: string;
    lines_of_code?: number;
    complexity?: number;
    imports?: string[];
    exports?: string[];
  };
}

export interface RepositoryDocumentationResult {
  repository_id: string;
  generation_id: string;
  summary: string;
  files: FileDocumentationResult[];
  metadata: {
    total_files: number;
    languages: { [key: string]: number };
    total_lines: number;
    documentation_coverage: number;
  };
}