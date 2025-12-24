import { AgentTool, type ToolDefinition } from '@stratix/core';
import type { KnowledgeArticle, SupportCategory } from '../../domain/types.js';

interface KnowledgeBaseQuery {
  query: string;
  category?: SupportCategory;
  limit?: number;
}

interface KnowledgeBaseResult {
  articles: KnowledgeArticle[];
  totalFound: number;
}

/**
 * Tool for searching the knowledge base using semantic search
 *
 * In production, this would integrate with a vector database
 * and use RAG (Retrieval Augmented Generation) for better results
 */
export class QueryKnowledgeBaseTool extends AgentTool<KnowledgeBaseQuery, KnowledgeBaseResult> {
  readonly name = 'query_knowledge_base';
  readonly description =
    'Search the knowledge base for relevant articles, solutions, and documentation';
  readonly requiresApproval = false;

  // Mock knowledge base - in production, this would be a vector store with embeddings
  private knowledgeBase: KnowledgeArticle[] = [
    {
      id: 'kb-001',
      title: 'How to Process a Refund',
      content: `To process a refund:
1. Verify the order ID and customer information
2. Check refund eligibility (within 30 days, unused product)
3. Initiate refund through the billing system
4. Refunds are processed within 5-7 business days
5. Customer will receive confirmation email

Important: Premium customers get expedited refund processing (2-3 business days)`,
      category: 'billing',
      tags: ['refund', 'payment', 'billing', 'return'],
      lastUpdated: new Date('2025-01-15'),
      viewCount: 1543,
    },
    {
      id: 'kb-002',
      title: 'Troubleshooting Application Crashes',
      content: `Common solutions for app crashes:
1. Clear application cache and data
2. Ensure app is updated to the latest version
3. Restart the device
4. Check device storage (need at least 500MB free)
5. Verify OS compatibility
6. Reinstall the application if issues persist

For iOS: Settings > App > Clear Cache
For Android: Settings > Apps > [App Name] > Storage > Clear Cache

If problem continues after these steps, escalate to technical team with crash logs.`,
      category: 'technical',
      tags: ['crash', 'bug', 'technical', 'mobile', 'troubleshooting'],
      lastUpdated: new Date('2025-01-20'),
      viewCount: 2341,
    },
    {
      id: 'kb-003',
      title: 'Order Tracking and Shipping Information',
      content: `Track your order:
1. Use the tracking number provided in shipping confirmation email
2. Visit carrier website or use our tracking portal
3. Standard shipping: 5-7 business days
4. Express shipping: 2-3 business days
5. International: 10-15 business days

Tracking updates every 24 hours. If no update after 3 days, contact carrier support.
Premium members get free express shipping on all orders.`,
      category: 'shipping',
      tags: ['shipping', 'tracking', 'delivery', 'order'],
      lastUpdated: new Date('2025-01-18'),
      viewCount: 3211,
    },
    {
      id: 'kb-004',
      title: 'Account Security and Password Reset',
      content: `Secure your account:
1. Use strong passwords (min 12 characters, mixed case, numbers, symbols)
2. Enable two-factor authentication (2FA) in account settings
3. Never share your password or 2FA codes
4. Review login activity regularly

To reset password:
1. Click "Forgot Password" on login page
2. Enter registered email
3. Check email for reset link (valid 1 hour)
4. Create new strong password
5. You'll be logged out of all devices

If you didn't request the reset, contact security team immediately.`,
      category: 'account',
      tags: ['security', 'password', 'account', '2fa', 'authentication'],
      lastUpdated: new Date('2025-01-22'),
      viewCount: 1876,
    },
    {
      id: 'kb-005',
      title: 'Product Features and Specifications',
      content: `Product details:
- Premium features available for paid plans
- Free tier includes basic functionality
- Enterprise tier includes: priority support, SLA, custom integrations
- Mobile apps available for iOS and Android
- Web app works on all modern browsers
- API access for Enterprise customers
- Data export available in CSV, JSON formats
- GDPR compliant with data deletion options

For detailed comparison, see pricing page or contact sales.`,
      category: 'product',
      tags: ['features', 'product', 'specifications', 'pricing', 'plans'],
      lastUpdated: new Date('2025-01-10'),
      viewCount: 4532,
    },
    {
      id: 'kb-006',
      title: 'Billing Cycles and Payment Methods',
      content: `Billing information:
- Monthly billing on the date you subscribed
- Annual plans billed once per year (save 20%)
- Accepted payments: Credit/debit cards, PayPal, bank transfer (Enterprise)
- Automatic renewal unless cancelled 24 hours before renewal
- Prorated refunds for annual plans if cancelled within 14 days
- Update payment method in account settings
- Invoices emailed monthly (also available in account portal)

Enterprise customers can request custom billing terms.`,
      category: 'billing',
      tags: ['billing', 'payment', 'subscription', 'invoice', 'pricing'],
      lastUpdated: new Date('2025-01-12'),
      viewCount: 2109,
    },
    {
      id: 'kb-007',
      title: 'API Integration Guide',
      content: `API integration for developers:
- REST API with JSON responses
- Authentication via API keys (generate in dashboard)
- Rate limits: 100 req/min (free), 1000 req/min (premium), unlimited (enterprise)
- SDKs available: Python, JavaScript, Ruby, Java
- Webhooks for real-time events
- Comprehensive documentation at developers.example.com
- Sandbox environment for testing
- API versioning with backward compatibility

Need help? Contact developer support or join our Discord community.`,
      category: 'technical',
      tags: ['api', 'integration', 'developer', 'technical', 'sdk'],
      lastUpdated: new Date('2025-01-25'),
      viewCount: 891,
    },
    {
      id: 'kb-008',
      title: 'International Shipping and Customs',
      content: `International orders:
- We ship to 150+ countries
- Customs duties and taxes are customer's responsibility
- Customs fees vary by country and product value
- Provide accurate address and phone number
- Commercial invoice included with shipment
- Restricted items: batteries, liquids, aerosols (check country regulations)
- Customs delays: 1-2 weeks possible during high seasons
- Track shipment through international carriers

For customs issues, contact your local customs office with tracking number.`,
      category: 'shipping',
      tags: ['international', 'shipping', 'customs', 'duties', 'delivery'],
      lastUpdated: new Date('2025-01-14'),
      viewCount: 1234,
    },
  ];

  async execute(input: KnowledgeBaseQuery): Promise<KnowledgeBaseResult> {
    const { query, category, limit = 3 } = input;

    // Simple keyword-based search (in production, use vector embeddings)
    const queryLower = query.toLowerCase();
    const keywords = queryLower.split(' ').filter(word => word.length > 3);

    let scored = this.knowledgeBase.map(article => {
      let score = 0;

      // Category match bonus
      if (category && article.category === category) {
        score += 20;
      }

      // Title matching (highest weight)
      const titleLower = article.title.toLowerCase();
      keywords.forEach(keyword => {
        if (titleLower.includes(keyword)) {
          score += 10;
        }
      });

      // Content matching
      const contentLower = article.content.toLowerCase();
      keywords.forEach(keyword => {
        if (contentLower.includes(keyword)) {
          score += 3;
        }
      });

      // Tag matching
      article.tags.forEach(tag => {
        keywords.forEach(keyword => {
          if (tag.includes(keyword)) {
            score += 5;
          }
        });
      });

      // Popularity bonus (more views = likely more helpful)
      score += Math.log(article.viewCount) * 0.5;

      return { ...article, relevanceScore: score };
    });

    // Filter out articles with no relevance
    scored = scored.filter(article => article.relevanceScore && article.relevanceScore > 0);

    // Sort by relevance
    scored.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

    // Take top N results
    const results = scored.slice(0, limit);

    return {
      articles: results,
      totalFound: scored.length,
    };
  }

  async validate(input: unknown): Promise<KnowledgeBaseQuery> {
    if (typeof input !== 'object' || input === null) {
      throw new Error('Input must be an object');
    }

    const obj = input as Record<string, unknown>;

    if (typeof obj.query !== 'string' || obj.query.trim().length === 0) {
      throw new Error('query must be a non-empty string');
    }

    const validCategories: SupportCategory[] = [
      'billing',
      'technical',
      'shipping',
      'product',
      'account',
      'general',
    ];

    if (obj.category !== undefined && !validCategories.includes(obj.category as SupportCategory)) {
      throw new Error(`category must be one of: ${validCategories.join(', ')}`);
    }

    if (obj.limit !== undefined && (typeof obj.limit !== 'number' || obj.limit < 1 || obj.limit > 10)) {
      throw new Error('limit must be a number between 1 and 10');
    }

    return {
      query: obj.query.trim(),
      category: obj.category as SupportCategory | undefined,
      limit: (obj.limit as number | undefined) || 3,
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
            description: 'Search query for finding relevant knowledge base articles',
          },
          category: {
            type: 'string',
            enum: ['billing', 'technical', 'shipping', 'product', 'account', 'general'],
            description: 'Optional category to filter search results',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of articles to return (1-10, default 3)',
            minimum: 1,
            maximum: 10,
          },
        },
        required: ['query'],
      },
    };
  }
}
