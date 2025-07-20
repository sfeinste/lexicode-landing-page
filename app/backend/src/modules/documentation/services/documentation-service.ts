import { logger } from '@/shared/logger';
import { supabaseAdmin } from '@/lib/supabase';
//import { AnthropicService } from '@/services/anthropic.service';
import { OpenAIService } from '@/services/openai.service';
import { GitHubFileReaderService } from '@/services/github-file-reader.service';
import { CodeChunkingService } from '@/services/code-chunking.service';
import { PromptTemplates, CodeContext } from '@/services/prompt-templates';
import { MultiPassGenerationService } from '@/services/multi-pass-generation.service';
import { CodeContextExtractionService } from '@/services/code-context-extraction.service';
import { FileDocumentationService, FileContext } from '@/services/file-documentation.service';
import { 
  DocumentationFile as DocFile, 
  DocumentationSummary, 
  FileDocumentationResult,
  RepositoryDocumentationResult 
} from '../types';

export interface DocumentationProject {
  id: string;
  repositoryId: string;
  name: string;
  description?: string;
  branch: string;
  config: any;
  status: string;
  totalFiles: number;
  documentedFiles: number;
  coveragePercentage: number;
  lastGeneratedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface DocumentationGeneration {
  id: string;
  projectId: string;
  status: string;
  triggerType: string;
  inputData?: any;
  outputData?: any;
  errorData?: any;
  filesProcessed: number;
  filesFailed: number;
  processingTimeSeconds?: number;
  startedAt: Date | undefined;
  completedAt?: Date;
  createdAt: Date;
}

export interface DocumentationFile {
  id: string;
  projectId: string;
  generationId?: string;
  filePath: string;
  fileType?: string;
  language?: string;
  linesOfCode?: number;
  originalContent?: string;
  generatedDocumentation?: string;
  metadata?: any;
  s3Key?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class DocumentationService {
  private anthropicService: OpenAIService;
  private githubFileReader: GitHubFileReaderService;
  private codeChunking: CodeChunkingService;
  private multiPassGeneration: MultiPassGenerationService;
  private codeContextExtraction: CodeContextExtractionService;
  private fileDocumentation: FileDocumentationService;

  constructor() {
    this.anthropicService = new OpenAIService();
    this.githubFileReader = new GitHubFileReaderService();
    this.codeChunking = new CodeChunkingService();
    this.multiPassGeneration = new MultiPassGenerationService();
    this.codeContextExtraction = new CodeContextExtractionService();
    this.fileDocumentation = new FileDocumentationService();
  }
  async createProject(data: any): Promise<DocumentationProject> {
    // TODO: Implement create project
    logger.info('DocumentationService: createProject called');
    throw new Error('Not implemented');
  }

  async getUserProjects(userId: string): Promise<DocumentationProject[]> {
    // TODO: Implement get user projects
    logger.info('DocumentationService: getUserProjects called');
    throw new Error('Not implemented');
  }

  async getProject(projectId: string): Promise<DocumentationProject | null> {
    // TODO: Implement get project
    logger.info('DocumentationService: getProject called');
    throw new Error('Not implemented');
  }

  async updateProject(projectId: string, data: Partial<DocumentationProject>): Promise<DocumentationProject> {
    // TODO: Implement update project
    logger.info('DocumentationService: updateProject called');
    throw new Error('Not implemented');
  }

  async deleteProject(projectId: string): Promise<void> {
    // TODO: Implement delete project
    logger.info('DocumentationService: deleteProject called');
    throw new Error('Not implemented');
  }

  async getProjectFiles(projectId: string): Promise<DocumentationFile[]> {
    // TODO: Implement get project files
    logger.info('DocumentationService: getProjectFiles called');
    throw new Error('Not implemented');
  }

  async getProjectGenerations(projectId: string): Promise<DocumentationGeneration[]> {
    // TODO: Implement get project generations
    logger.info('DocumentationService: getProjectGenerations called');
    throw new Error('Not implemented');
  }

  async generateDocumentation(repositoryId: string, userId: string, useMultiPass: boolean = false): Promise<DocumentationGeneration> {
    logger.info('DocumentationService: generateDocumentation called - redirecting to file-based generation', { repositoryId, userId });
    
    // Always use file-based generation now
    const result = await this.generateFileBasedDocumentation(repositoryId, userId);
    
    // Convert the result to match the expected return type
    return {
      id: result.generation_id,
      projectId: '',
      status: 'completed',
      triggerType: 'manual',
      filesProcessed: result.files.length,
      filesFailed: 0,
      processingTimeSeconds: 0,
      startedAt: new Date(),
      completedAt: new Date(),
      createdAt: new Date()
    };
  }
  
  // Original generateDocumentation method - DEPRECATED
  private async generateDocumentationOld(repositoryId: string, userId: string, useMultiPass: boolean = false): Promise<DocumentationGeneration> {
    logger.info('DocumentationService: generateDocumentationOld called', { repositoryId, userId });
    
    const startTime = Date.now();
    let generation: DocumentationGeneration | null = null;
    
    try {
      // Get repository details
      const { data: repository, error: repoError } = await supabaseAdmin
        .from('repository_access')
        .select('*')
        .eq('id', repositoryId)
        .eq('user_id', userId)
        .single();
        
      if (repoError || !repository) {
        throw new Error('Repository not found or access denied');
      }

      // Get GitHub installation
      const { data: installation, error: installError } = await supabaseAdmin
        .from('github_installations')
        .select('*')
        .eq('user_id', userId)
        .single();
        
      if (installError || !installation) {
        throw new Error('GitHub installation not found');
      }

      // Create documentation generation record
      const { data: newGeneration, error: genError } = await supabaseAdmin
        .from('documentation_generations')
        .insert({
          repository_id: repositoryId,
          user_id: userId,
          status: 'processing',
          trigger_type: 'manual',
          files_processed: 0,
          files_failed: 0,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();
        
      if (genError || !newGeneration) {
        throw new Error('Failed to create generation record');
      }
      
      generation = {
        id: newGeneration.id,
        projectId: '',
        status: newGeneration.status,
        triggerType: newGeneration.trigger_type,
        filesProcessed: newGeneration.files_processed,
        filesFailed: newGeneration.files_failed,
        startedAt: newGeneration.started_at ? new Date(newGeneration.started_at) : undefined,
        createdAt: new Date(newGeneration.created_at)
      };

      // Extract owner and name from repo_full_name (format: owner/name)
      const [owner, name] = repository.repo_full_name.split('/');
      const branch = repository.default_branch || 'main';
      
      // Fetch repository files
      logger.info('Fetching repository files', { 
        owner,
        name,
        branch,
        repo_full_name: repository.repo_full_name
      });
      
      const files = await this.githubFileReader.fetchRepositoryFiles(
        installation.github_installation_id,
        owner,
        name,
        branch
      );

      logger.info('Files fetched', { fileCount: files.length });

      // Fetch README and dependencies
      const readme = await this.githubFileReader.fetchReadme(
        installation.github_installation_id,
        owner,
        name,
        branch
      );
      
      const packageJson = await this.githubFileReader.fetchPackageJson(
        installation.github_installation_id,
        owner,
        name,
        branch
      );
      
      // Fetch configuration files
      const configFiles = await this.githubFileReader.fetchConfigurationFiles(
        installation.github_installation_id,
        owner,
        name,
        branch
      );
      
      // Analyze all dependencies
      const dependencyAnalysis = await this.githubFileReader.analyzeDependencies(
        installation.github_installation_id,
        owner,
        name,
        branch
      );
      
      // Add config files to the main files list for documentation
      const allFiles = [...files, ...configFiles];
      
      // Extract enhanced context
      logger.info('Extracting enhanced code context');
      const enhancedContext = this.codeContextExtraction.extractEnhancedContext(allFiles);

      // Create code context with enhanced information
      const codeContext: CodeContext = {
        repositoryName: repository.repo_full_name,
        language: repository.language || 'unknown',
        files: allFiles.map(f => {
          const file: { path: string; content: string; language?: string } = {
            path: f.path,
            content: f.content
          };
          if (f.language) {
            file.language = f.language;
          }
          return file;
        }),
        packageJson: packageJson,
        enhancedContext: {
          typeDefinitions: enhancedContext.typeDefinitions.map(t => ({
            name: t.name,
            type: t.type,
            definition: t.definition,
            file: t.file
          })),
          docComments: enhancedContext.docComments.map(d => ({
            type: d.type,
            content: d.content,
            file: d.file
          })),
          designPatterns: enhancedContext.designPatterns.map(p => ({
            name: p.name,
            type: p.type,
            description: p.description,
            files: p.files
          })),
          environmentVariables: enhancedContext.environmentVariables.map(e => ({
            name: e.name,
            ...(e.description !== undefined && { description: e.description }),
            ...(e.defaultValue !== undefined && { defaultValue: e.defaultValue }),
            required: e.required
          })),
          testExamples: enhancedContext.testExamples.map(t => ({
            name: t.name,
            code: t.code,
            file: t.file
          }))
        }
      };
      
      if (packageJson) {
        codeContext.dependencies = {
          ...(packageJson.dependencies || {}),
          ...(packageJson.devDependencies || {})
        };
      }
      
      if (readme) {
        codeContext.readme = readme;
      }
      
      // Detect entry points from all files (including config)
      const entryPoints = allFiles
        .filter(f => 
          f.path.includes('index.') || 
          f.path.includes('main.') || 
          f.path.includes('app.') ||
          f.path.includes('server.') ||
          f.path === 'cli.js' ||
          f.path === 'bin/cli'
        )
        .map(f => f.path);
        
      if (entryPoints.length > 0) {
        codeContext.entryPoints = entryPoints;
      }
      
      // Detect project type
      const projectType = PromptTemplates.detectProjectType(codeContext);

      // Check if we can process in a single request
      let documentation = '';
      let totalCost = 0;
      
      // Decide whether to use multi-pass generation
      if (useMultiPass && this.codeChunking.canProcessInSingleRequest(allFiles)) {
        // Use multi-pass generation for better quality
        logger.info('Using multi-pass documentation generation');
        
        const multiPassResult = await this.multiPassGeneration.generateMultiPassDocumentation(
          codeContext,
          {
            projectType: projectType as any,
            includeExamples: true,
            style: 'comprehensive'
          }
        );
        
        documentation = multiPassResult.mergedContent;
        totalCost = multiPassResult.totalCost;
        
        // Store individual sections for future use
        await supabaseAdmin
          .from('documentation_sections')
          .insert(
            multiPassResult.sections.map(section => ({
              repository_id: repositoryId,
              user_id: userId,
              generation_id: generation!.id,
              section_id: section.id,
              title: section.title,
              content: section.content,
              type: section.type,
              pass: section.pass,
              metadata: section.metadata
            }))
          );
          
      } else if (this.codeChunking.canProcessInSingleRequest(allFiles)) {
        // Process all files in one request (standard single-pass)
        logger.info('Processing all files in single request');
        
        const prompt = PromptTemplates.generateDocumentationPrompt(codeContext, {
          projectType: projectType as any,
          includeExamples: true,
          style: 'comprehensive'
        });
        const response = await this.anthropicService.generateDocumentation(prompt);
        
        documentation = response.content;
        totalCost = response.cost;
      } else {
        // Process in chunks using smart chunking
        logger.info('Processing files in chunks using smart dependency analysis');
        
        const chunks = this.codeChunking.smartChunkFiles(allFiles);
        const chunkResults: string[] = [];
        
        for (const chunk of chunks) {
          logger.info(`Processing chunk ${chunk.id}`, { 
            fileCount: chunk.files.length,
            tokenEstimate: chunk.tokenEstimate 
          });
          
          const chunkContext: CodeContext = {
            ...codeContext,
            files: chunk.files.map(f => {
              const file: { path: string; content: string; language?: string } = {
                path: f.path,
                content: f.content
              };
              if (f.language) {
                file.language = f.language;
              }
              return file;
            })
          };
          
          if (useMultiPass) {
            // Use multi-pass for each chunk
            const multiPassResult = await this.multiPassGeneration.generateMultiPassDocumentation(
              chunkContext,
              {
                projectType: projectType as any,
                includeExamples: true,
                style: 'comprehensive'
              }
            );
            
            chunkResults.push(multiPassResult.mergedContent);
            totalCost += multiPassResult.totalCost;
          } else {
            // Standard single-pass for each chunk
            const prompt = PromptTemplates.generateDocumentationPrompt(chunkContext, {
              projectType: projectType as any,
              includeExamples: true,
              style: 'comprehensive'
            });
            const response = await this.anthropicService.generateDocumentation(prompt);
            
            chunkResults.push(response.content);
            totalCost += response.cost;
          }
        }
        
        // Combine chunk results
        documentation = chunkResults.join('\n\n---\n\n');
      }

      // Store documentation
      const { error: docError } = await supabaseAdmin
        .from('documentation')
        .upsert({
          repository_id: repositoryId,
          user_id: userId,
          content: documentation,
          generation_id: generation!.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'repository_id,user_id'
        });
        
      if (docError) {
        throw new Error('Failed to store documentation');
      }

      // Update generation record
      const processingTime = (Date.now() - startTime) / 1000;
      
      const { error: updateError } = await supabaseAdmin
        .from('documentation_generations')
        .update({
          status: 'completed',
          files_processed: allFiles.length,
          processing_time_seconds: processingTime,
          completed_at: new Date().toISOString(),
          output_data: {
            total_files: allFiles.length,
            config_files: configFiles.length,
            total_cost: totalCost,
            documentation_length: documentation.length
          }
        })
        .eq('id', generation!.id);
        
      if (updateError) {
        logger.error('Failed to update generation record', { error: updateError });
      }

      logger.info('Documentation generation completed', {
        repositoryId,
        generationId: generation!.id,
        filesProcessed: files.length,
        processingTime,
        totalCost
      });

      return {
        id: generation!.id,
        projectId: generation!.projectId,
        status: 'completed',
        triggerType: generation!.triggerType,
        filesProcessed: files.length,
        filesFailed: generation!.filesFailed,
        processingTimeSeconds: processingTime,
        startedAt: generation!.startedAt,
        completedAt: new Date(),
        createdAt: generation!.createdAt
      };
      
    } catch (error) {
      logger.error('Documentation generation failed', { repositoryId, error });
      
      // Update generation record with error
      if (generation) {
        await supabaseAdmin
          .from('documentation_generations')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_data: {
              message: error instanceof Error ? error.message : 'Unknown error',
              stack: error instanceof Error ? error.stack : undefined
            }
          })
          .eq('id', generation.id);
      }
      
      throw error;
    }
  }

  async getDocumentation(repositoryId: string, userId: string): Promise<any> {
    logger.info('DocumentationService: getDocumentation called', { repositoryId, userId });
    
    try {
      const { data: documentation, error } = await supabaseAdmin
        .from('documentation')
        .select('*')
        .eq('repository_id', repositoryId)
        .eq('user_id', userId)
        .single();
        
      if (error) {
        logger.error('Failed to get documentation', { error });
        return null;
      }
      
      return documentation;
    } catch (error) {
      logger.error('Failed to get documentation', { repositoryId, error });
      throw error;
    }
  }

  async getRepositoryInfo(repositoryId: string, userId: string): Promise<any> {
    logger.info('DocumentationService: getRepositoryInfo called', { repositoryId, userId });
    
    try {
      const { data: repository, error } = await supabaseAdmin
        .from('repository_access')
        .select('*')
        .eq('id', repositoryId)
        .eq('user_id', userId)
        .single();
        
      if (error || !repository) {
        logger.error('Repository not found or access denied', { error });
        return null;
      }
      
      return repository;
    } catch (error) {
      logger.error('Failed to get repository info', { repositoryId, error });
      throw error;
    }
  }

  async getAllDocumentation(userId: string): Promise<any[]> {
    logger.info('DocumentationService: getAllDocumentation called', { userId });
    
    try {
      // First get all documentation for the user
      const { data: documentation, error: docError } = await supabaseAdmin
        .from('documentation')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
        
      if (docError) {
        logger.error('Failed to get all documentation', { error: docError });
        return [];
      }
      
      if (!documentation || documentation.length === 0) {
        logger.info('No documentation found for user', { userId });
        return [];
      }
      
      logger.info('Found documentation entries', { 
        userId, 
        count: documentation.length,
        documentationIds: documentation.map(d => d.id)
      });
      
      // Get repository details for each documentation
      const documentationWithRepos = await Promise.all(
        documentation.map(async (doc) => {
          const { data: repo, error: repoError } = await supabaseAdmin
            .from('repository_access')
            .select('id, repo_full_name, repo_name, repo_owner, language, default_branch')
            .eq('id', doc.repository_id)
            .single();
            
          if (repoError || !repo) {
            logger.warn('Repository not found for documentation', { 
              documentationId: doc.id, 
              repositoryId: doc.repository_id 
            });
          }
          
          return {
            ...doc,
            repository: repo || null
          };
        })
      );
      
      return documentationWithRepos;
    } catch (error) {
      logger.error('Failed to get all documentation', { userId, error });
      throw error;
    }
  }

  async searchDocumentation(query: string, filters?: any): Promise<DocumentationFile[]> {
    // TODO: Implement search documentation
    logger.info('DocumentationService: searchDocumentation called');
    throw new Error('Not implemented');
  }

  async exportDocumentation(projectId: string, format: string): Promise<Buffer> {
    // TODO: Implement export documentation
    logger.info('DocumentationService: exportDocumentation called');
    throw new Error('Not implemented');
  }

  /**
   * Generate file-based documentation for a repository
   */
  async generateFileBasedDocumentation(repositoryId: string, userId: string): Promise<RepositoryDocumentationResult> {
    logger.info('DocumentationService: generateFileBasedDocumentation called', { repositoryId, userId });
    
    const startTime = Date.now();
    let generation: any = null;
    
    try {
      // Get repository details
      const { data: repository, error: repoError } = await supabaseAdmin
        .from('repository_access')
        .select('*')
        .eq('id', repositoryId)
        .eq('user_id', userId)
        .single();
        
      if (repoError || !repository) {
        throw new Error('Repository not found or access denied');
      }

      // Get GitHub installation
      const { data: installation, error: installError } = await supabaseAdmin
        .from('github_installations')
        .select('*')
        .eq('user_id', userId)
        .single();
        
      if (installError || !installation) {
        throw new Error('GitHub installation not found');
      }

      // Create documentation generation record
      const { data: newGeneration, error: genError } = await supabaseAdmin
        .from('documentation_generations')
        .insert({
          repository_id: repositoryId,
          user_id: userId,
          status: 'processing',
          trigger_type: 'manual',
          files_processed: 0,
          files_failed: 0,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();
        
      if (genError || !newGeneration) {
        throw new Error('Failed to create generation record');
      }
      
      generation = newGeneration;
      
      // Create an empty documentation record immediately so frontend knows documentation exists
      logger.info('Creating empty documentation record for immediate availability');
      const { error: initialDocError } = await supabaseAdmin
        .from('documentation')
        .upsert({
          repository_id: repositoryId,
          user_id: userId,
          content: `# ${repository.repo_full_name}\n\n*Documentation is being generated. Please check the Files tab to see individual file documentation as it becomes available.*`,
          generation_id: generation.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'repository_id,user_id'
        });
        
      if (initialDocError) {
        logger.error('Failed to create initial documentation record', { error: initialDocError });
        // Don't throw - continue with generation
      }

      // Create an empty summary immediately so frontend can show the repository
      logger.info('Creating empty documentation summary for immediate availability');
      const { error: initialSummaryError } = await supabaseAdmin
        .from('documentation_summaries')
        .upsert({
          repository_id: repositoryId,
          generation_id: generation.id,
          content: `# ${repository.repo_full_name}\n\n*Documentation is being generated. Please refresh in a few moments to see the content.*`,
          metadata: {
            total_files: 0,
            languages: {},
            total_lines: 0,
            documentation_coverage: 0
          }
        }, {
          onConflict: 'repository_id,generation_id'
        });
        
      if (initialSummaryError) {
        logger.error('Failed to create initial documentation summary', { error: initialSummaryError });
        // Don't throw - continue with generation
      }

      // Extract owner and name from repo_full_name
      const [owner, name] = repository.repo_full_name.split('/');
      const branch = repository.default_branch || 'main';
      
      // Fetch repository files
      logger.info('Fetching repository files', { owner, name, branch });
      
      const files = await this.githubFileReader.fetchRepositoryFiles(
        installation.github_installation_id,
        owner,
        name,
        branch
      );

      // Fetch configuration files
      const configFiles = await this.githubFileReader.fetchConfigurationFiles(
        installation.github_installation_id,
        owner,
        name,
        branch
      );
      
      // Fetch package.json for project context
      const packageJson = await this.githubFileReader.fetchPackageJson(
        installation.github_installation_id,
        owner,
        name,
        branch
      );
      
      // Combine all files and deduplicate by path
      const fileMap = new Map();
      [...files, ...configFiles].forEach(file => {
        fileMap.set(file.path, file);
      });
      const allFiles = Array.from(fileMap.values());
      
      logger.info('Files fetched', { 
        fileCount: allFiles.length,
        regularFiles: files.length,
        configFiles: configFiles.length,
        duplicatesRemoved: files.length + configFiles.length - allFiles.length
      });

      // Detect project type
      const projectType = PromptTemplates.detectProjectType({
        repositoryName: repository.repo_full_name,
        language: repository.language || 'unknown',
        files: allFiles,
        packageJson
      } as CodeContext);

      // Prepare file contexts
      const fileContexts: FileContext[] = allFiles.map(file => ({
        filePath: file.path,
        content: file.content,
        language: file.language,
        projectContext: {
          repositoryName: repository.repo_full_name,
          projectType,
          dependencies: packageJson ? {
            ...(packageJson.dependencies || {}),
            ...(packageJson.devDependencies || {})
          } : undefined
        }
      }));

      // Generate documentation for each file in batches with immediate saving
      logger.info('Generating documentation for individual files', { 
        fileCount: fileContexts.length,
        firstFile: fileContexts[0]?.filePath 
      });
      
      const fileDocumentations: FileDocumentationResult[] = [];
      let processedFiles = 0;
      let totalLinesProcessed = 0;
      const languageCount: { [key: string]: number } = {};
      
      // Callback to save each file immediately as it's generated
      const onFileCompleted = async (result: FileDocumentationResult, index: number, total: number) => {
        const fileInsert = {
          repository_id: repositoryId,
          generation_id: generation.id,
          file_path: result.file_path,
          file_type: result.metadata.file_type,
          language: result.metadata.language,
          lines_of_code: result.metadata.lines_of_code,
          generated_documentation: result.documentation,
          metadata: result.metadata
        };
        
        // Save the file immediately
        const { error: fileInsertError } = await supabaseAdmin
          .from('documentation_files')
          .insert(fileInsert);
          
        if (fileInsertError) {
          logger.error('Failed to insert file documentation immediately', { 
            error: fileInsertError,
            filePath: result.file_path 
          });
          // Don't throw - continue with other files
        } else {
          logger.info('File documentation saved immediately', {
            filePath: result.file_path,
            progress: `${index + 1}/${total}`
          });
          
          // Update tracking variables
          processedFiles++;
          totalLinesProcessed += result.metadata.lines_of_code || 0;
          if (result.metadata.language) {
            languageCount[result.metadata.language] = (languageCount[result.metadata.language] || 0) + 1;
          }
          
          // Update summary metadata incrementally
          const updatedMetadata = {
            total_files: allFiles.length,
            languages: languageCount,
            total_lines: totalLinesProcessed,
            documentation_coverage: (processedFiles / allFiles.length) * 100
          };
          
          await supabaseAdmin
            .from('documentation_summaries')
            .update({
              metadata: updatedMetadata,
              updated_at: new Date().toISOString()
            })
            .eq('repository_id', repositoryId)
            .eq('generation_id', generation.id);
        }
        
        // Update generation progress
        await supabaseAdmin
          .from('documentation_generations')
          .update({
            files_processed: index + 1,
            output_data: {
              current_file: index + 1,
              total_files: total,
              last_processed_file: result.file_path
            }
          })
          .eq('id', generation.id);
      };
      
      // Generate with callback
      const generatedDocs = await this.fileDocumentation.generateBatchFileDocumentation(
        fileContexts,
        onFileCompleted
      );
      
      fileDocumentations.push(...generatedDocs);
      
      logger.info('File documentation generation completed', { 
        documentsGenerated: fileDocumentations.length 
      });
      
      // Check if we have any file documentations
      if (fileDocumentations.length === 0) {
        logger.warn('No file documentations were generated');
        throw new Error('Failed to generate any file documentation');
      }
      
      // Generate repository summary
      logger.info('Generating final repository summary');
      const summary = await this.fileDocumentation.generateRepositorySummary(
        repository.repo_full_name,
        allFiles,
        fileDocumentations
      );

      // Calculate final metadata
      const metadata = {
        total_files: allFiles.length,
        languages: this.calculateLanguageDistribution(allFiles),
        total_lines: fileDocumentations.reduce((sum, doc) => sum + (doc.metadata.lines_of_code || 0), 0),
        documentation_coverage: (fileDocumentations.length / allFiles.length) * 100
      };

      // Update the placeholder summary with final content
      logger.info('Updating documentation summary with final content');
      const { error: summaryError } = await supabaseAdmin
        .from('documentation_summaries')
        .upsert({
          repository_id: repositoryId,
          generation_id: generation.id,
          content: summary,
          metadata,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'repository_id,generation_id'
        });
        
      if (summaryError) {
        logger.error('Failed to update documentation summary', { error: summaryError });
        throw new Error('Failed to update documentation summary');
      }
      
      logger.info('Documentation summary updated successfully', {
        repositoryId,
        generationId: generation.id
      });
      
      // Update the documentation record with final summary content
      logger.info('Updating documentation record with final content');
      const { error: docUpdateError } = await supabaseAdmin
        .from('documentation')
        .upsert({
          repository_id: repositoryId,
          user_id: userId,
          content: summary,
          generation_id: generation.id,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'repository_id,user_id'
        });
        
      if (docUpdateError) {
        logger.error('Failed to update documentation record', { error: docUpdateError });
        // Don't throw - the files are already saved
      }
      
      // Note: Individual files have already been saved during generation via the callback

      // Update generation record
      const processingTime = (Date.now() - startTime) / 1000;
      await supabaseAdmin
        .from('documentation_generations')
        .update({
          status: 'completed',
          files_processed: fileDocumentations.length,
          processing_time_seconds: processingTime,
          completed_at: new Date().toISOString(),
          output_data: {
            total_files: allFiles.length,
            documented_files: fileDocumentations.length,
            metadata
          }
        })
        .eq('id', generation.id);

      logger.info('File-based documentation generation completed', {
        repositoryId,
        generationId: generation.id,
        filesProcessed: fileDocumentations.length,
        processingTime
      });

      return {
        repository_id: repositoryId,
        generation_id: generation.id,
        summary,
        files: fileDocumentations,
        metadata
      };
      
    } catch (error) {
      logger.error('File-based documentation generation failed', { repositoryId, error });
      
      // Update generation record with error
      if (generation) {
        await supabaseAdmin
          .from('documentation_generations')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_data: {
              message: error instanceof Error ? error.message : 'Unknown error',
              stack: error instanceof Error ? error.stack : undefined
            }
          })
          .eq('id', generation.id);
      }
      
      throw error;
    }
  }

  /**
   * Get file-based documentation for a repository
   */
  async getFileDocumentation(repositoryId: string, userId: string): Promise<DocFile[]> {
    logger.info('Getting file documentation', { repositoryId, userId });
    
    // Verify user has access
    const { data: access } = await supabaseAdmin
      .from('repository_access')
      .select('id')
      .eq('id', repositoryId)
      .eq('user_id', userId)
      .single();
      
    if (!access) {
      throw new Error('Repository not found or access denied');
    }
    
    // Get the latest generation (regardless of status so we can see files as they're being generated)
    const { data: latestGeneration } = await supabaseAdmin
      .from('documentation_generations')
      .select('id')
      .eq('repository_id', repositoryId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
      
    if (!latestGeneration) {
      return [];
    }
    
    // Get file documentation
    const { data: files, error } = await supabaseAdmin
      .from('documentation_files')
      .select('*')
      .eq('repository_id', repositoryId)
      .eq('generation_id', latestGeneration.id)
      .order('file_path');
      
    if (error) {
      logger.error('Failed to get file documentation', { error });
      throw error;
    }
    
    return files.map(file => ({
      id: file.id,
      repository_id: file.repository_id,
      generation_id: file.generation_id,
      file_path: file.file_path,
      file_type: file.file_type,
      language: file.language,
      lines_of_code: file.lines_of_code,
      generated_documentation: file.generated_documentation,
      metadata: file.metadata,
      created_at: new Date(file.created_at),
      updated_at: new Date(file.updated_at)
    }));
  }

  /**
   * Get documentation summary for a repository
   */
  async getDocumentationSummary(repositoryId: string, userId: string): Promise<DocumentationSummary | null> {
    logger.info('Getting documentation summary', { repositoryId, userId });
    
    // Verify user has access
    const { data: access } = await supabaseAdmin
      .from('repository_access')
      .select('id')
      .eq('id', repositoryId)
      .eq('user_id', userId)
      .single();
      
    if (!access) {
      throw new Error('Repository not found or access denied');
    }
    
    // Get the latest summary
    const { data: summary, error } = await supabaseAdmin
      .from('documentation_summaries')
      .select('*')
      .eq('repository_id', repositoryId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
      
    if (error || !summary) {
      return null;
    }
    
    return {
      id: summary.id,
      repository_id: summary.repository_id,
      generation_id: summary.generation_id,
      content: summary.content,
      metadata: summary.metadata,
      created_at: new Date(summary.created_at),
      updated_at: new Date(summary.updated_at)
    };
  }

  /**
   * Get specific file documentation
   */
  async getFileDocumentationByPath(repositoryId: string, userId: string, filePath: string): Promise<DocFile | null> {
    logger.info('Getting file documentation by path', { repositoryId, userId, filePath });
    
    // Verify user has access
    const { data: access } = await supabaseAdmin
      .from('repository_access')
      .select('id')
      .eq('id', repositoryId)
      .eq('user_id', userId)
      .single();
      
    if (!access) {
      throw new Error('Repository not found or access denied');
    }
    
    // Get the latest generation (regardless of status so we can see files as they're being generated)
    const { data: latestGeneration } = await supabaseAdmin
      .from('documentation_generations')
      .select('id')
      .eq('repository_id', repositoryId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
      
    if (!latestGeneration) {
      return null;
    }
    
    // Get specific file documentation
    const { data: file, error } = await supabaseAdmin
      .from('documentation_files')
      .select('*')
      .eq('repository_id', repositoryId)
      .eq('generation_id', latestGeneration.id)
      .eq('file_path', filePath)
      .single();
      
    if (error || !file) {
      return null;
    }
    
    return {
      id: file.id,
      repository_id: file.repository_id,
      generation_id: file.generation_id,
      file_path: file.file_path,
      file_type: file.file_type,
      language: file.language,
      lines_of_code: file.lines_of_code,
      generated_documentation: file.generated_documentation,
      metadata: file.metadata,
      created_at: new Date(file.created_at),
      updated_at: new Date(file.updated_at)
    };
  }

  private calculateLanguageDistribution(files: any[]): { [key: string]: number } {
    const distribution: { [key: string]: number } = {};
    
    files.forEach(file => {
      const lang = file.language || 'unknown';
      distribution[lang] = (distribution[lang] || 0) + 1;
    });
    
    return distribution;
  }
}