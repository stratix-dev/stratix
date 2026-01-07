/**
 * Role of a message in an LLM conversation.
 */
export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

/**
 * Content of a message.
 * Can be simple text or multi-part (text + images).
 */
export type MessageContent =
  | string
  | Array<TextContent | ImageContent>;

/**
 * Text content part.
 */
export interface TextContent {
  readonly type: 'text';
  readonly text: string;
}

/**
 * Image content part.
 */
export interface ImageContent {
  readonly type: 'image';
  readonly source: ImageSource;
  readonly detail?: 'auto' | 'low' | 'high';
}

/**
 * Image source (URL or base64).
 */
export type ImageSource =
  | { type: 'url'; url: string }
  | { type: 'base64'; mediaType: string; data: string };

/**
 * Tool call from the LLM.
 */
export interface ToolCall {
  readonly id: string;
  readonly type: 'function';
  readonly function: {
    readonly name: string;
    readonly arguments: string; // JSON string
  };
}

/**
 * Tool result provided by the docorators.
 */
export interface ToolResult {
  readonly tool_call_id: string;
  readonly content: string;
}

/**
 * Message in an LLM conversation.
 *
 * Supports:
 * - Text messages (system, user, assistant)
 * - Multimodal messages (text + images)
 * - Tool calls and results
 */
export interface LLMMessage {
  readonly role: MessageRole;
  readonly content?: MessageContent;
  readonly name?: string;
  readonly tool_calls?: readonly ToolCall[];
  readonly tool_call_id?: string;
}

/**
 * Helper functions for creating LLM messages.
 */
export const LLMMessageHelpers = {
  /**
   * Create a system message.
   */
  system(content: string): LLMMessage {
    return {
      role: 'system',
      content,
    };
  },

  /**
   * Create a user message.
   */
  user(content: MessageContent, name?: string): LLMMessage {
    return {
      role: 'user',
      content,
      name,
    };
  },

  /**
   * Create an assistant message.
   */
  assistant(content: string, toolCalls?: readonly ToolCall[]): LLMMessage {
    return {
      role: 'assistant',
      content,
      tool_calls: toolCalls,
    };
  },

  /**
   * Create a tool result message.
   */
  toolResult(toolCallId: string, content: string): LLMMessage {
    return {
      role: 'tool',
      content,
      tool_call_id: toolCallId,
    };
  },

  /**
   * Create multimodal content (text + images).
   */
  multimodal(parts: Array<TextContent | ImageContent>): MessageContent {
    return parts;
  },

  /**
   * Create text content part.
   */
  text(text: string): TextContent {
    return {
      type: 'text',
      text,
    };
  },

  /**
   * Create image content from URL.
   */
  imageUrl(url: string, detail?: 'auto' | 'low' | 'high'): ImageContent {
    return {
      type: 'image',
      source: { type: 'url', url },
      detail,
    };
  },

  /**
   * Create image content from base64 data.
   */
  imageBase64(
    mediaType: string,
    data: string,
    detail?: 'auto' | 'low' | 'high'
  ): ImageContent {
    return {
      type: 'image',
      source: { type: 'base64', mediaType, data },
      detail,
    };
  },

  /**
   * Validate a message structure.
   */
  validate(message: LLMMessage): string[] {
    const errors: string[] = [];

    if (!message.role) {
      errors.push('Message role is required');
    }

    if (message.role === 'tool' && !message.tool_call_id) {
      errors.push('Tool messages must have tool_call_id');
    }

    if (message.role === 'assistant' && message.tool_calls) {
      // Validate tool calls structure
      for (const toolCall of message.tool_calls) {
        if (!toolCall.id) {
          errors.push('Tool call must have id');
        }
        if (!toolCall.function.name) {
          errors.push('Tool call must have function name');
        }
        // Validate JSON arguments
        try {
          JSON.parse(toolCall.function.arguments);
        } catch {
          errors.push(`Invalid JSON in tool call arguments: ${toolCall.function.name}`);
        }
      }
    }

    return errors;
  },

  /**
   * Check if message is valid.
   */
  isValid(message: LLMMessage): boolean {
    return LLMMessageHelpers.validate(message).length === 0;
  },

  /**
   * Extract text content from a message.
   * Handles both string and multimodal content.
   */
  extractText(message: LLMMessage): string {
    if (!message.content) {
      return '';
    }

    if (typeof message.content === 'string') {
      return message.content;
    }

    // Extract text from multimodal content
    return message.content
      .filter((part): part is TextContent => part.type === 'text')
      .map((part) => part.text)
      .join('\n');
  },

  /**
   * Count tokens in message (approximate).
   * Uses simple word-based estimation.
   */
  estimateTokens(message: LLMMessage): number {
    const text = LLMMessageHelpers.extractText(message);
    // Rough estimate: ~1.3 tokens per word
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    return Math.ceil(wordCount * 1.3);
  },
};
