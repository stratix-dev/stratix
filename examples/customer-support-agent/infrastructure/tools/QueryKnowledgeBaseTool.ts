import { AgentTool, type ToolDefinition } from '@stratix/core';

interface KnowledgeBaseQuery {
  query: string;
  category?: 'billing' | 'technical' | 'general' | 'complaint';
}

interface KnowledgeBaseResult {
  articles: Array<{
    id: string;
    title: string;
    content: string;
    relevance: number;
  }>;
  count: number;
}

/**
 * Tool for searching the knowledge base
 */
export class QueryKnowledgeBaseTool extends AgentTool<
  KnowledgeBaseQuery,
  KnowledgeBaseResult
> {
  readonly name = 'query_knowledge_base';
  readonly description = 'Search the knowledge base for relevant articles and solutions';
  readonly requiresApproval = false;

  // Mock knowledge base articles
  private articles = [
    {
      id: 'kb-001',
      title: 'How to Request a Refund',
      content:
        'To request a refund, please contact our support team with your order number. Refunds are processed within 5-7 business days.',
      category: 'billing',
    },
    {
      id: 'kb-002',
      title: 'Troubleshooting App Crashes',
      content:
        'If the app crashes, try: 1) Clear app cache, 2) Restart your device, 3) Update to the latest version, 4) Reinstall the app.',
      category: 'technical',
    },
    {
      id: 'kb-003',
      title: 'Understanding Your Bill',
      content:
        'Your bill includes the product price, shipping fees, and applicable taxes. Charges appear as "COMPANY NAME" on your statement.',
      category: 'billing',
    },
    {
      id: 'kb-004',
      title: 'Photo Upload Issues',
      content:
        'Photo upload problems are usually caused by: 1) Poor internet connection, 2) File size too large (max 10MB), 3) Unsupported format. Supported formats: JPG, PNG, HEIC.',
      category: 'technical',
    },
  ];

  async execute(input: KnowledgeBaseQuery): Promise<KnowledgeBaseResult> {
    const queryLower = input.query.toLowerCase();
    const keywords = queryLower.split(' ');

    let results = this.articles.map((article) => {
      let score = 0;

      // Category match
      if (input.category && article.category === input.category) {
        score += 10;
      }

      // Title and content matching
      const searchText = `${article.title} ${article.content}`.toLowerCase();
      keywords.forEach((keyword) => {
        if (searchText.includes(keyword)) {
          score += 1;
        }
      });

      return { ...article, relevance: score };
    });

    // Filter and sort by relevance
    results = results.filter((article) => article.relevance > 0);
    results.sort((a, b) => b.relevance - a.relevance);

    const topResults = results.slice(0, 3);

    return {
      articles: topResults.map(({ id, title, content, relevance }) => ({
        id,
        title,
        content,
        relevance,
      })),
      count: topResults.length,
    };
  }

  async validate(input: unknown): Promise<KnowledgeBaseQuery> {
    if (typeof input !== 'object' || input === null) {
      throw new Error('Input must be an object');
    }

    const obj = input as Record<string, unknown>;

    if (typeof obj.query !== 'string' || obj.query.length === 0) {
      throw new Error('query must be a non-empty string');
    }

    if (
      obj.category !== undefined &&
      !['billing', 'technical', 'general', 'complaint'].includes(obj.category as string)
    ) {
      throw new Error('category must be one of: billing, technical, general, complaint');
    }

    return {
      query: obj.query,
      category: obj.category as KnowledgeBaseQuery['category'],
    };
  }

  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query for the knowledge base',
          },
          category: {
            type: 'string',
            enum: ['billing', 'technical', 'general', 'complaint'],
            description: 'Optional category to filter results',
          },
        },
        required: ['query'],
      },
    };
  }
}
