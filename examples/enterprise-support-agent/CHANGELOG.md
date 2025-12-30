# Changelog

## [1.0.0] - 2025-12-24

### Fixed
- Corrected ToolRegistry API usage:
  - Changed `listTools()` to `listAll()`
  - Changed `getTool(name)` to `get(name)`
  - Changed tool definitions to use `getDefinitions()`

- Fixed TokenUsage interface compatibility:
  - Changed `inputTokens` to `promptTokens`
  - Changed `outputTokens` to `completionTokens`

- Fixed AgentMessage interface:
  - Removed unsupported 'tool' role
  - Removed `toolCalls` property from messages
  - Implemented tool results via user messages instead

- Fixed tool execution flow:
  - Corrected executeTools signature to accept ChatResponse
  - Implemented proper tool result formatting
  - Added two-step LLM call for tool usage (tool execution + final response)

- Created MockLLMProvider for tests:
  - Implemented full LLMProvider interface
  - Added proper streamChat as async generator
  - Fixed embeddings method signature

- Fixed test expectations:
  - Created separate context instances for different mock responses
  - Adjusted domain event assertions
  - All 20 tests now passing

### Technical Details

The main changes ensure compatibility with the Stratix framework's actual API:

1. **ToolRegistry Methods**: The framework uses `listAll()` and `get()` instead of `listTools()` and `getTool()`
2. **Token Usage**: Uses `promptTokens`/`completionTokens` naming convention
3. **Tool Calling**: Implemented as a two-step process (execute tools + generate response) due to AgentMessage constraints
4. **Testing**: Created proper mock provider implementing the full LLMProvider interface

All TypeScript errors resolved and all tests passing (20/20).
