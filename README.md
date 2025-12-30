# CCC (Claude Code Changelog)

A GitHub Action that automatically generates changelogs using Claude Code's AI capabilities.

## Overview

CCC (Claude Code Changelog) is a GitHub Action that leverages the official [Claude Code Action](https://github.com/anthropics/claude-code-action) to automatically analyze code changes and generate high-quality changelogs using Claude AI.

## Features

- 🤖 **AI-powered changelog generation** using the official Claude Code Action
- 📝 **Automatic git analysis** from tag to tag or commit range
- 🔄 **Multiple authentication methods** (Anthropic API, AWS Bedrock, Google Vertex AI)
- 🎯 **Structured changelog format** with conventional categories (Added, Changed, Fixed, etc.)
- ⚡ **Zero configuration** - works out of the box with sensible defaults
- 🛡️ **Fallback mechanism** - generates basic changelog if AI processing fails

## Usage

### Basic Usage

Create a `.github/workflows/changelog.yml` file in your repository:

```yaml
name: Generate Changelog
on:
  push:
    tags:
      - 'v*'

jobs:
  changelog:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Fetch full history for git analysis
          filter: blob:none # Ensure Tag blob to not be fetched 
      
      - name: Generate Changelog
        uses: mistricky/ccc@v0.2.2
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
        
      - name: View Generated Changelog
        run: |
          echo "Changelog generated and output above"
```

### Advanced Usage

#### With Custom Tag Range

```yaml
- name: Generate Changelog
  uses: mistricky/ccc@v0.2.2
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
    from_tag: 'v1.0.0'
    to_ref: 'HEAD'
    output_file: 'CHANGELOG.md'
```

#### With AWS Bedrock

```yaml
- name: Generate Changelog
  uses: mistricky/ccc@v0.2.2
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    use_bedrock: true
    bedrock_region: 'us-west-2'
    model: 'anthropic.claude-3-5-sonnet-20241022-v2:0'
  env:
    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

#### With Google Vertex AI

```yaml
- name: Generate Changelog
  uses: mistricky/ccc@v0.2.2
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    use_vertex: true
    vertex_project_id: 'your-gcp-project'
    vertex_region: 'us-central1'
  env:
    GOOGLE_APPLICATION_CREDENTIALS: ${{ secrets.GOOGLE_APPLICATION_CREDENTIALS }}
```

### Configuration Options

| Parameter | Description | Default | Required |
|-----------|-------------|---------|----------|
| `github_token` | GitHub token with repo access | `${{ github.token }}` | Yes |
| `anthropic_api_key` | Anthropic API key for Claude | - | No* |
| `from_tag` | Start tag for diff (defaults to latest tag) | Latest tag | No |
| `to_ref` | End reference for diff | `HEAD` | No |
| `small_fast_model` | Use small fast model for Claude | - | No |
| `api_base_url` | API base URL for Claude (optional, defaults to Anthropic API) | - | No |
| `model` | Claude model to use | `claude-sonnet-4-5-20250929` | No |
| `use_bedrock` | Use Amazon Bedrock | `false` | No |
| `use_vertex` | Use Google Vertex AI | `false` | No |
| `bedrock_region` | AWS Bedrock region | `us-east-1` | No |
| `vertex_project_id` | Google Cloud Project ID | - | No** |
| `vertex_region` | Google Cloud region | `us-central1` | No |

\* Required when not using Bedrock or Vertex AI  
\*\* Required when using Vertex AI

### Outputs

| Output | Description |
|--------|-------------|
| `result` | Generated changelog content |
| `from_tag` | Starting tag for the changelog |
| `to_tag` | Ending reference for the changelog |

### Example Workflow with Outputs

```yaml
name: Generate and Use Changelog
on:
  push:
    tags: ['v*']

jobs:
  changelog:
    runs-on: ubuntu-latest
    outputs:
      changelog: ${{ steps.generate.outputs.result }}
      from_tag: ${{ steps.generate.outputs.from_tag }}
      to_tag: ${{ steps.generate.outputs.to_tag }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          filter: blob:none
      - name: Generate Changelog
        id: generate
        uses: mistricky/ccc@v0.2.2
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
      
      - name: Create Release
        uses: actions/create-release@v1
        with:
          tag_name: ${{ github.ref_name }}
          release_name: Release ${{ github.ref_name }}
          body: |
            ## 🤖 AI-Generated Changelog
            
            ${{ steps.generate.outputs.result }}
            
            ---
            
            🔗 **Full Changelog**: https://github.com/${{ github.repository }}/compare/${{ steps.generate.outputs.from_tag }}...${{ steps.generate.outputs.to_tag }}
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## How It Works

1. Action fetches the latest code changes
2. Uses Claude Code to analyze change content
3. Generates semantic changelog entries
4. Updates the changelog file

## Contributing

Contributions are welcome! Please ensure:

1. Fork this repository
2. Create a feature branch
3. Commit your changes
4. Open a Pull Request

## License

MIT License

## Support

If you encounter issues, please report them in [Issues](https://github.com/mistricky/ccc/issues).
