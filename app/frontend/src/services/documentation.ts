import { api } from './api';
import { 
  Documentation, 
  DocumentationItem,
  FileDocumentationResponse,
  DocumentationFileDetail,
  DocumentationSummary,
  GenerateDocumentationJobResponse,
  JobProgress
} from '@/types/documentation';

export const documentationApi = {
  // Legacy endpoints (single-page documentation)
  async getAll(): Promise<DocumentationItem[]> {
    const response = await api.get<DocumentationItem[]>('/api/v1/documentation');
    return response.data;
  },

  async getByRepository(repositoryId: string): Promise<Documentation> {
    const response = await api.get<Documentation>(`/api/v1/documentation/${repositoryId}`);
    return response.data;
  },

  async generate(repositoryId: string): Promise<GenerateDocumentationJobResponse> {
    const response = await api.post<GenerateDocumentationJobResponse>(
      `/api/v1/documentation/generate/${repositoryId}`
    );
    return response.data;
  },

  // New file-based documentation endpoints
  async generateFiles(repositoryId: string): Promise<GenerateDocumentationJobResponse> {
    const response = await api.post<GenerateDocumentationJobResponse>(
      `/api/v1/documentation/generate-files/${repositoryId}`
    );
    return response.data;
  },

  // Progress tracking endpoint
  async getJobProgress(jobId: string): Promise<JobProgress> {
    const response = await api.get<JobProgress>(`/api/v1/documentation/progress/${jobId}`);
    return response.data;
  },

  // Helper function to poll for job completion
  async pollJobProgress(
    jobId: string, 
    onProgress?: (progress: JobProgress) => void,
    pollInterval: number = 2000
  ): Promise<JobProgress> {
    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const progress = await this.getJobProgress(jobId);
          
          if (onProgress) {
            onProgress(progress);
          }

          if (progress.status === 'completed') {
            resolve(progress);
          } else if (progress.status === 'failed') {
            reject(new Error(progress.error || 'Job failed'));
          } else {
            setTimeout(poll, pollInterval);
          }
        } catch (error) {
          reject(error);
        }
      };

      poll();
    });
  },

  async getFiles(repositoryId: string): Promise<FileDocumentationResponse> {
    const response = await api.get<FileDocumentationResponse>(
      `/api/v1/documentation/${repositoryId}/files`
    );
    return response.data;
  },

  async getFileByPath(repositoryId: string, filePath: string): Promise<DocumentationFileDetail> {
    const response = await api.get<DocumentationFileDetail>(
      `/api/v1/documentation/${repositoryId}/files/${encodeURIComponent(filePath)}`
    );
    return response.data;
  },

  async getSummary(repositoryId: string): Promise<DocumentationSummary> {
    const response = await api.get<DocumentationSummary>(
      `/api/v1/documentation/${repositoryId}/summary`
    );
    return response.data;
  },
};

// Helper function to build file tree from flat file list
export function buildFileTree(files: string[]): any {
  const root: any = { name: 'root', children: {} };
  
  files.forEach(filePath => {
    const parts = filePath.split('/');
    let current = root;
    
    parts.forEach((part, index) => {
      if (!current.children[part]) {
        current.children[part] = {
          name: part,
          path: parts.slice(0, index + 1).join('/'),
          type: index === parts.length - 1 ? 'file' : 'folder',
          children: {}
        };
      }
      current = current.children[part];
    });
  });
  
  // Convert children objects to arrays
  function convertToArray(node: any): any {
    if (node.type === 'file') {
      delete node.children;
      return node;
    }
    
    node.children = Object.values(node.children).map(convertToArray);
    return node;
  }
  
  return Object.values(root.children).map(convertToArray);
}