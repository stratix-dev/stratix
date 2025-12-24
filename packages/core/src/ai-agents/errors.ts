/**
 * Error hierarchy for AI Agent framework
 */

/**
 * Base error class for all agent-related errors
 */
export abstract class AgentError extends Error {
    protected constructor(
        message: string,
        public readonly code: string,
        public readonly metadata?: Record<string, unknown>
    ) {
        super(message);
        this.name = this.constructor.name;

        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

/**
 * Error thrown when agent execution fails
 */
export class AgentExecutionError extends AgentError {
    constructor(message: string, metadata?: Record<string, unknown>) {
        super(message, 'AGENT_EXECUTION_ERROR', metadata);
    }
}

/**
 * Error thrown when agent exceeds its budget
 */
export class AgentBudgetExceededError extends AgentError {
    constructor(
        public readonly budget: number,
        public readonly spent: number
    ) {
        super(
            `Budget exceeded: $${spent.toFixed(4)} spent, $${budget.toFixed(4)} allowed`,
            'BUDGET_EXCEEDED',
            { budget, spent }
        );
    }
}

/**
 * Error thrown when agent execution times out
 */
export class AgentTimeoutError extends AgentError {
    constructor(public readonly timeoutMs: number) {
        super(
            `Agent execution timed out after ${timeoutMs}ms`,
            'AGENT_TIMEOUT',
            { timeoutMs }
        );
    }
}

/**
 * Error thrown when a tool execution fails
 */
export class AgentToolError extends AgentError {
    constructor(
        public readonly toolName: string,
        message: string,
        public readonly cause?: Error
    ) {
        super(
            `Tool '${toolName}' failed: ${message}`,
            'TOOL_ERROR',
            { toolName, cause: cause?.message }
        );
    }
}

/**
 * Error thrown when input or output validation fails
 */
export class AgentValidationError extends AgentError {
    constructor(
        public readonly field: string,
        message: string
    ) {
        super(
            `Validation failed for '${field}': ${message}`,
            'VALIDATION_ERROR',
            { field }
        );
    }
}

/**
 * Error thrown when agent configuration is invalid
 */
export class AgentConfigurationError extends AgentError {
    constructor(message: string, metadata?: Record<string, unknown>) {
        super(message, 'CONFIGURATION_ERROR', metadata);
    }
}

/**
 * Error thrown when LLM provider fails
 */
export class LLMProviderError extends AgentError {
    constructor(
        public readonly provider: string,
        message: string,
        public readonly cause?: Error
    ) {
        super(
            `LLM provider '${provider}' failed: ${message}`,
            'LLM_PROVIDER_ERROR',
            { provider, cause: cause?.message }
        );
    }
}
