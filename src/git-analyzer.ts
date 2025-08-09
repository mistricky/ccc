import { simpleGit, SimpleGit, DiffResultTextFile } from 'simple-git';

export interface GitChange {
  file: string;
  insertions: number;
  deletions: number;
  diff: string;
}

export interface GitCommit {
  hash: string;
  date: string;
  message: string;
  author: string;
  email: string;
}

export interface AnalyzedChanges {
  commits: GitCommit[];
  files: GitChange[];
  totalInsertions: number;
  totalDeletions: number;
  fromTag: string;
  toRef: string;
}

export class GitAnalyzer {
  private git: SimpleGit;

  constructor(repoPath?: string) {
    this.git = simpleGit(repoPath || process.cwd());
  }

  async getLatestTag(): Promise<string | null> {
    try {
      const tags = await this.git.tags(['--sort=-version:refname']);
      return tags.latest || tags.all[0] || null;
    } catch (error) {
      console.warn('Failed to get latest tag:', error);
      return null;
    }
  }

  async getChangesBetween(fromTag: string, toRef: string): Promise<AnalyzedChanges> {
    try {
      // Get commit log
      const log = await this.git.log({ 
        from: fromTag, 
        to: toRef
      });

      const commits: GitCommit[] = log.all.map(commit => ({
        hash: commit.hash,
        date: commit.date,
        message: commit.message,
        author: commit.author_name,
        email: commit.author_email
      }));

      // Get diff summary
      const diffSummary = await this.git.diffSummary([`${fromTag}..${toRef}`]);
      
      // Get detailed diff for each file
      const files: GitChange[] = [];
      let totalInsertions = 0;
      let totalDeletions = 0;

      for (const file of diffSummary.files) {
        try {
          const diff = await this.git.diff([`${fromTag}..${toRef}`, '--', file.file]);
          const insertions = (file as DiffResultTextFile).insertions || 0;
          const deletions = (file as DiffResultTextFile).deletions || 0;
          
          files.push({
            file: file.file,
            insertions,
            deletions,
            diff
          });
          totalInsertions += insertions;
          totalDeletions += deletions;
        } catch (error) {
          console.warn(`Failed to get diff for ${file.file}:`, error);
          // Add file without diff if we can't get it
          const insertions = (file as DiffResultTextFile).insertions || 0;
          const deletions = (file as DiffResultTextFile).deletions || 0;
          
          files.push({
            file: file.file,
            insertions,
            deletions,
            diff: ''
          });
        }
      }

      return {
        commits,
        files,
        totalInsertions,
        totalDeletions,
        fromTag,
        toRef
      };

    } catch (error) {
      throw new Error(`Failed to analyze git changes: ${error}`);
    }
  }

  async getCurrentBranch(): Promise<string> {
    try {
      const status = await this.git.status();
      return status.current || 'main';
    } catch (error) {
      console.warn('Failed to get current branch:', error);
      return 'main';
    }
  }

  async getRepositoryInfo(): Promise<{ owner: string; repo: string } | null> {
    try {
      const remotes = await this.git.getRemotes(true);
      const origin = remotes.find(remote => remote.name === 'origin');
      
      if (origin && origin.refs.fetch) {
        const match = origin.refs.fetch.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
        if (match) {
          return { owner: match[1], repo: match[2] };
        }
      }
      
      return null;
    } catch (error) {
      console.warn('Failed to get repository info:', error);
      return null;
    }
  }
}