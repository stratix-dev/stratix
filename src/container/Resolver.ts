import { Container } from './Container.js';

export interface Resolver<T> {
  resolve(container: Container): T;
}
