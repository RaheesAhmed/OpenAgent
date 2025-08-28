<div align="center">
  <h1>🤖 OpenClaude</h1>
  
  <p><strong>Advanced open-source AI development assistant</strong></p>
  
  <p>
    <a href="https://github.com/RaheesAhmed/open-claude/stargazers"><img src="https://img.shields.io/github/stars/RaheesAhmed/open-claude?style=flat-square" alt="Stars"></a>
    <a href="https://github.com/RaheesAhmed/open-claude/network/members"><img src="https://img.shields.io/github/forks/RaheesAhmed/open-claude?style=flat-square" alt="Forks"></a>
    <a href="https://github.com/RaheesAhmed/open-claude/issues"><img src="https://img.shields.io/github/issues/RaheesAhmed/open-claude?style=flat-square" alt="Issues"></a>
    <a href="https://github.com/RaheesAhmed/open-claude/blob/main/LICENSE"><img src="https://img.shields.io/github/license/RaheesAhmed/open-claude?style=flat-square" alt="License"></a>
  </p>
  
  <p>Built with TypeScript and the Anthropic SDK • Intelligent code assistance • File operations • Terminal integration • Web search capabilities</p>
</div>

## Features

### Core Capabilities
- **Interactive Chat Interface**: Real-time streaming responses with professional CLI styling
- **File System Operations**: Read, create, edit, and delete files with intelligent content handling
- **Terminal Integration**: Execute commands directly from the chat interface
- **Web Search**: Real-time web search for current documentation and information
- **Cost Tracking**: Transparent token usage and cost calculation
- **Project Context**: Automatic project structure analysis and memory persistence

### Advanced Features
- **MCP Server Integration**: Extensible through Model Context Protocol servers
- **Custom Project Rules**: Per-project configuration via `.openclaude/rules.md`
- **Token Optimization**: Intelligent context management to minimize API costs
- **Streaming Responses**: Real-time output with tool execution feedback
- **Error Recovery**: Robust error handling with graceful degradation
- **Security**: Local API key storage with encryption

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
- `npm run build:watch`: Watch mode compilation
- `npm run dev`: Development mode with ts-node
- `npm run start`: Run compiled version
- `npm run test`: Run Jest tests
- `npm run test:watch`: Watch mode testing
- `npm run lint`: ESLint code checking
- `npm run lint:fix`: Auto-fix ESLint issues
- `npm run clean`: Remove dist directory

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

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/RaheesAhmed/open-claude/issues)
- **Discussions**: [GitHub Discussions](https://github.com/RaheesAhmed/open-claude/discussions)

---

<div align="center">
  <p><strong>OpenClaude</strong> - Professional AI development assistant for modern software development</p>
  <p>⭐ Star us on GitHub if you find this project useful!</p>
</div>
