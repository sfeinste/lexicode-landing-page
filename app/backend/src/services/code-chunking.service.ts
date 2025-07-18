import { GitHubFile } from './github-file-reader.service';
import { logger } from '@/shared/logger';

export interface CodeChunk {
  id: string;
  files: GitHubFile[];
  tokenEstimate: number;
  metadata: {
    startIndex: number;
    endIndex: number;
    totalFiles: number;
  };
}

export interface ChunkingOptions {
  maxTokensPerChunk?: number;
  maxFilesPerChunk?: number;
  prioritizeByExtension?: string[];
}

export class CodeChunkingService {
  // Logger is available as a singleton
  
  // Rough estimate: 1 token ≈ 4 characters
  private readonly CHARS_PER_TOKEN = 4;
  
  // Default max tokens per chunk (leaving room for prompt and response)
  private readonly DEFAULT_MAX_TOKENS_PER_CHUNK = 50000; // ~12.5k characters
  
  // Maximum files per chunk to avoid overwhelming context
  private readonly DEFAULT_MAX_FILES_PER_CHUNK = 20;

  /**
   * Split repository files into manageable chunks for LLM processing
   */
  chunkFiles(
    files: GitHubFile[],
    options: ChunkingOptions = {}
  ): CodeChunk[] {
    const {
      maxTokensPerChunk = this.DEFAULT_MAX_TOKENS_PER_CHUNK,
      maxFilesPerChunk = this.DEFAULT_MAX_FILES_PER_CHUNK,
      prioritizeByExtension = ['.ts', '.tsx', '.js', '.jsx', '.py', '.java']
    } = options;

    logger.info('Starting file chunking', { 
      totalFiles: files.length,
      maxTokensPerChunk,
      maxFilesPerChunk 
    });

    // Sort files by priority (prioritized extensions first)
    const sortedFiles = this.prioritizeFiles(files, prioritizeByExtension);

    const chunks: CodeChunk[] = [];
    let currentChunk: GitHubFile[] = [];
    let currentTokenCount = 0;
    let startIndex = 0;

    for (let i = 0; i < sortedFiles.length; i++) {
      const file = sortedFiles[i];
      if (!file) continue;
      const fileTokens = this.estimateTokens(file.content);

      // Check if adding this file would exceed limits
      if (
        currentChunk.length > 0 && 
        (currentTokenCount + fileTokens > maxTokensPerChunk || 
         currentChunk.length >= maxFilesPerChunk)
      ) {
        // Create a chunk with current files
        chunks.push(this.createChunk(
          currentChunk,
          currentTokenCount,
          startIndex,
          i - 1,
          sortedFiles.length
        ));

        // Start new chunk
        currentChunk = [file];
        currentTokenCount = fileTokens;
        startIndex = i;
      } else {
        // Add file to current chunk
        currentChunk.push(file);
        currentTokenCount += fileTokens;
      }
    }

    // Add the last chunk if it has files
    if (currentChunk.length > 0) {
      chunks.push(this.createChunk(
        currentChunk,
        currentTokenCount,
        startIndex,
        sortedFiles.length - 1,
        sortedFiles.length
      ));
    }

    logger.info('File chunking completed', { 
      totalChunks: chunks.length,
      totalFiles: files.length 
    });

    return chunks;
  }

  /**
   * Create a single chunk for repositories with few files
   */
  createSingleChunk(files: GitHubFile[]): CodeChunk {
    const totalTokens = files.reduce(
      (sum, file) => sum + this.estimateTokens(file.content),
      0
    );

    return this.createChunk(files, totalTokens, 0, files.length - 1, files.length);
  }

  /**
   * Aggregate file contents into a format suitable for LLM processing
   */
  aggregateChunkContent(chunk: CodeChunk): string {
    const fileContents = chunk.files.map(file => {
      return `### File: ${file.path}
\`\`\`${file.language || ''}
${file.content}
\`\`\`
`;
    }).join('\n');

    return fileContents;
  }

  /**
   * Get summary of files in a chunk
   */
  getChunkSummary(chunk: CodeChunk): string {
    const fileList = chunk.files
      .map(f => `- ${f.path} (${f.language || 'unknown'})`)
      .join('\n');

    return `Chunk ${chunk.id} contains ${chunk.files.length} files:
${fileList}
Token estimate: ${chunk.tokenEstimate}`;
  }

  /**
   * Prioritize files based on extensions
   */
  private prioritizeFiles(
    files: GitHubFile[],
    priorityExtensions: string[]
  ): GitHubFile[] {
    const getExtension = (path: string) => {
      const match = path.match(/\.[^.]+$/);
      return match ? match[0] : '';
    };

    return [...files].sort((a, b) => {
      const extA = getExtension(a.path);
      const extB = getExtension(b.path);
      
      const priorityA = priorityExtensions.indexOf(extA);
      const priorityB = priorityExtensions.indexOf(extB);
      
      // If both have priority, sort by priority order
      if (priorityA !== -1 && priorityB !== -1) {
        return priorityA - priorityB;
      }
      
      // Prioritized extensions come first
      if (priorityA !== -1) return -1;
      if (priorityB !== -1) return 1;
      
      // Otherwise, sort alphabetically by path
      return a.path.localeCompare(b.path);
    });
  }

  /**
   * Estimate token count for a string
   */
  private estimateTokens(content: string): number {
    // Simple estimation: characters / 4
    // This is a rough estimate; actual token count may vary
    return Math.ceil(content.length / this.CHARS_PER_TOKEN);
  }

  /**
   * Create a chunk object
   */
  private createChunk(
    files: GitHubFile[],
    tokenEstimate: number,
    startIndex: number,
    endIndex: number,
    totalFiles: number
  ): CodeChunk {
    const chunkId = `chunk_${startIndex}_${endIndex}`;
    
    return {
      id: chunkId,
      files,
      tokenEstimate,
      metadata: {
        startIndex,
        endIndex,
        totalFiles
      }
    };
  }

  /**
   * Check if files can fit in a single request
   */
  canProcessInSingleRequest(
    files: GitHubFile[],
    maxTokens: number = this.DEFAULT_MAX_TOKENS_PER_CHUNK
  ): boolean {
    const totalTokens = files.reduce(
      (sum, file) => sum + this.estimateTokens(file.content),
      0
    );
    
    return totalTokens <= maxTokens;
  }
}