# OPENAGENT.MD
*OpenAgent Project Context - Auto-generated on 2025-09-06T21:12:16.922Z*

## Project Overview
Project: openagent
Description: open-source AI development assistant
Version: 1.0.0


## Tech Stack
- Node.js (detected)

## Architecture
Based on project structure analysis:
- Total files: 98
- Main directories: 13
- Dependencies analyzed: 30

This appears to be a TypeScript/Node.js project.

## Commands
- build: tsc
- build:watch: tsc --watch
- start: node dist/cli/index.js
- dev: ts-node-esm src/cli/index.ts
- test: jest --passWithNoTests
- test:watch: jest --watch
- lint: eslint src/**/*.ts
- lint:fix: eslint src/**/*.ts --fix
- clean: rimraf dist

## File Structure
- .openagent/: Project directory
- assets/: Project assets
- ClaudeCode-Docs/: Project directory
- langgraph/: Project directory
- src/: Main source code

## Code Style
- Follow project's existing patterns
- Use TypeScript where applicable
- Write comprehensive tests
- Maintain consistent naming conventions

## Workflow
- Analyze before implementing changes
- Run tests after modifications
- Update documentation when needed
- Follow git best practices

## Rules
- Never modify core configuration without explicit instruction
- Always validate changes before committing
- Prioritize code readability and maintainability
- Follow security best practices

## Testing Strategy
No testing framework detected. Consider adding Jest or Vitest.

## Critical Files
- package.json: Project dependencies and scripts
- tsconfig.json: TypeScript configuration
- README.md: Project documentation
- .gitignore: Git ignore patterns
- src/index.ts: Main entry point
- src/main.ts: Application entry point

## Custom Instructions
- Maintain compatibility with existing codebase
- Consider performance implications
- Update this file when project structure changes
