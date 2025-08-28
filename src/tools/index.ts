// File System Tools
export * from './read_file.js';
export * from './create_file.js';
export * from './search_replace.js';
export * from './delete_file.js';
export * from './list_directory.js';

// Terminal Tools
export * from './terminal.js';

// Tool Definitions Export
import { readFileToolDefinition } from './read_file.js';
import { createFileToolDefinition } from './create_file.js';
import { searchReplaceToolDefinition } from './search_replace.js';
import { deleteFileToolDefinition } from './delete_file.js';
import { listDirectoryToolDefinition } from './list_directory.js';
import { terminalToolDefinition } from './terminal.js';

export const allToolDefinitions = [
  readFileToolDefinition,
  createFileToolDefinition,
  searchReplaceToolDefinition,
  deleteFileToolDefinition,
  listDirectoryToolDefinition,
  terminalToolDefinition
];

export const toolDefinitionMap = {
  read_file: readFileToolDefinition,
  create_file: createFileToolDefinition,
  search_replace: searchReplaceToolDefinition,
  delete_file: deleteFileToolDefinition,
  list_directory: listDirectoryToolDefinition,
  terminal: terminalToolDefinition
};