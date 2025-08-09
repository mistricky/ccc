# CCC Architecture

## Overview

CCC (Claude Code Changelog) is now built on top of the official [Claude Code Action](https://github.com/anthropics/claude-code-action) from Anthropic, providing a robust and reliable foundation for AI-powered changelog generation.

## Architecture

### 1. **Composite Action Structure**
- Uses GitHub Actions `composite` type for maximum flexibility
- No custom runtime dependencies - relies on shell scripts and the official Claude Code Action

### 2. **Three-Step Process**

#### Step 1: Prepare Git Analysis
- Automatically detects the appropriate tag range
- Extracts git log, diff statistics, and detailed changes
- Generates a comprehensive analysis prompt for Claude
- Creates temporary files with structured data

#### Step 2: Claude Code Integration  
- Uses `anthropics/claude-code-action@v1` as a sub-action
- Passes custom instructions for changelog generation
- Leverages all authentication methods supported by the official action
- Runs in `script` mode for automated processing

#### Step 3: Process Results
- Processes Claude's output and formats it appropriately  
- Handles both success and failure scenarios
- Provides structured outputs for integration with other workflows
- Implements fallback mechanism for reliability

## Key Benefits

### 🚀 **Reliability**
- Built on official Anthropic tooling
- Comprehensive error handling and fallbacks
- No custom AI integration code to maintain

### 🔧 **Flexibility** 
- Supports all authentication methods (API, Bedrock, Vertex AI)
- Configurable git range analysis
- Multiple output formats

### 🛡️ **Robustness**
- Automatic tag detection
- Graceful degradation when AI processing fails
- Structured error handling

## Dependencies

- **GitHub Actions**: Core workflow execution
- **Git**: Repository analysis and change detection
- **Claude Code Action**: AI-powered changelog generation
- **Shell scripting**: Orchestration and data processing

## File Structure

```
.
├── action.yml                 # Main action definition
├── .github/workflows/
│   ├── release.yml           # Automated release workflow
│   └── test.yml              # Testing and validation
├── README.md                 # User documentation
├── ARCHITECTURE.md           # This file
└── .gitignore               # Standard ignores
```

## Future Enhancements

- [ ] Support for custom changelog templates
- [ ] Integration with more version control systems  
- [ ] Custom categorization rules
- [ ] Multi-language support for commit message analysis