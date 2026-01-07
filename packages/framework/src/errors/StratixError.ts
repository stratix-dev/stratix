
export class StratixError extends Error {

  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'StratixError';
    Object.setPrototypeOf(this, StratixError.prototype);
  }

  toJSON(): { code: string; message: string; name: string } {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
    };
  }
}
