import { describe, it, expect, beforeEach } from 'vitest';
import { HTTPClient } from '../HTTPClient.js';
import type { HTTPClientConfig, HTTPClientOptions } from '../types.js';

describe('HTTPClient', () => {
    let client: HTTPClient;

    beforeEach(() => {
        const config: HTTPClientConfig = {
            baseURL: 'https://jsonplaceholder.typicode.com',
            timeout: 5000,
        };

        const options: HTTPClientOptions = {
            timing: true,
            logging: false,
        };

        client = new HTTPClient(config, options);
    });

    describe('GET requests', () => {
        it('should make a successful GET request', async () => {
            const response = await client.get('/posts/1');

            expect(response.status).toBe(200);
            expect(response.data).toBeDefined();
            expect(response.data).toHaveProperty('id', 1);
        });

        it('should include timing information', async () => {
            const response = await client.get('/posts/1');

            expect(response.duration).toBeDefined();
            expect(typeof response.duration).toBe('number');
            expect(response.duration).toBeGreaterThan(0);
        });
    });

    describe('POST requests', () => {
        it('should make a successful POST request', async () => {
            const data = {
                title: 'Test Post',
                body: 'Test Body',
                userId: 1,
            };

            const response = await client.post('/posts', data);

            expect(response.status).toBe(201);
            expect(response.data).toBeDefined();
            expect(response.data).toHaveProperty('title', data.title);
        });
    });

    describe('PUT requests', () => {
        it('should make a successful PUT request', async () => {
            const data = {
                id: 1,
                title: 'Updated Post',
                body: 'Updated Body',
                userId: 1,
            };

            const response = await client.put('/posts/1', data);

            expect(response.status).toBe(200);
            expect(response.data).toBeDefined();
        });
    });

    describe('DELETE requests', () => {
        it('should make a successful DELETE request', async () => {
            const response = await client.delete('/posts/1');

            expect(response.status).toBe(200);
        });
    });

    describe('Error handling', () => {
        it('should handle 404 errors', async () => {
            await expect(client.get('/posts/999999')).rejects.toThrow();
        });

        it('should handle network errors', async () => {
            const errorClient = new HTTPClient({
                baseURL: 'https://invalid-domain-that-does-not-exist-12345.com',
                timeout: 1000,
            });

            await expect(errorClient.get('/test')).rejects.toThrow();
        });
    });

    describe('Interceptors', () => {
        it('should add request interceptor', () => {
            const interceptorId = client.addRequestInterceptor({
                onFulfilled: (config) => {
                    config.headers['X-Custom-Header'] = 'test-value';
                    return config;
                },
            });

            expect(typeof interceptorId).toBe('number');
        });

        it('should add response interceptor', () => {
            const interceptorId = client.addResponseInterceptor({
                onFulfilled: (response) => response,
            });

            expect(typeof interceptorId).toBe('number');
        });
    });

    describe('Circuit breaker', () => {
        it('should initialize with closed circuit', () => {
            const cbClient = new HTTPClient(
                { baseURL: 'https://jsonplaceholder.typicode.com' },
                {
                    circuitBreaker: {
                        enabled: true,
                        threshold: 3,
                    },
                }
            );

            expect(cbClient.getCircuitState()).toBe('CLOSED');
        });

        it('should reset circuit breaker', () => {
            const cbClient = new HTTPClient(
                { baseURL: 'https://jsonplaceholder.typicode.com' },
                {
                    circuitBreaker: {
                        enabled: true,
                    },
                }
            );

            cbClient.resetCircuitBreaker();
            expect(cbClient.getCircuitState()).toBe('CLOSED');
        });
    });
});
