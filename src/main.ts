#!/usr/bin/env bun

import * as core from '@actions/core';
import * as github from '@actions/github';
import { ChangelogGenerator } from './changelog-generator';
import { GitAnalyzer } from './git-analyzer';
import { createClaudeClient } from './claude-client';

async function run(): Promise<void> {
  try {
    // Get inputs
    const githubToken = core.getInput('github_token') || process.env.GITHUB_TOKEN;
    const anthropicApiKey = core.getInput('anthropic_api_key') || process.env.ANTHROPIC_API_KEY;
    const fromTag = core.getInput('from_tag');
    const toRef = core.getInput('to_ref') || 'HEAD';
    const outputFile = core.getInput('output_file') || 'CHANGELOG.md';
    const format = core.getInput('format') || 'markdown';
    const model = core.getInput('model') || 'claude-3-5-sonnet-20241022';
    const useBedrock = core.getInput('use_bedrock') === 'true';
    const useVertex = core.getInput('use_vertex') === 'true';
    const bedrockRegion = core.getInput('bedrock_region') || 'us-east-1';
    const vertexProjectId = core.getInput('vertex_project_id');
    const vertexRegion = core.getInput('vertex_region') || 'us-central1';

    if (!githubToken) {
      throw new Error('GitHub token is required');
    }

    core.info('Starting changelog generation...');

    // Initialize git analyzer
    const gitAnalyzer = new GitAnalyzer();
    
    // Get the from tag if not specified
    const actualFromTag = fromTag || await gitAnalyzer.getLatestTag();
    if (!actualFromTag) {
      throw new Error('No from tag specified and no tags found in repository');
    }

    core.info(`Analyzing changes from ${actualFromTag} to ${toRef}`);

    // Analyze git changes
    const changes = await gitAnalyzer.getChangesBetween(actualFromTag, toRef);
    if (!changes.commits.length) {
      core.info('No changes found between the specified references');
      core.setOutput('changelog', 'No changes found');
      core.setOutput('changelog_file', '');
      core.setOutput('changes_count', '0');
      return;
    }

    core.info(`Found ${changes.commits.length} commits with changes`);

    // Create Claude client
    const claudeClient = await createClaudeClient({
      anthropicApiKey,
      useBedrock,
      useVertex,
      bedrockRegion,
      vertexProjectId,
      vertexRegion,
      model
    });

    // Generate changelog
    const generator = new ChangelogGenerator(claudeClient);
    const changelog = await generator.generateChangelog(changes, format);

    core.info('Changelog generated successfully');

    // Write to file if specified
    if (outputFile && outputFile !== 'stdout') {
      const fs = await import('fs/promises');
      await fs.writeFile(outputFile, changelog, 'utf8');
      core.info(`Changelog written to ${outputFile}`);
    }

    // Set outputs
    core.setOutput('changelog', changelog);
    core.setOutput('changelog_file', outputFile);
    core.setOutput('changes_count', changes.commits.length.toString());

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    core.setFailed(`Action failed: ${errorMessage}`);
  }
}

if (import.meta.main) {
  run();
}