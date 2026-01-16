import { describe, it, expect } from 'vitest';
import { LLMMessageHelpers, type LLMMessage, type ToolCall } from '../LLMMessage.js';

describe('LLMMessageHelpers', () => {
  describe('system', () => {
    it('should create system message', () => {
      const message = LLMMessageHelpers.system('You are a helpful assistant');

      expect(message.role).toBe('system');
      expect(message.content).toBe('You are a helpful assistant');
    });
  });

  describe('user', () => {
    it('should create user message with text', () => {
      const message = LLMMessageHelpers.user('Hello, world!');

      expect(message.role).toBe('user');
      expect(message.content).toBe('Hello, world!');
    });

    it('should create user message with name', () => {
      const message = LLMMessageHelpers.user('Hello!', 'Alice');

      expect(message.role).toBe('user');
      expect(message.content).toBe('Hello!');
      expect(message.name).toBe('Alice');
    });

    it('should create user message with multimodal content', () => {
      const content = [
        LLMMessageHelpers.text('What is in this image?'),
        LLMMessageHelpers.imageUrl('https://example.com/image.jpg')
      ];

      const message = LLMMessageHelpers.user(content);

      expect(message.role).toBe('user');
      expect(Array.isArray(message.content)).toBe(true);
      expect((message.content as any).length).toBe(2);
    });
  });

  describe('assistant', () => {
    it('should create assistant message', () => {
      const message = LLMMessageHelpers.assistant('Hello! How can I help you?');

      expect(message.role).toBe('assistant');
      expect(message.content).toBe('Hello! How can I help you?');
    });

    it('should create assistant message with tool calls', () => {
      const toolCalls: ToolCall[] = [
        {
          id: 'call_123',
          type: 'function',
          function: {
            name: 'get_weather',
            arguments: '{"location":"London"}'
          }
        }
      ];

      const message = LLMMessageHelpers.assistant('', toolCalls);

      expect(message.role).toBe('assistant');
      expect(message.tool_calls).toEqual(toolCalls);
    });
  });

  describe('toolResult', () => {
    it('should create tool result message', () => {
      const message = LLMMessageHelpers.toolResult('call_123', '{"temperature": 72}');

      expect(message.role).toBe('tool');
      expect(message.tool_call_id).toBe('call_123');
      expect(message.content).toBe('{"temperature": 72}');
    });
  });

  describe('multimodal content', () => {
    it('should create text content part', () => {
      const part = LLMMessageHelpers.text('Hello');

      expect(part.type).toBe('text');
      expect(part.text).toBe('Hello');
    });

    it('should create image from URL', () => {
      const part = LLMMessageHelpers.imageUrl('https://example.com/image.jpg', 'high');

      expect(part.type).toBe('image');
      expect(part.source.type).toBe('url');
      expect((part.source as any).url).toBe('https://example.com/image.jpg');
      expect(part.detail).toBe('high');
    });

    it('should create image from base64', () => {
      const part = LLMMessageHelpers.imageBase64('image/png', 'base64data', 'low');

      expect(part.type).toBe('image');
      expect(part.source.type).toBe('base64');
      expect((part.source as any).mediaType).toBe('image/png');
      expect((part.source as any).data).toBe('base64data');
      expect(part.detail).toBe('low');
    });

    it('should create multimodal content', () => {
      const parts = LLMMessageHelpers.multimodal([
        LLMMessageHelpers.text('Describe this'),
        LLMMessageHelpers.imageUrl('https://example.com/img.jpg')
      ]);

      expect(Array.isArray(parts)).toBe(true);
      expect(parts.length).toBe(2);
    });
  });

  describe('validate', () => {
    it('should validate correct message', () => {
      const message = LLMMessageHelpers.user('Hello');

      const errors = LLMMessageHelpers.validate(message);

      expect(errors).toEqual([]);
    });

    it('should reject message without role', () => {
      const message = { content: 'Hello' } as LLMMessage;

      const errors = LLMMessageHelpers.validate(message);

      expect(errors).toContain('Message role is required');
    });

    it('should reject tool message without tool_call_id', () => {
      const message: LLMMessage = {
        role: 'tool',
        content: 'result'
      };

      const errors = LLMMessageHelpers.validate(message);

      expect(errors).toContain('Tool messages must have tool_call_id');
    });

    it('should validate tool calls structure', () => {
      const message: LLMMessage = {
        role: 'assistant',
        content: '',
        tool_calls: [
          {
            id: '',
            type: 'function',
            function: {
              name: '',
              arguments: '{}'
            }
          }
        ]
      };

      const errors = LLMMessageHelpers.validate(message);

      expect(errors).toContain('Tool call must have id');
      expect(errors).toContain('Tool call must have function name');
    });

    it('should reject invalid JSON in tool arguments', () => {
      const message: LLMMessage = {
        role: 'assistant',
        content: '',
        tool_calls: [
          {
            id: 'call_1',
            type: 'function',
            function: {
              name: 'test',
              arguments: 'invalid json'
            }
          }
        ]
      };

      const errors = LLMMessageHelpers.validate(message);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Invalid JSON');
    });
  });

  describe('isValid', () => {
    it('should return true for valid message', () => {
      const message = LLMMessageHelpers.user('Hello');

      expect(LLMMessageHelpers.isValid(message)).toBe(true);
    });

    it('should return false for invalid message', () => {
      const message = { content: 'Hello' } as LLMMessage;

      expect(LLMMessageHelpers.isValid(message)).toBe(false);
    });
  });

  describe('extractText', () => {
    it('should extract text from string content', () => {
      const message = LLMMessageHelpers.user('Hello, world!');

      const text = LLMMessageHelpers.extractText(message);

      expect(text).toBe('Hello, world!');
    });

    it('should extract text from multimodal content', () => {
      const message = LLMMessageHelpers.user([
        LLMMessageHelpers.text('First line'),
        LLMMessageHelpers.imageUrl('https://example.com/img.jpg'),
        LLMMessageHelpers.text('Second line')
      ]);

      const text = LLMMessageHelpers.extractText(message);

      expect(text).toBe('First line\nSecond line');
    });

    it('should return empty string for message without content', () => {
      const message: LLMMessage = {
        role: 'assistant'
      };

      const text = LLMMessageHelpers.extractText(message);

      expect(text).toBe('');
    });
  });

  describe('estimateTokens', () => {
    it('should estimate tokens for simple message', () => {
      const message = LLMMessageHelpers.user('Hello world');

      const tokens = LLMMessageHelpers.estimateTokens(message);

      // 2 words * 1.3 = 2.6, rounded up = 3
      expect(tokens).toBe(3);
    });

    it('should estimate tokens for longer message', () => {
      const message = LLMMessageHelpers.user('The quick brown fox jumps over the lazy dog');

      const tokens = LLMMessageHelpers.estimateTokens(message);

      // 9 words * 1.3 = 11.7, rounded up = 12
      expect(tokens).toBe(12);
    });

    it('should estimate tokens for multimodal content', () => {
      const message = LLMMessageHelpers.user([
        LLMMessageHelpers.text('Hello'),
        LLMMessageHelpers.text('World')
      ]);

      const tokens = LLMMessageHelpers.estimateTokens(message);

      // 2 words * 1.3 = 2.6, rounded up = 3
      expect(tokens).toBe(3);
    });
  });

  describe('conversation building', () => {
    it('should build multi-turn conversation', () => {
      const conversation: LLMMessage[] = [
        LLMMessageHelpers.system('You are a helpful assistant'),
        LLMMessageHelpers.user('What is the weather in London?'),
        LLMMessageHelpers.assistant('', [
          {
            id: 'call_1',
            type: 'function',
            function: {
              name: 'get_weather',
              arguments: '{"location":"London"}'
            }
          }
        ]),
        LLMMessageHelpers.toolResult('call_1', '{"temperature":72,"condition":"sunny"}'),
        LLMMessageHelpers.assistant('The weather in London is 72°F and sunny.')
      ];

      expect(conversation.length).toBe(5);
      expect(conversation[0].role).toBe('system');
      expect(conversation[1].role).toBe('user');
      expect(conversation[2].role).toBe('assistant');
      expect(conversation[3].role).toBe('tool');
      expect(conversation[4].role).toBe('assistant');
    });
  });
});
