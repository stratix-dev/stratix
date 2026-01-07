/**
 * Example 2: Using @Logger in a Domain Service with Custom Context
 *
 * This example demonstrates:
 * - Custom logger context
 * - Multiple log levels
 * - Structured logging with rich context
 */

import { Result, Success, Failure, DomainError } from '@stratix/core';
import { Logger } from '@stratix/framework';
import type { Logger as ILogger } from '@stratix/core';

export class OrderProcessingService {
  // Custom context name instead of class name
  @Logger({ context: 'OrderProcessing' })
  private readonly logger!: ILogger;

  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly inventoryService: InventoryService,
    private readonly paymentService: PaymentService,
    private readonly eventBus: EventBus
  ) {}

  async processOrder(orderId: string): Promise<Result<Order, DomainError>> {
    // Debug-level logging for detailed flow tracking
    this.logger.debug('Starting order processing', { orderId });

    // Retrieve the order
    const orderResult = await this.orderRepository.findById(orderId);
    if (orderResult.isFailure) {
      this.logger.warn('Order not found', { orderId });
      return orderResult;
    }

    const order = orderResult.value;
    this.logger.info('Order retrieved', {
      orderId,
      status: order.status,
      total: order.total,
      itemCount: order.items.length
    });

    // Validate inventory
    this.logger.debug('Checking inventory availability', {
      orderId,
      items: order.items.map(i => ({ sku: i.sku, quantity: i.quantity }))
    });

    const inventoryCheck = await this.inventoryService.checkAvailability(order.items);
    if (inventoryCheck.isFailure) {
      this.logger.warn('Insufficient inventory', {
        orderId,
        unavailableItems: inventoryCheck.error.message
      });
      return Failure.create(
        new DomainError('INSUFFICIENT_INVENTORY', inventoryCheck.error.message)
      );
    }

    // Process payment
    this.logger.info('Processing payment', {
      orderId,
      amount: order.total,
      currency: order.currency
    });

    const paymentResult = await this.paymentService.charge(
      order.customerId,
      order.total,
      order.currency
    );

    if (paymentResult.isFailure) {
      this.logger.error('Payment failed', {
        orderId,
        customerId: order.customerId,
        amount: order.total,
        error: paymentResult.error.message
      });
      return Failure.create(
        new DomainError('PAYMENT_FAILED', paymentResult.error.message)
      );
    }

    // Update order status
    order.markAsProcessed(paymentResult.value.transactionId);

    // Reserve inventory
    this.logger.debug('Reserving inventory', { orderId });
    await this.inventoryService.reserve(order.items);

    // Save order
    await this.orderRepository.save(order);

    // Publish events
    const events = order.getDomainEvents();
    await this.eventBus.publish(events);

    this.logger.info('Order processed successfully', {
      orderId,
      transactionId: paymentResult.value.transactionId,
      eventsPublished: events.length,
      processingTime: Date.now() - order.createdAt.getTime()
    });

    return Success.create(order);
  }

  async cancelOrder(orderId: string, reason: string): Promise<Result<Order, DomainError>> {
    this.logger.warn('Canceling order', { orderId, reason });

    const orderResult = await this.orderRepository.findById(orderId);
    if (orderResult.isFailure) {
      return orderResult;
    }

    const order = orderResult.value;

    // Release inventory if it was reserved
    if (order.status === 'processed') {
      this.logger.debug('Releasing reserved inventory', { orderId });
      await this.inventoryService.release(order.items);
    }

    // Refund if payment was processed
    if (order.transactionId) {
      this.logger.info('Processing refund', {
        orderId,
        transactionId: order.transactionId,
        amount: order.total
      });

      const refundResult = await this.paymentService.refund(order.transactionId);
      if (refundResult.isFailure) {
        this.logger.error('Refund failed', {
          orderId,
          transactionId: order.transactionId,
          error: refundResult.error.message
        });
        // Continue with cancellation even if refund fails
      }
    }

    order.cancel(reason);
    await this.orderRepository.save(order);

    this.logger.info('Order canceled successfully', { orderId, reason });

    return Success.create(order);
  }
}

// Supporting types
interface Order {
  id: string;
  customerId: string;
  status: string;
  total: number;
  currency: string;
  items: OrderItem[];
  transactionId?: string;
  createdAt: Date;
  markAsProcessed(transactionId: string): void;
  cancel(reason: string): void;
  getDomainEvents(): any[];
}

interface OrderItem {
  sku: string;
  quantity: number;
}

interface OrderRepository {
  findById(id: string): Promise<Result<Order, DomainError>>;
  save(order: Order): Promise<void>;
}

interface InventoryService {
  checkAvailability(items: OrderItem[]): Promise<Result<void, DomainError>>;
  reserve(items: OrderItem[]): Promise<void>;
  release(items: OrderItem[]): Promise<void>;
}

interface PaymentService {
  charge(customerId: string, amount: number, currency: string): Promise<Result<{ transactionId: string }, DomainError>>;
  refund(transactionId: string): Promise<Result<void, DomainError>>;
}

interface EventBus {
  publish(events: any[]): Promise<void>;
}
