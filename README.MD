<div align="center">
  <img src="assets/openagent.svg" alt="OpenAgent" width="400"/>
  
 
  
  **Professional Open-Source AI Development Assistant**
  
  *Advanced file system operations • Extensible MCP integration • Intelligent sub-agent coordination • Smart project context*
  
  [![GitHub Stars](https://img.shields.io/github/stars/RaheesAhmed/OpenAgent?style=for-the-badge&logo=github&logoColor=white)](https://github.com/RaheesAhmed/OpenAgent/stargazers)
  [![GitHub Forks](https://img.shields.io/github/forks/RaheesAhmed/OpenAgent?style=for-the-badge&logo=github&logoColor=white)](https://github.com/RaheesAhmed/OpenAgent/network)
  [![MIT License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  
  <img src="assets/Screenshot.png" alt="OpenAgent Interface" width="800"/>
  
</div>

## Overview

OpenAgent is a powerful AI development assistant that provides four core capabilities to enhance your development workflow:

- **Real File Operations**: Direct disk I/O with intelligent project understanding
- **MCP Integration**: Extensible external tool integration via Model Context Protocol
- **Sub-Agent System**: Specialized AI agents for different development domains.Read all docs for subAgents here [docs/README.MD](docs/README.MD)
- **Smart Context**: Automated project analysis with persistent memory

## Quick Start

```bash
# Clone and setup
git clone https://github.com/RaheesAhmed/OpenAgent.git
cd OpenAgent
npm install && npm run build

# Configure API key
export ANTHROPIC_API_KEY="your-api-key-here"

# Initialize and run
node ./dist/index.js
```

OpenAgent will automatically:
- ✅ Create `.openagent/` directory structure
- ✅ Generate `OPENAGENT.md` with project analysis
- ✅ Load default sub-agents (frontend, backend, devops)
- ✅ Setup intelligent file system tools

## Core Features

### 🧠 Advanced AI Agent System

**LangGraph-Powered Intelligence:**
- **ReAct Pattern**: Reasoning and Acting with tool integration
- **Multi-Step Planning**: Complex task decomposition and execution
- **Human-in-the-Loop**: Approval workflows for critical operations
- **Streaming Responses**: Real-time output with tool execution tracking
- **Cross-Thread Memory**: Persistent context across conversation threads
- **Checkpointing**: Save and restore agent states for complex workflows

### 🧠 Intelligent Memory System

**Persistent Learning & Context:**
- **SQLite-Based Storage**: Never-forget memory with intelligent retrieval
- **Context Versioning**: Track conversation history and project evolution
- **Pattern Recognition**: Learn from user preferences and coding patterns
- **Cross-Session Persistence**: Maintain context across multiple sessions
- **Memory Optimization**: Intelligent compression and relevance scoring
- **Health Monitoring**: Memory system diagnostics and optimization

### 🔍 Advanced Code Validation

**Multi-Layer Quality Assurance:**
- **Syntax Validation**: Real-time code syntax checking for multiple languages
- **Logic Analysis**: Complexity metrics and anti-pattern detection
- **Security Scanning**: OWASP compliance and vulnerability detection
- **Performance Analysis**: Scalability risk assessment and optimization suggestions
- **Hallucination Detection**: Verify file paths, dependencies, and API references
- **Quality Scoring**: Comprehensive code quality metrics and recommendations

### 💬 Rich CLI Interface

**Professional Command-Line Experience:**
- **Slash Commands**: 20+ built-in commands for project management
- **Real-time Streaming**: Beautiful output with progress indicators
- **Interactive Menus**: Intuitive navigation and selection interfaces
- **State Management**: Thread management, checkpointing, and rollback
- **File Operations**: Advanced diff, revert, and history tracking
- **Agent Management**: Sub-agent creation, editing, and deployment

## Enhanced Features

### 📁 Advanced File System Operations

Real file operations with intelligent project understanding:

```typescript
// Available file system tools
create_real_file    // Create new files with content
read_real_file      // Read file contents with encoding detection
update_real_file    // Modify existing files with diff tracking
```

**Capabilities:**
- Direct disk I/O operations
- Cross-platform compatibility (Windows, macOS, Linux)
- Intelligent caching for large codebases
- Automated dependency mapping and code relationship discovery

### 🔗 MCP (Model Context Protocol) Integration

Connect external tools and services through standardized protocol:

**Configuration** (`.openagent/mcp-servers.json`):
```json
{
  "mcpServers": {
    "filesystem-server": {
      "type": "url",
      "url": "https://your-mcp-server.com/sse",
      "name": "filesystem-mcp",
      "tool_configuration": {
        "enabled": true,
        "allowed_tools": ["read_directory", "search_files"]
      }
    }
  }
}
```

**Supported Integrations:**
- Database tools (PostgreSQL, MongoDB, Redis)
- Cloud services (AWS, GCP, Azure)
- Development tools (Git, Docker, Kubernetes)
- Custom APIs and business logic

### 🤖 Sub-Agent System

File-based specialized AI agents with domain expertise:

**Default Specialists:**

```yaml
# .openagent/agents/frontend-specialist.md
---
name: frontend-specialist
description: Expert frontend developer
tools: write_file, read_file, edit_file, execute_command, internet_search
---
Expert in React, Vue, Angular, TypeScript, CSS3, Testing frameworks
```

```yaml
# .openagent/agents/backend-specialist.md
---
name: backend-specialist
description: Expert backend developer
tools: write_file, read_file, edit_file, execute_command, internet_search
---
Expert in Node.js, Python, APIs, databases, authentication, microservices
```

```yaml
# .openagent/agents/devops-specialist.md
---
name: devops-specialist
description: Expert DevOps engineer
tools: write_file, read_file, edit_file, execute_command, internet_search
---
Expert in Docker, Kubernetes, CI/CD, infrastructure as code, monitoring
```

### 📋 OPENAGENT.md Context

Smart project context file that provides persistent memory:

**Automatically Generated Content:**
- Project overview and architecture analysis
- Complete dependency mapping
- Coding patterns and conventions
- Project-specific rules and guidelines
- File structure and entry points

**Living Documentation:**
- Updates with project evolution
- Learns coding patterns over time
- Maintains context across sessions
- Provides intelligent assistance based on project knowledge

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       OpenAgent CLI                         │
├─────────────────────────────────────────────────────────────┤
│  📁 File System    │ 🔗 MCP Integration │ 🤖 Sub-Agents    │
├─────────────────────────────────────────────────────────────┤
│                   📋 OPENAGENT.md Context                   │
├─────────────────────────────────────────────────────────────┤
│                Deep Agent (LangGraph Core)                  │
├─────────────────────────────────────────────────────────────┤
│                    Claude API / Other LLMs                  │
└─────────────────────────────────────────────────────────────┘
```

**Data Flow:**
```
User Input → CLI → File System Analysis → MCP Tool Loading →
Sub-Agent Selection → OPENAGENT.md Context → Deep Agent Execution →
Real-time Streaming → User Interface
```

## Project Analysis Tools

OpenAgent includes powerful project analysis capabilities:

```typescript
// Core Analysis
analyze_project           // Complete project structure analysis
get_project_overview     // High-level architecture summary
get_folder_contents      // Directory exploration with metadata

// Dependency Intelligence
get_file_dependencies    // Files that a specific file imports
get_file_dependents      // Files that depend on a specific file
get_related_files        // Complete file relationship mapping

// Code Discovery
find_files_by_export     // Locate where functions/classes are defined
find_files_by_import     // Find files using specific modules
get_file_info           // Detailed file analysis (exports, imports, dependencies)
```

## Comprehensive Tool Reference

OpenAgent provides three categories of powerful tools for comprehensive development assistance:

### 🧠 Project Analysis Tools (`projectTools.ts`)

**Core Analysis:**
- **`analyze_project`** - Complete project structure analysis with dependency graphs and performance metrics
- **`get_project_overview`** - High-level project summary with key files, metrics, and architecture insights
- **`get_file_info`** - Detailed file metadata including exports, imports, size, and relationships
- **`get_folder_contents`** - Smart directory analysis with file metadata and structure mapping

**Dependency Intelligence:**
- **`get_file_dependencies`** - Find all files that a specific file imports from (incoming dependencies)
- **`get_file_dependents`** - Find all files that depend on a specific file (outgoing dependencies)
- **`get_related_files`** - Get complete bidirectional relationship map for any file
- **`find_files_by_export`** - Locate all files that export specific functions, classes, or variables
- **`find_files_by_import`** - Find all files that import from a specific module or library

**Cache Management:**
- **`clear_project_cache`** - Force fresh analysis by clearing cached project data

### 📁 Real File System Tools (`fileTools.ts`)

**Direct Disk Operations:**
- **`create_real_file`** - Create actual files on filesystem with automatic directory creation
- **`read_real_file`** - Read file contents with optional line ranges and numbered output
- **`update_real_file`** - Smart text replacement with single or global replace options
- **`list_real_directory`** - Directory listing with recursive scanning and file type detection
- **`create_real_directory`** - Create directory structures on filesystem with recursive support

**Key Capabilities:**
- ✅ Direct disk I/O operations (not virtual files)
- ✅ Cross-platform compatibility (Windows, macOS, Linux)
- ✅ Intelligent error handling and validation
- ✅ Line-range reading for large files
- ✅ Recursive directory operations

### 📚 Context Management Tools (`openAgentContextTool.ts`)

**Smart Context Generation:**
- **`init_openagent_context`** - Generate comprehensive `OPENAGENT.md` with complete project analysis
- **`get_project_context`** - Retrieve current project understanding, rules, and learned patterns
- **`get_path_context`** - Get targeted context for specific files or directories
- **`add_context_instruction`** - Add custom rules, conventions, and project-specific instructions
- **`update_context_file`** - Maintain and update project context files dynamically

**Context Features:**
- 🧠 **Persistent Memory**: Maintains understanding across sessions
- 📖 **Living Documentation**: Updates automatically as project evolves
- 🎯 **Targeted Context**: Path-specific context for focused assistance
- ⚙️ **Custom Rules**: Project-specific conventions and guidelines
- 🔄 **Dynamic Updates**: Real-time context synchronization

## Tool Integration Examples

**Project Discovery:**
```typescript
// Analyze complete project structure
await analyze_project({ projectPath: "." })

// Find all React components
await find_files_by_export({ exportName: "Component" })

// Track dependencies for a specific file
await get_file_dependencies({ filePath: "src/App.tsx" })
```

**Smart File Operations:**
```typescript
// Create file with intelligent directory creation
await create_real_file({
  file_path: "src/components/NewComponent.tsx",
  content: "import React from 'react'..."
})

// Read specific lines from large files
await read_real_file({
  file_path: "package.json",
  start_line: 1,
  end_line: 20
})
```

**Context Management:**
```typescript
// Initialize project context
await init_openagent_context({ projectPath: "." })

// Add custom project rule
await add_context_instruction({
  instruction: "Always use functional components with hooks",
  section: "react-conventions"
})

// Get context for specific component
await get_path_context({ targetPath: "src/components/" })
```

## Configuration

### Main Configuration (`.openagent/config.json`)
```json
{
  "model": "anthropic:claude-3-5-sonnet-20241022",
  "temperature": 0.1,
  "maxTokens": 4000,
  "memoryEnabled": true,
  "streamingEnabled": true
}
```

### MCP Servers (`.openagent/mcp-servers.json`)
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/allowed/path"]
    }
  }
}
```

## Comprehensive Slash Commands

OpenAgent provides 20+ professional slash commands for complete project management:

### Session Commands
- `/help` - Show available commands
- `/status` - Display agent metrics  
- `/reset` - Clear conversation history
- `/new` - Create new thread

### Development Commands
- `/revert [n]` - Undo last n operations
- `/diff [file]` - Show file changes
- `/checkpoint create <name>` - Save project state
- `/checkpoint restore <name>` - Restore project state

## Performance Metrics

- **Analysis Speed**: Complete project analysis in 2-3 seconds
- **Memory Usage**: ~12KB during analysis, minimal footprint
- **Cache Hit Rate**: 80%+ for frequently accessed content
- **Token Optimization**: 40%+ savings through intelligent compression
- **Scalability**: Handles projects from small scripts to enterprise codebases (1000+ files)

## Additional Advanced Features

### 🧠 Intelligent Memory System
- **SQLite-Based Storage**: Never-forget memory with intelligent retrieval
- **Context Versioning**: Track conversation history and project evolution
- **Pattern Recognition**: Learn from user preferences and coding patterns
- **Cross-Session Persistence**: Maintain context across multiple sessions
- **Memory Optimization**: Intelligent compression and relevance scoring

### 🔍 Advanced Code Validation
- **Syntax Validation**: Real-time code syntax checking for multiple languages
- **Logic Analysis**: Complexity metrics and anti-pattern detection
- **Security Scanning**: OWASP compliance and vulnerability detection
- **Performance Analysis**: Scalability risk assessment and optimization suggestions
- **Hallucination Detection**: Verify file paths, dependencies, and API references

### 💬 Rich CLI Interface
- **20+ Slash Commands**: Complete project management from command line
- **Real-time Streaming**: Beautiful output with progress indicators
- **Interactive Menus**: Intuitive navigation and selection interfaces
- **State Management**: Thread management, checkpointing, and rollback
- **File Operations**: Advanced diff, revert, and history tracking

### 🔧 Terminal Integration
- **Command Execution**: Run system commands directly from OpenAgent
- **Process Management**: Handle long-running processes with proper cleanup
- **Cross-Platform Support**: Works on Windows, macOS, and Linux
- **Environment Variables**: Access and modify environment variables

## Development

### Building from Source
```bash
git clone https://github.com/RaheesAhmed/OpenAgent.git
cd OpenAgent
npm install
npm run build
npm run dev      # Development with watch mode
npm test         # Run test suite
```

### Project Structure
```
src/
├── agents/          # Core agent implementation
├── cli/            # Command-line interface
├── core/           # Analysis engine, memory, validation
├── tools/          # Built-in tool implementations
└── types/          # TypeScript definitions
```

### Adding Custom Tools
1. Implement tool in `src/tools/`
2. Export in `src/tools/index.ts`
3. Add to agent tool list in `src/agents/OpenAgent.ts`

### Creating Custom Agents
Add markdown files to `.openagent/agents/`:

```yaml
---
name: database-specialist
description: Expert in database design and optimization
tools: write_file, read_file, execute_command, internet_search
---

You are a database expert specializing in:
- SQL query optimization and indexing strategies
- Database schema design and normalization
- Performance monitoring and tuning
- Backup and disaster recovery planning
```

## Requirements

- **Node.js** 18 or higher
- **Anthropic API Key** for Claude AI access
- **Git** (recommended for version control)

## Technical Details

- **Runtime**: Node.js with ES modules
- **Language**: TypeScript with strict typing
- **AI Framework**: LangChain/LangGraph with ReAct pattern
- **Storage**: SQLite for persistent memory
- **Analysis**: TypeScript AST parsing with regex fallbacks

## Contributing

We welcome contributions to OpenAgent! This is an open source project that thrives on community involvement.

### 🚀 Quick Start for Contributors

We welcome contributions to OpenAgent:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed development guidelines.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support & Documentation

- **Issues**: [GitHub Issues](https://github.com/RaheesAhmed/OpenAgent/issues)
- **Features**: [Request Features](https://github.com/RaheesAhmed/OpenAgent/issues/new)
- **Documentation**: [Project Wiki](https://github.com/RaheesAhmed/OpenAgent/wiki)
- **Code Summary**: [CODE_SUMMERY.md](CODE_SUMMERY.md)

---

<div align="center">
  <strong>OpenAgent - Empowering intelligent development workflows</strong>
</div>