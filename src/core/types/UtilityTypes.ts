export type ConstructorParamsType<C> = C extends new (arg: infer P) => any ? P : never;
export type ClassConstructorType = new (...args: any[]) => any;
