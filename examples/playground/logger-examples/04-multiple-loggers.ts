/**
 * Example 4: Using Multiple @Logger Decorators in the Same Class
 *
 * This example demonstrates how to use multiple logger instances
 * with different contexts in a single class for better log organization.
 */

import { Result, Success, Failure, DomainError } from '@stratix/core';
import { Logger } from '@stratix/framework';
import type { Logger as ILogger } from '@stratix/core';

/**
 * Advanced service that handles multiple concerns and uses
 * different loggers for each concern.
 */
export class PaymentProcessingService {
  // General operation logger
  @Logger({ context: 'PaymentService' })
  private readonly logger!: ILogger;

  // Security-specific logger for audit trail
  @Logger({ context: 'PaymentSecurity' })
  private readonly securityLogger!: ILogger;

  // Performance monitoring logger
  @Logger({ context: 'PaymentPerformance' })
  private readonly perfLogger!: ILogger;

  constructor(
    private readonly paymentGateway: PaymentGateway,
    private readonly fraudDetection: FraudDetectionService,
    private readonly auditService: AuditService
  ) {}

  async processPayment(
    customerId: string,
    amount: number,
    currency: string,
    paymentMethod: PaymentMethod
  ): Promise<Result<PaymentResult, DomainError>> {
    const startTime = Date.now();
    const operationId = this.generateOperationId();

    // General logging
    this.logger.info('Processing payment', {
      operationId,
      customerId,
      amount,
      currency,
      paymentMethodType: paymentMethod.type
    });

    // Security logging - audit trail
    this.securityLogger.info('Payment operation initiated', {
      operationId,
      customerId,
      amount,
      currency,
      ipAddress: paymentMethod.ipAddress,
      userAgent: paymentMethod.userAgent,
      timestamp: new Date().toISOString()
    });

    try {
      // Fraud detection
      this.logger.debug('Running fraud detection', { operationId });
      const fraudCheckStart = Date.now();

      const fraudCheck = await this.fraudDetection.analyze({
        customerId,
        amount,
        currency,
        paymentMethod
      });

      const fraudCheckDuration = Date.now() - fraudCheckStart;
      this.perfLogger.debug('Fraud detection completed', {
        operationId,
        duration: fraudCheckDuration,
        riskScore: fraudCheck.riskScore
      });

      if (fraudCheck.isHighRisk) {
        this.securityLogger.warn('High-risk transaction detected', {
          operationId,
          customerId,
          amount,
          riskScore: fraudCheck.riskScore,
          riskFactors: fraudCheck.riskFactors
        });

        // Log to audit service
        await this.auditService.logFraudAlert({
          operationId,
          customerId,
          amount,
          riskScore: fraudCheck.riskScore
        });

        return Failure.create(
          new DomainError('HIGH_RISK_TRANSACTION', 'Transaction blocked due to high risk')
        );
      }

      // Process through payment gateway
      this.logger.debug('Charging payment gateway', { operationId });
      const gatewayStart = Date.now();

      const gatewayResult = await this.paymentGateway.charge({
        customerId,
        amount,
        currency,
        paymentMethod
      });

      const gatewayDuration = Date.now() - gatewayStart;
      this.perfLogger.info('Payment gateway response received', {
        operationId,
        duration: gatewayDuration,
        success: gatewayResult.success
      });

      if (!gatewayResult.success) {
        this.logger.error('Payment gateway declined', {
          operationId,
          customerId,
          amount,
          declineReason: gatewayResult.declineReason,
          gatewayCode: gatewayResult.code
        });

        this.securityLogger.info('Payment declined', {
          operationId,
          customerId,
          amount,
          reason: gatewayResult.declineReason
        });

        return Failure.create(
          new DomainError('PAYMENT_DECLINED', gatewayResult.declineReason)
        );
      }

      // Success
      const totalDuration = Date.now() - startTime;

      this.logger.info('Payment processed successfully', {
        operationId,
        transactionId: gatewayResult.transactionId,
        customerId,
        amount,
        currency
      });

      this.securityLogger.info('Payment completed', {
        operationId,
        transactionId: gatewayResult.transactionId,
        customerId,
        amount,
        currency,
        timestamp: new Date().toISOString()
      });

      this.perfLogger.info('Payment operation metrics', {
        operationId,
        totalDuration,
        fraudCheckDuration,
        gatewayDuration,
        amount,
        currency
      });

      // Log to audit service
      await this.auditService.logPayment({
        operationId,
        transactionId: gatewayResult.transactionId,
        customerId,
        amount,
        currency,
        duration: totalDuration
      });

      return Success.create({
        transactionId: gatewayResult.transactionId,
        amount,
        currency,
        timestamp: new Date()
      });
    } catch (error) {
      const totalDuration = Date.now() - startTime;

      this.logger.error('Payment processing failed', {
        operationId,
        customerId,
        amount,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      this.securityLogger.error('Payment operation failed', {
        operationId,
        customerId,
        amount,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });

      this.perfLogger.error('Payment operation failed', {
        operationId,
        duration: totalDuration,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return Failure.create(
        new DomainError('PAYMENT_PROCESSING_ERROR', 'Failed to process payment')
      );
    }
  }

  async refundPayment(
    transactionId: string,
    amount: number,
    reason: string
  ): Promise<Result<RefundResult, DomainError>> {
    const startTime = Date.now();
    const operationId = this.generateOperationId();

    this.logger.info('Processing refund', {
      operationId,
      transactionId,
      amount,
      reason
    });

    this.securityLogger.info('Refund initiated', {
      operationId,
      transactionId,
      amount,
      reason,
      timestamp: new Date().toISOString()
    });

    try {
      const gatewayResult = await this.paymentGateway.refund({
        transactionId,
        amount
      });

      const duration = Date.now() - startTime;

      if (!gatewayResult.success) {
        this.logger.error('Refund failed', {
          operationId,
          transactionId,
          amount,
          error: gatewayResult.error
        });

        this.securityLogger.warn('Refund failed', {
          operationId,
          transactionId,
          amount,
          error: gatewayResult.error,
          timestamp: new Date().toISOString()
        });

        return Failure.create(
          new DomainError('REFUND_FAILED', gatewayResult.error)
        );
      }

      this.logger.info('Refund processed successfully', {
        operationId,
        refundId: gatewayResult.refundId,
        transactionId,
        amount
      });

      this.securityLogger.info('Refund completed', {
        operationId,
        refundId: gatewayResult.refundId,
        transactionId,
        amount,
        reason,
        timestamp: new Date().toISOString()
      });

      this.perfLogger.info('Refund operation metrics', {
        operationId,
        duration,
        amount
      });

      return Success.create({
        refundId: gatewayResult.refundId,
        transactionId,
        amount,
        timestamp: new Date()
      });
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error('Refund processing failed', {
        operationId,
        transactionId,
        amount,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      this.securityLogger.error('Refund operation failed', {
        operationId,
        transactionId,
        amount,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });

      this.perfLogger.error('Refund operation failed', {
        operationId,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return Failure.create(
        new DomainError('REFUND_PROCESSING_ERROR', 'Failed to process refund')
      );
    }
  }

  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
}

// Supporting types
interface PaymentMethod {
  type: 'credit_card' | 'debit_card' | 'bank_transfer';
  ipAddress: string;
  userAgent: string;
}

interface PaymentGateway {
  charge(params: {
    customerId: string;
    amount: number;
    currency: string;
    paymentMethod: PaymentMethod;
  }): Promise<{
    success: boolean;
    transactionId?: string;
    declineReason?: string;
    code?: string;
  }>;

  refund(params: {
    transactionId: string;
    amount: number;
  }): Promise<{
    success: boolean;
    refundId?: string;
    error?: string;
  }>;
}

interface FraudDetectionService {
  analyze(params: {
    customerId: string;
    amount: number;
    currency: string;
    paymentMethod: PaymentMethod;
  }): Promise<{
    isHighRisk: boolean;
    riskScore: number;
    riskFactors: string[];
  }>;
}

interface AuditService {
  logPayment(params: {
    operationId: string;
    transactionId: string;
    customerId: string;
    amount: number;
    currency: string;
    duration: number;
  }): Promise<void>;

  logFraudAlert(params: {
    operationId: string;
    customerId: string;
    amount: number;
    riskScore: number;
  }): Promise<void>;
}

interface PaymentResult {
  transactionId: string;
  amount: number;
  currency: string;
  timestamp: Date;
}

interface RefundResult {
  refundId: string;
  transactionId: string;
  amount: number;
  timestamp: Date;
}
