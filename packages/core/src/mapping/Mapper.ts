type MapperFunction<TSource, TTarget, TKey extends keyof TTarget> =
  | ((source: TSource) => TTarget[TKey])
  | keyof TSource;

type AnyMapperFunction<TSource, TTarget> = MapperFunction<TSource, TTarget, keyof TTarget>;

/**
 * Generic mapper for transforming objects from one type to another.
 * 
 * Provides a fluent API for defining field-by-field mappings between source and target types.
 * Supports both direct property mappings and custom transformation functions.
 * 
 * @template TSource - The source object type
 * @template TTarget - The target object type
 * @category Patterns
 * 
 * @example
 * ```typescript
 * interface UserDTO { firstName: string; lastName: string; age: number; }
 * interface UserEntity { fullName: string; isAdult: boolean; }
 * 
 * const mapper = Mapper.create<UserDTO, UserEntity>()
 *   .addField('fullName', (dto) => `${dto.firstName} ${dto.lastName}`)
 *   .addField('isAdult', (dto) => dto.age >= 18);
 * 
 * const user = mapper.map({ firstName: 'John', lastName: 'Doe', age: 25 });
 * // Result: { fullName: 'John Doe', isAdult: true }
 * ```
 */
export class Mapper<TSource, TTarget> {
  private mappings: Map<keyof TTarget, AnyMapperFunction<TSource, TTarget>> = new Map();

  addField<TKey extends keyof TTarget>(
    targetField: TKey,
    mapping: MapperFunction<TSource, TTarget, TKey>
  ): this {
    this.mappings.set(targetField, mapping as AnyMapperFunction<TSource, TTarget>);
    return this;
  }

  map(source: TSource): TTarget {
    const result: Partial<TTarget> = {};

    for (const [targetField, mapping] of this.mappings.entries()) {
      if (typeof mapping === 'function') {
        result[targetField] = mapping(source);
      } else {
        const sourceValue = source[mapping];
        result[targetField] = sourceValue as unknown as TTarget[keyof TTarget];
      }
    }

    return result as TTarget;
  }

  mapArray(sources: TSource[]): TTarget[] {
    return sources.map((source) => this.map(source));
  }

  static create<TSource, TTarget>(): Mapper<TSource, TTarget> {
    return new Mapper<TSource, TTarget>();
  }
}
