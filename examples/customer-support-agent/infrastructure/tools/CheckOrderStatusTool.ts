import { AgentTool, type ToolDefinition } from '@stratix/core';

interface OrderStatusQuery {
  orderId: string;
}

interface OrderStatusResult {
  found: boolean;
  orderId?: string;
  status?: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  estimatedDelivery?: string;
  trackingNumber?: string;
  message?: string;
}

/**
 * Tool for checking customer order status
 */
export class CheckOrderStatusTool extends AgentTool<OrderStatusQuery, OrderStatusResult> {
  readonly name = 'check_order_status';
  readonly description = 'Check the status of a customer order';
  readonly requiresApproval = false;

  // Mock order database
  private orders: Map<string, Omit<OrderStatusResult, 'found'>> = new Map([
    [
      'ORD-12345',
      {
        orderId: 'ORD-12345',
        status: 'delivered',
        estimatedDelivery: '2025-01-20',
        trackingNumber: 'TRK-ABC123',
      },
    ],
    [
      'ORD-67890',
      {
        orderId: 'ORD-67890',
        status: 'shipped',
        estimatedDelivery: '2025-01-25',
        trackingNumber: 'TRK-XYZ789',
      },
    ],
    [
      'ORD-11111',
      {
        orderId: 'ORD-11111',
        status: 'processing',
        estimatedDelivery: '2025-01-27',
      },
    ],
  ]);

  async execute(input: OrderStatusQuery): Promise<OrderStatusResult> {
    const order = this.orders.get(input.orderId);

    if (!order) {
      return {
        found: false,
        message: `Order ${input.orderId} not found in our system`,
      };
    }

    return {
      found: true,
      ...order,
    };
  }

  async validate(input: unknown): Promise<OrderStatusQuery> {
    if (typeof input !== 'object' || input === null) {
      throw new Error('Input must be an object');
    }

    const obj = input as Record<string, unknown>;

    if (typeof obj.orderId !== 'string' || obj.orderId.length === 0) {
      throw new Error('orderId must be a non-empty string');
    }

    return {
      orderId: obj.orderId,
    };
  }

  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: 'object',
        properties: {
          orderId: {
            type: 'string',
            description: 'The order ID to check',
          },
        },
        required: ['orderId'],
      },
    };
  }
}
