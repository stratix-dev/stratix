// Core
export { MongoConnection } from './MongoConnection.js';
export { MongoRepository } from './MongoRepository.js';
export type { MongoDocument } from './MongoRepository.js';
export { MongoUnitOfWork } from './MongoUnitOfWork.js';
export { MongoPlugin } from './MongoPlugin.js';
export type { MongoConfig } from './MongoPlugin.js';

// Pagination
export type { PaginationOptions, PaginatedResult } from './pagination/types.js';

// Indexing
export type { IndexDefinition, IndexOptions } from './indexing/types.js';
export { IndexManager } from './indexing/IndexManager.js';

// Aggregation
export { MongoAggregationBuilder } from './aggregation/AggregationBuilder.js';

// Patterns
export { SoftDeleteMongoRepository } from './patterns/SoftDeleteMongoRepository.js';
export type { SoftDeletable } from './patterns/SoftDeleteMongoRepository.js';
