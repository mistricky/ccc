import { ClaudeClient } from './claude-client';
import { AnalyzedChanges } from './git-analyzer';

export interface ChangelogSection {
  type: 'added' | 'changed' | 'deprecated' | 'removed' | 'fixed' | 'security';
  items: string[];
}

export interface GeneratedChangelog {
  version?: string;
  date: string;
  sections: ChangelogSection[];
  summary?: string;
}

export class ChangelogGenerator {
  constructor(private claudeClient: ClaudeClient) {}

  async generateChangelog(changes: AnalyzedChanges, format: string = 'markdown'): Promise<string> {
    const prompt = this.buildPrompt(changes);
    const response = await this.claudeClient.generateResponse(prompt);
    
    if (format === 'json') {
      return this.formatAsJson(response.content, changes);
    }
    
    return this.formatAsMarkdown(response.content);
  }

  private buildPrompt(changes: AnalyzedChanges): string {
    const { commits, files, totalInsertions, totalDeletions, fromTag, toRef } = changes;
    
    // Build commit summary
    const commitSummary = commits.map(commit => 
      `- ${commit.hash.substring(0, 8)}: ${commit.message} (${commit.author})`
    ).join('\\n');

    // Build file changes summary
    const fileChanges = files.map(file => 
      `- ${file.file}: +${file.insertions} -${file.deletions}`
    ).join('\\n');

    // Sample some diffs for context (limit to avoid token limits)
    const significantDiffs = files
      .filter(f => f.insertions + f.deletions > 5)
      .slice(0, 5)
      .map(file => `### ${file.file}\\n\`\`\`diff\\n${file.diff.substring(0, 1000)}\\n\`\`\``)
      .join('\\n\\n');

    return `You are a technical writer creating a changelog for a software project. Analyze the following git changes and generate a well-structured changelog entry.

## Change Summary
- **From:** ${fromTag}
- **To:** ${toRef}
- **Commits:** ${commits.length}
- **Files changed:** ${files.length}
- **Total changes:** +${totalInsertions} -${totalDeletions}

## Commits
${commitSummary}

## File Changes
${fileChanges}

${significantDiffs ? `## Sample Code Changes\\n${significantDiffs}` : ''}

## Instructions
Generate a changelog entry following these guidelines:

1. **Categorize changes** using these standard categories:
   - **Added**: New features
   - **Changed**: Changes in existing functionality
   - **Deprecated**: Soon-to-be removed features
   - **Removed**: Removed features
   - **Fixed**: Bug fixes
   - **Security**: Security improvements

2. **Write clear, user-focused descriptions** that explain:
   - What changed from a user's perspective
   - Why it matters
   - Any breaking changes or migration notes

3. **Use consistent formatting**:
   - Each item should be a concise bullet point
   - Start with an action verb when possible
   - Reference issue/PR numbers if visible in commit messages

4. **Focus on semantic meaning** rather than technical implementation details

5. **Group related changes** together logically

Please generate a changelog entry in markdown format with appropriate sections and bullet points. Do not include version numbers or dates - I'll add those separately.

Return only the changelog content without any explanatory text or metadata.`;
  }

  private formatAsMarkdown(content: string): string {
    // Clean up the content and ensure proper markdown formatting
    let formatted = content.trim();
    
    // Add metadata header if not present
    if (!formatted.includes('## ') && !formatted.includes('### ')) {
      const today = new Date().toISOString().split('T')[0];
      formatted = `## [Unreleased] - ${today}\\n\\n${formatted}`;
    }
    
    return formatted;
  }

  private formatAsJson(content: string, changes: AnalyzedChanges): string {
    try {
      // Try to extract structured data from the markdown content
      const sections: ChangelogSection[] = [];
      const lines = content.split('\\n');
      let currentSection: ChangelogSection | null = null;
      
      for (const line of lines) {
        const trimmed = line.trim();
        
        // Check for section headers
        const sectionMatch = trimmed.match(/^##\\s*(Added|Changed|Deprecated|Removed|Fixed|Security)/i);
        if (sectionMatch) {
          if (currentSection) {
            sections.push(currentSection);
          }
          currentSection = {
            type: sectionMatch[1].toLowerCase() as ChangelogSection['type'],
            items: []
          };
          continue;
        }
        
        // Check for bullet points
        if (currentSection && trimmed.match(/^[-*]\\s+/)) {
          const item = trimmed.replace(/^[-*]\\s+/, '');
          currentSection.items.push(item);
        }
      }
      
      if (currentSection) {
        sections.push(currentSection);
      }
      
      const changelog: GeneratedChangelog = {
        date: new Date().toISOString().split('T')[0],
        sections,
        summary: `${changes.commits.length} commits, ${changes.files.length} files changed`
      };
      
      return JSON.stringify(changelog, null, 2);
    } catch (error) {
      // Fallback to simple JSON structure
      return JSON.stringify({
        date: new Date().toISOString().split('T')[0],
        content: content,
        metadata: {
          commits: changes.commits.length,
          files: changes.files.length,
          insertions: changes.totalInsertions,
          deletions: changes.totalDeletions,
          fromTag: changes.fromTag,
          toRef: changes.toRef
        }
      }, null, 2);
    }
  }
}