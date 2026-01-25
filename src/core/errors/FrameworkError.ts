export class FrameworkError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'FrameworkError';
    Object.setPrototypeOf(this, FrameworkError.prototype);
  }

  toJSON(): { code: string; message: string; name: string } {
    return {
      name: this.name,
      code: this.code,
      message: this.message
    };
  }
}
