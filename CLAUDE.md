# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Build & Development
```bash
# Build the main package
npm run build

# Build and watch for changes
npm run watch

# Clean build artifacts
npm run clean

# Build the extension (in extension/ directory)
cd extension && npm run build
```

### Testing
```bash
# Run all tests
npm test

# Run tests for specific browser
npm run ctest  # Chrome
npm run ftest  # Firefox  
npm run wtest  # WebKit

# Run specific test file
npx playwright test tests/core.spec.ts

# Run tests with specific browser project
npx playwright test --project=chrome
```

### Linting & Type Checking
```bash
# Lint and typecheck (includes README update)
npm run lint

# Fix linting issues
npm run lint-fix

# Type checking only
tsc --noEmit
```

### Publishing
```bash
# Run the MCP server locally
npm run run-server

# Full publish flow (clean, build, test, publish)
npm run npm-publish
```

## Architecture Overview

### Core Structure
This is a Model Context Protocol (MCP) server that provides browser automation via Playwright. The codebase consists of:

1. **MCP Server Implementation** (`src/mcp/`)
   - `server.ts`: Main MCP server with tool registration
   - `serverStdio.ts`: STDIO transport implementation  
   - `serverSSE.ts`: SSE/HTTP transport implementation

2. **Browser Management** (`src/`)
   - `browserContextFactory.ts`: Creates and manages browser contexts
   - `context.ts`: Wrapper around Playwright context with MCP-specific features
   - `browserServerBackend.ts`: Backend logic for browser operations

3. **Tool System** (`src/loopTools/`)
   - Each tool (click, navigate, snapshot, etc.) is a separate module
   - Tools implement the `Tool` interface with validation and execution logic
   - Tools use Zod schemas for input validation

4. **Extension** (`extension/`)
   - Browser extension for enhanced automation capabilities
   - Separate TypeScript config and build process
   - UI components in `src/ui/`

### Key Design Patterns

1. **Tool Registration**: Tools are dynamically registered in the MCP server based on capabilities
2. **Context Management**: Browser contexts can be persistent (with profile) or isolated
3. **Transport Modes**: Supports both STDIO (for direct CLI) and SSE (for HTTP server mode)
4. **Accessibility-First**: Uses Playwright's accessibility tree instead of screenshots for element interaction

### Testing Approach

- Tests use custom fixtures defined in `tests/fixtures.ts`
- Each test spawns an MCP server instance to test against
- Tests are parallelized and support multiple browser configurations
- Browser projects: chrome, msedge, chromium, firefox, webkit

### Configuration System

The server accepts configuration through:
1. Command-line arguments (parsed in `src/program.ts`)
2. JSON config file (loaded via `--config`)
3. Environment variables for profile locations

Configuration schema includes browser settings, capabilities, network restrictions, and output options.

## Development Guidelines

### Import Style
- Always use `.js` extension for TypeScript imports (per ESLint config)
- Order imports: builtin → external → internal → parent/sibling → type imports

### Error Handling
- Tools return structured responses with success/error states
- Browser errors are caught and returned as tool errors
- Network failures and timeouts are handled gracefully

### Type Safety
- Strict TypeScript configuration
- Zod schemas for runtime validation of tool inputs
- Explicit typing for MCP protocol messages