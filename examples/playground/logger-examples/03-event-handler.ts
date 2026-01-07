/**
 * Example 3: Using @Logger in Event Handlers
 *
 * This example shows how to use @Logger decorator in event handlers
 * to track event processing and side effects.
 */

import { DomainEvent } from '@stratix/core';
import { Logger } from '@stratix/framework';
import type { Logger as ILogger } from '@stratix/core';

// Domain Events
export class UserCreatedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly name: string
  ) {
    super();
  }
}

export class OrderPlacedEvent extends DomainEvent {
  constructor(
    public readonly orderId: string,
    public readonly customerId: string,
    public readonly total: number,
    public readonly items: any[]
  ) {
    super();
  }
}

// Event Handler 1: Send Welcome Email
export class SendWelcomeEmailHandler {
  @Logger({ context: 'EmailNotifications' })
  private readonly logger!: ILogger;

  constructor(private readonly emailService: EmailService) {}

  async handle(event: UserCreatedEvent): Promise<void> {
    this.logger.info('Processing UserCreated event', {
      userId: event.userId,
      email: event.email,
      occurredAt: event.occurredAt
    });

    try {
      await this.emailService.sendWelcomeEmail({
        to: event.email,
        userName: event.name
      });

      this.logger.info('Welcome email sent successfully', {
        userId: event.userId,
        email: event.email
      });
    } catch (error) {
      // Log error but don't throw - we don't want to affect other event handlers
      this.logger.error('Failed to send welcome email', {
        userId: event.userId,
        email: event.email,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  }
}

// Event Handler 2: Create User Profile
export class CreateUserProfileHandler {
  @Logger({ context: 'UserProfiles' })
  private readonly logger!: ILogger;

  constructor(private readonly profileService: ProfileService) {}

  async handle(event: UserCreatedEvent): Promise<void> {
    this.logger.debug('Creating user profile', {
      userId: event.userId
    });

    try {
      await this.profileService.createProfile({
        userId: event.userId,
        email: event.email,
        name: event.name,
        createdAt: event.occurredAt
      });

      this.logger.info('User profile created', {
        userId: event.userId
      });
    } catch (error) {
      this.logger.error('Failed to create user profile', {
        userId: event.userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Rethrow because this is a critical operation
      throw error;
    }
  }
}

// Event Handler 3: Process Order Fulfillment
export class ProcessOrderFulfillmentHandler {
  @Logger({ context: 'OrderFulfillment' })
  private readonly logger!: ILogger;

  constructor(
    private readonly fulfillmentService: FulfillmentService,
    private readonly inventoryService: InventoryService
  ) {}

  async handle(event: OrderPlacedEvent): Promise<void> {
    this.logger.info('Starting order fulfillment', {
      orderId: event.orderId,
      customerId: event.customerId,
      itemCount: event.items.length,
      total: event.total
    });

    // Check inventory
    this.logger.debug('Checking inventory levels', {
      orderId: event.orderId,
      items: event.items
    });

    const inventoryStatus = await this.inventoryService.checkLevels(event.items);

    if (inventoryStatus.lowStock.length > 0) {
      this.logger.warn('Low stock detected for some items', {
        orderId: event.orderId,
        lowStockItems: inventoryStatus.lowStock
      });
    }

    // Create fulfillment order
    this.logger.debug('Creating fulfillment order', {
      orderId: event.orderId
    });

    try {
      const fulfillmentOrder = await this.fulfillmentService.createFulfillmentOrder({
        orderId: event.orderId,
        customerId: event.customerId,
        items: event.items
      });

      this.logger.info('Fulfillment order created', {
        orderId: event.orderId,
        fulfillmentOrderId: fulfillmentOrder.id,
        estimatedShipDate: fulfillmentOrder.estimatedShipDate
      });

      // Update inventory
      await this.inventoryService.reserve(event.items);

      this.logger.debug('Inventory reserved', {
        orderId: event.orderId,
        fulfillmentOrderId: fulfillmentOrder.id
      });
    } catch (error) {
      this.logger.error('Failed to process order fulfillment', {
        orderId: event.orderId,
        customerId: event.customerId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      // Notify operations team
      this.logger.fatal('Manual intervention required', {
        orderId: event.orderId,
        reason: 'Fulfillment processing failed'
      });

      throw error;
    }
  }
}

// Event Handler 4: Send Order Confirmation
export class SendOrderConfirmationHandler {
  @Logger({ context: 'OrderNotifications' })
  private readonly logger!: ILogger;

  constructor(
    private readonly emailService: EmailService,
    private readonly customerService: CustomerService
  ) {}

  async handle(event: OrderPlacedEvent): Promise<void> {
    this.logger.info('Sending order confirmation', {
      orderId: event.orderId,
      customerId: event.customerId
    });

    // Get customer details
    const customer = await this.customerService.getById(event.customerId);

    if (!customer) {
      this.logger.warn('Customer not found for order confirmation', {
        orderId: event.orderId,
        customerId: event.customerId
      });
      return;
    }

    try {
      await this.emailService.sendOrderConfirmation({
        to: customer.email,
        orderId: event.orderId,
        items: event.items,
        total: event.total
      });

      this.logger.info('Order confirmation sent', {
        orderId: event.orderId,
        customerId: event.customerId,
        email: customer.email
      });
    } catch (error) {
      this.logger.error('Failed to send order confirmation', {
        orderId: event.orderId,
        customerId: event.customerId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Don't throw - notification failure shouldn't break the order flow
    }
  }
}

// Supporting interfaces
interface EmailService {
  sendWelcomeEmail(params: { to: string; userName: string }): Promise<void>;
  sendOrderConfirmation(params: { to: string; orderId: string; items: any[]; total: number }): Promise<void>;
}

interface ProfileService {
  createProfile(params: { userId: string; email: string; name: string; createdAt: Date }): Promise<void>;
}

interface FulfillmentService {
  createFulfillmentOrder(params: { orderId: string; customerId: string; items: any[] }): Promise<{ id: string; estimatedShipDate: Date }>;
}

interface InventoryService {
  checkLevels(items: any[]): Promise<{ lowStock: any[] }>;
  reserve(items: any[]): Promise<void>;
}

interface CustomerService {
  getById(id: string): Promise<{ email: string } | null>;
}
