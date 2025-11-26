import { describe, it, expect } from 'vitest';
import { Validators } from '../Validators.js';

describe('Validators', () => {
    describe('notEmpty', () => {
        it('should return success for non-empty string', () => {
            const result = Validators.notEmpty('hello', 'Name');

            expect(result.isSuccess).toBe(true);
            if (result.isSuccess) {
                expect(result.value).toBe('hello');
            }
        });

        it('should trim whitespace from string', () => {
            const result = Validators.notEmpty('  hello  ', 'Name');

            expect(result.isSuccess).toBe(true);
            if (result.isSuccess) {
                expect(result.value).toBe('hello');
            }
        });

        it('should fail for empty string', () => {
            const result = Validators.notEmpty('', 'Name');

            expect(result.isFailure).toBe(true);
            if (result.isFailure) {
                expect(result.error.code).toBe('EMPTY_VALUE');
                expect(result.error.message).toContain('Name');
            }
        });

        it('should fail for whitespace-only string', () => {
            const result = Validators.notEmpty('   ', 'Description');

            expect(result.isFailure).toBe(true);
            if (result.isFailure) {
                expect(result.error.code).toBe('EMPTY_VALUE');
            }
        });

        it('should use default field name when not provided', () => {
            const result = Validators.notEmpty('');

            expect(result.isFailure).toBe(true);
            if (result.isFailure) {
                expect(result.error.message).toContain('Field');
            }
        });
    });

    describe('length', () => {
        it('should return success for valid length', () => {
            const result = Validators.length('hello', { min: 3, max: 10 });

            expect(result.isSuccess).toBe(true);
            if (result.isSuccess) {
                expect(result.value).toBe('hello');
            }
        });

        it('should fail when below minimum length', () => {
            const result = Validators.length('ab', { min: 3, fieldName: 'Name' });

            expect(result.isFailure).toBe(true);
            if (result.isFailure) {
                expect(result.error.code).toBe('TOO_SHORT');
                expect(result.error.message).toContain('at least 3');
            }
        });

        it('should fail when above maximum length', () => {
            const result = Validators.length('hello world', { max: 5, fieldName: 'Name' });

            expect(result.isFailure).toBe(true);
            if (result.isFailure) {
                expect(result.error.code).toBe('TOO_LONG');
                expect(result.error.message).toContain('cannot exceed 5');
            }
        });

        it('should work with only min constraint', () => {
            const result = Validators.length('hello', { min: 3 });

            expect(result.isSuccess).toBe(true);
        });

        it('should work with only max constraint', () => {
            const result = Validators.length('hello', { max: 10 });

            expect(result.isSuccess).toBe(true);
        });

        it('should trim string before checking length', () => {
            const result = Validators.length('  abc  ', { min: 3, max: 3 });

            expect(result.isSuccess).toBe(true);
            if (result.isSuccess) {
                expect(result.value).toBe('abc');
            }
        });
    });

    describe('range', () => {
        it('should return success for valid range', () => {
            const result = Validators.range(5, { min: 0, max: 10 });

            expect(result.isSuccess).toBe(true);
            if (result.isSuccess) {
                expect(result.value).toBe(5);
            }
        });

        it('should fail when below minimum', () => {
            const result = Validators.range(-5, { min: 0, fieldName: 'Price' });

            expect(result.isFailure).toBe(true);
            if (result.isFailure) {
                expect(result.error.code).toBe('BELOW_MIN');
                expect(result.error.message).toContain('at least 0');
            }
        });

        it('should fail when above maximum', () => {
            const result = Validators.range(15, { max: 10, fieldName: 'Quantity' });

            expect(result.isFailure).toBe(true);
            if (result.isFailure) {
                expect(result.error.code).toBe('ABOVE_MAX');
                expect(result.error.message).toContain('cannot exceed 10');
            }
        });

        it('should allow value equal to min', () => {
            const result = Validators.range(0, { min: 0, max: 10 });

            expect(result.isSuccess).toBe(true);
        });

        it('should allow value equal to max', () => {
            const result = Validators.range(10, { min: 0, max: 10 });

            expect(result.isSuccess).toBe(true);
        });
    });

    describe('pattern', () => {
        it('should return success for matching pattern', () => {
            const result = Validators.pattern('ABC', /^[A-Z]{3}$/, 'Invalid code');

            expect(result.isSuccess).toBe(true);
            if (result.isSuccess) {
                expect(result.value).toBe('ABC');
            }
        });

        it('should fail for non-matching pattern', () => {
            const result = Validators.pattern('abc', /^[A-Z]{3}$/, 'Code must be uppercase');

            expect(result.isFailure).toBe(true);
            if (result.isFailure) {
                expect(result.error.code).toBe('INVALID_FORMAT');
                expect(result.error.message).toBe('Code must be uppercase');
            }
        });

        it('should use default error message when not provided', () => {
            const result = Validators.pattern('invalid', /^[0-9]+$/);

            expect(result.isFailure).toBe(true);
            if (result.isFailure) {
                expect(result.error.message).toBe('Invalid format');
            }
        });
    });

    describe('email', () => {
        it('should return success for valid email', () => {
            const result = Validators.email('user@example.com');

            expect(result.isSuccess).toBe(true);
            if (result.isSuccess) {
                expect(result.value).toBe('user@example.com');
            }
        });

        it('should fail for invalid email without @', () => {
            const result = Validators.email('userexample.com');

            expect(result.isFailure).toBe(true);
            if (result.isFailure) {
                expect(result.error.code).toBe('INVALID_FORMAT');
            }
        });

        it('should fail for invalid email without domain', () => {
            const result = Validators.email('user@');

            expect(result.isFailure).toBe(true);
        });

        it('should fail for invalid email with spaces', () => {
            const result = Validators.email('user @example.com');

            expect(result.isFailure).toBe(true);
        });
    });

    describe('url', () => {
        it('should return success for valid HTTP URL', () => {
            const result = Validators.url('http://example.com');

            expect(result.isSuccess).toBe(true);
            if (result.isSuccess) {
                expect(result.value).toBe('http://example.com');
            }
        });

        it('should return success for valid HTTPS URL', () => {
            const result = Validators.url('https://example.com');

            expect(result.isSuccess).toBe(true);
        });

        it('should return success for URL with path', () => {
            const result = Validators.url('https://example.com/path/to/resource');

            expect(result.isSuccess).toBe(true);
        });

        it('should fail for invalid URL', () => {
            const result = Validators.url('not-a-url');

            expect(result.isFailure).toBe(true);
            if (result.isFailure) {
                expect(result.error.code).toBe('INVALID_URL');
            }
        });

        it('should fail for empty string', () => {
            const result = Validators.url('');

            expect(result.isFailure).toBe(true);
        });
    });

    describe('compose', () => {
        it('should compose multiple validators successfully', () => {
            const emailValidator = Validators.compose<string>(
                (v: string) => Validators.notEmpty(v, 'Email'),
                (v: string) => Validators.length(v, { max: 254, fieldName: 'Email' }),
                (v: string) => Validators.email(v)
            );

            const result = emailValidator('user@example.com');

            expect(result.isSuccess).toBe(true);
            if (result.isSuccess) {
                expect(result.value).toBe('user@example.com');
            }
        });

        it('should stop at first failure', () => {
            const emailValidator = Validators.compose<string>(
                (v: string) => Validators.notEmpty(v, 'Email'),
                (v: string) => Validators.length(v, { max: 10, fieldName: 'Email' }),
                (v: string) => Validators.email(v)
            );

            const result = emailValidator('very-long-email@example.com');

            expect(result.isFailure).toBe(true);
            if (result.isFailure) {
                // Should fail at length check, not email format
                expect(result.error.code).toBe('TOO_LONG');
            }
        });

        it('should work with single validator', () => {
            const validator = Validators.compose<string>((v: string) => Validators.notEmpty(v, 'Name'));

            const result = validator('hello');

            expect(result.isSuccess).toBe(true);
        });

        it('should work with no validators', () => {
            const validator = Validators.compose<string>();

            const result = validator('anything');

            expect(result.isSuccess).toBe(true);
        });

        it('should preserve the validated value through composition', () => {
            const validator = Validators.compose<string>(
                (v: string) => Validators.notEmpty(v, 'Test'),
                (v: string) => Validators.length(v, { min: 3, max: 10 })
            );

            const result = validator('  hello  '); // Will be trimmed

            expect(result.isSuccess).toBe(true);
            if (result.isSuccess) {
                expect(result.value).toBe('hello');
            }
        });
    });
});
