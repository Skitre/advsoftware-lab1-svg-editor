export class Numbers {
  static parse(value: string, label: string): number {
    if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value)) {
      throw new Error(`invalid number for ${label}: ${value}`);
    }
    return this.finite(Number(value), label);
  }

  static finite(value: number, label: string): number {
    if (!Number.isFinite(value)) throw new Error(`${label} must be finite`);
    return Object.is(value, -0) ? 0 : value;
  }

  static nonnegative(value: number, label: string): number {
    this.finite(value, label);
    if (value < 0) throw new Error(`${label} must be nonnegative`);
    return value;
  }

  static positive(value: number, label: string): number {
    this.finite(value, label);
    if (value <= 0) throw new Error(`${label} must be positive`);
    return value;
  }
}
