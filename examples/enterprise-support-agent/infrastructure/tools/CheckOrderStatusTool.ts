import { AgentTool, type ToolDefinition } from '@stratix/core';
import type { OrderInfo } from '../../domain/types.js';

interface OrderStatusQuery {
  orderId: string;
}

/**
 * Tool for checking order status and details
 *
 * In production, this would integrate with order management system
 */
export class CheckOrderStatusTool extends AgentTool<OrderStatusQuery, OrderInfo> {
  readonly name = 'check_order_status';
  readonly description = 'Check the status, details, and tracking information for a customer order';
  readonly requiresApproval = false;

  // Mock order database
  private orders: Map<string, OrderInfo> = new Map([
    [
      'ORD-12345',
      {
        orderId: 'ORD-12345',
        customerId: 'cust-001',
        status: 'shipped',
        items: [
          { productId: 'prod-100', name: 'Premium Subscription (Annual)', quantity: 1, price: 299.99 },
        ],
        total: 299.99,
        currency: 'USD',
        createdAt: new Date('2025-01-15'),
        estimatedDelivery: new Date('2025-01-22'),
        trackingNumber: 'TRK-9876543210',
      },
    ],
    [
      'ORD-67890',
      {
        orderId: 'ORD-67890',
        customerId: 'cust-002',
        status: 'delivered',
        items: [
          { productId: 'prod-200', name: 'Enterprise Plan', quantity: 1, price: 999.00 },
          { productId: 'prod-201', name: 'Additional Seats (x5)', quantity: 5, price: 50.00 },
        ],
        total: 1249.0,
        currency: 'USD',
        createdAt: new Date('2025-01-10'),
        estimatedDelivery: new Date('2025-01-15'),
        trackingNumber: 'TRK-1234567890',
      },
    ],
    [
      'ORD-11111',
      {
        orderId: 'ORD-11111',
        customerId: 'cust-003',
        status: 'processing',
        items: [
          { productId: 'prod-150', name: 'Starter Pack', quantity: 1, price: 49.99 },
        ],
        total: 49.99,
        currency: 'USD',
        createdAt: new Date('2025-01-24'),
        estimatedDelivery: new Date('2025-01-31'),
      },
    ],
    [
      'ORD-22222',
      {
        orderId: 'ORD-22222',
        customerId: 'cust-004',
        status: 'refunded',
        items: [
          { productId: 'prod-300', name: 'Pro Plan (Monthly)', quantity: 1, price: 99.99 },
        ],
        total: 99.99,
        currency: 'USD',
        createdAt: new Date('2025-01-05'),
      },
    ],
  ]);

  async execute(input: OrderStatusQuery): Promise<OrderInfo> {
    const { orderId } = input;

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));

    const order = this.orders.get(orderId);

    if (!order) {
      throw new Error(`Order ${orderId} not found. Please verify the order ID.`);
    }

    return order;
  }

  async validate(input: unknown): Promise<OrderStatusQuery> {
    if (typeof input !== 'object' || input === null) {
      throw new Error('Input must be an object');
    }

    const obj = input as Record<string, unknown>;

    if (typeof obj.orderId !== 'string' || obj.orderId.trim().length === 0) {
      throw new Error('orderId must be a non-empty string');
    }

    // Validate order ID format (ORD-XXXXX)
    const orderIdPattern = /^ORD-\d+$/;
    if (!orderIdPattern.test(obj.orderId)) {
      throw new Error('orderId must be in format: ORD-XXXXX');
    }

    return {
      orderId: obj.orderId.trim().toUpperCase(),
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
            description: 'Order ID to check (format: ORD-XXXXX)',
            pattern: '^ORD-\\d+$',
          },
        },
        required: ['orderId'],
      },
    };
  }
}
