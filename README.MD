<div align="center">
  <img src="assets/openclaude.svg" alt="OpenClaude Logo" width="256" height="256"/>
  
  <p><strong>Advanced open-source AI development assistant inspired by Claude Code</strong></p>
  
  <p>
    <a href="https://github.com/RaheesAhmed/open-claude/stargazers"><img src="https://img.shields.io/github/stars/RaheesAhmed/open-claude?style=flat-square" alt="Stars"></a>
    <a href="https://github.com/RaheesAhmed/open-claude/network/members"><img src="https://img.shields.io/github/forks/RaheesAhmed/open-claude?style=flat-square" alt="Forks"></a>
    <a href="https://github.com/RaheesAhmed/open-claude/issues"><img src="https://img.shields.io/github/issues/RaheesAhmed/open-claude?style=flat-square" alt="Issues"></a>
    <a href="https://github.com/RaheesAhmed/open-claude/blob/main/LICENSE"><img src="https://img.shields.io/github/license/RaheesAhmed/open-claude?style=flat-square" alt="MIT License"></a>
  </p>
  
  <p>UNDER ACTIVE DEVELOPMENT</p>
</div>

## About Claude Code vs OpenClaude

**Claude Code** is Anthropic's official terminal-based AI coding assistant launched in February 2025. It operates as an autonomous agent powered by Claude Opus 4.1 and Sonnet 4 models, providing deep codebase awareness and the ability to edit files and run commands directly in your terminal environment.

**OpenClaude** is our open-source implementation inspired by Claude Code's capabilities, designed to provide similar functionality with additional customization options and transparent architecture.

## Features

### Core Capabilities
- **Terminal-Based Operation**: Command-line AI assistant that integrates with your existing development workflow
- **Autonomous Code Generation**: AI agent that can understand requirements and implement solutions across multiple files
- **Deep Codebase Awareness**: Comprehensive understanding of project structure, dependencies, and coding patterns
- **File System Operations**: Read, create, edit, and delete files with intelligent content handling
- **Command Execution**: Run terminal commands, tests, and build scripts through natural language instructions
- **Version Control Integration**: Git operations including commits, branches, and pull request management

### Advanced Features
- **MCP Server Integration**: Extensible through Model Context Protocol servers for additional tools and services
- **Custom Project Rules**: Per-project configuration via `.openclaude/rules.md` for coding standards and preferences
- **Multi-file Coordination**: Make coordinated changes across multiple files while maintaining consistency
- **GitHub Integration**: Direct interaction with GitHub for issues, PRs, and repository management
- **Security Scanning**: Automated security review capabilities for code vulnerability detection
- **Context Optimization**: Intelligent context management to minimize token usage and API costs

## Quick Start

### Prerequisites
- Node.js 18.0.0 or higher
- Anthropic API key

### Installation

1. **Clone Repository**
```bash
git clone https://github.com/RaheesAhmed/open-claude.git
cd open-claude
```

2. **Install Dependencies**
```bash
npm install
```

3. **Build Project**
```bash
npm run build
```

4. **Set API Key**
```bash
export ANTHROPIC_API_KEY="your-api-key-here"
```

5. **Run OpenClaude**
```bash
node ./dist/index.js
```

### Development Mode
```bash
npm run dev
```

## Project Structure

```
src/
├── agents/              # AI agent management and processing
│   ├── AgentManager.ts  # Agent lifecycle management
│   └── MainAgent.ts     # Core AI agent implementation
├── cli/                 # Command-line interface
│   ├── index.ts         # Main CLI entry point
│   ├── commands/        # Command implementations
│   └── interface/       # UI components and styling
├── core/                # Core system components
│   ├── setup/           # Project initialization
│   ├── tokens/          # Token counting and cost analysis
│   ├── memory/          # Context and memory management
│   ├── optimization/    # Performance optimizations
│   └── security/        # Security and encryption
├── tools/               # File system and terminal tools
│   ├── read_file.ts     # File reading with range support
│   ├── create_file.ts   # File creation with overwrite protection
│   ├── search_replace.ts# Text search and replacement
│   ├── delete_file.ts   # Safe file deletion
│   ├── list_directory.ts# Directory listing with details
│   ├── terminal.ts      # Terminal command execution
│   └── executor.ts      # Tool orchestration
├── types/               # TypeScript type definitions
├── prompts/             # System prompts and instructions
├── mcp/                 # Model Context Protocol integration
└── utils/               # Utility functions
```

## Configuration

### Project Initialization
OpenClaude automatically creates a `.openclaude/` directory with:

- **`config.json`**: Main project configuration
- **`rules.md`**: Custom project-specific rules and guidelines
- **`mcp-servers.json`**: MCP server configuration for additional tools

### Environment Variables
- `ANTHROPIC_API_KEY`: Required Anthropic API key
- `NODE_ENV`: Set to `development` for verbose error logging

### Custom Rules
Edit `.openclaude/rules.md` to add project-specific instructions:

```markdown
# Project Rules
- Use TypeScript for all new files
- Follow existing code patterns
- Include comprehensive error handling
- Write tests for new functionality
```

### MCP Servers
Configure additional tools via `.openclaude/mcp-servers.json`:

```json
{
  "mcpServers": {
    "example-server": {
      "type": "url",
      "url": "https://api.example.com/mcp",
      "name": "example-mcp",
      "tool_configuration": {
        "enabled": true,
        "allowed_tools": ["tool1", "tool2"]
      }
    }
  }
}
```

## Available Commands

### File Operations
- **Read files**: View file contents with optional line ranges
- **Create files**: Generate new files with content
- **Edit files**: Search and replace text within files
- **Delete files**: Remove files with confirmation
- **List directories**: Browse directory contents with details

### Terminal Integration
- Execute any terminal command
- View command output and error streams
- Support for long-running processes

### Web Search
- Search current documentation and information
- Access real-time web content
- Verify and cross-reference information

## Usage Examples

### Basic Development Tasks
```
You: Create a React component for user authentication
```

### File Operations
```
You: Read the package.json file and show me the dependencies
```

### Complex Workflows
```
You: Set up a new Express.js API with TypeScript, including error handling and logging
```

### File Attachment with @
```
You: @ Please review these components and suggest improvements
```
*Opens interactive file picker to select multiple files*

### Debugging Assistance
```
You: Help me debug this TypeScript error in src/components/Header.tsx
```

## API Integration

### Supported Models
- **claude-sonnet-4-20250514**: Balanced performance and cost
- **claude-opus-4-20250514**: Maximum capability for complex tasks

### Token Management
- Real-time cost tracking
- Usage optimization algorithms
- Transparent pricing information
- Context compression for efficiency

## Development

### Available Scripts
- `npm run build`: Compile TypeScript  
- `npm run dev`: Development mode with ts-node

### Code Quality
- TypeScript with strict configuration
- ESLint setup for code quality
- Jest testing framework
- Modular architecture design

## Contributing

We welcome contributions! Here's how to get started:

### Development Setup
1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/open-claude.git`
3. Install dependencies: `npm install`
4. Create a branch: `git checkout -b feature-name`
5. Make your changes and test thoroughly
6. Submit a pull request with detailed description

### Guidelines
- Follow existing code patterns and TypeScript conventions
- Add tests for new functionality
- Update documentation as needed
- Ensure all tests pass before submitting

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for full details.


## Support

- **Issues**: [GitHub Issues](https://github.com/RaheesAhmed/open-claude/issues)
- **Discussions**: [GitHub Discussions](https://github.com/RaheesAhmed/open-claude/discussions)

---

<div align="center">
  <p><strong>OpenClaude</strong> - Professional AI development assistant for modern software development</p>
  <p>⭐ Star us on GitHub if you find this project useful!</p>
</div>
