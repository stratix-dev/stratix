# @stratix/db-mongodb

MongoDB plugin for Stratix applications with advanced features for production use.

## Installation

```bash
pnpm add @stratix/db-mongodb
```

## Features

- **Connection pooling** with configurable pool size
- **Transaction support** on replica sets
- **Health checks** with database ping
- **Repository pattern** with DDD support
- **Pagination** with metadata (total, pages, hasNext/Prev)
- **Index management** with declarative definitions
- **Aggregation pipeline builder** with fluent API
- **Soft deletes** pattern for logical deletion
- **Full MongoDB driver** support
- **Automatic reconnection**

## Quick Start

```typescript
import { ApplicationBuilder } from '@stratix/runtime';
import { MongoPlugin } from '@stratix/db-mongodb';

const app = await ApplicationBuilder.create()
  .usePlugin(new MongoPlugin(), {
    connectionString: 'mongodb://localhost:27017',
    database: 'mydb',
    maxPoolSize: 20
  })
  .build();

await app.start();
```

## Configuration

```typescript
interface MongoConfig {
  connectionString: string;         // Required: MongoDB connection URL
  database: string;                 // Required: Database name
  maxPoolSize?: number;             // Default: 10
  serverSelectionTimeoutMS?: number; // Default: 30000 (30s)
  options?: MongoClientOptions;     // Additional MongoDB options
}
```

## Repository Pattern

### Basic Repository

```typescript
import { MongoRepository } from '@stratix/db-mongodb';

class UserRepository extends MongoRepository<User, string> {
  protected collectionName = 'users';
  
  // Define indexes declaratively
  protected indexes = [
    { keys: { email: 1 }, options: { unique: true } },
    { keys: { createdAt: -1 } }
  ];

  protected extractId(user: User): string {
    return user.id;
  }

  protected toDocument(user: User): MongoDocument {
    return {
      _id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt
    };
  }

  protected toDomain(doc: MongoDocument): User {
    return new User(
      doc._id as string,
      doc.email as string,
      doc.name as string,
      doc.createdAt as Date
    );
  }
}

// Create indexes on startup
await userRepo.ensureIndexes();
```

## Pagination

```typescript
const result = await userRepo.findPaginated(
  { status: 'active' },
  { 
    page: 1, 
    pageSize: 20, 
    sort: { createdAt: -1 } 
  }
);

console.log(result.data);        // Array of entities
console.log(result.total);       // Total count
console.log(result.totalPages);  // Total pages
console.log(result.hasNext);     // Has next page?
console.log(result.hasPrev);     // Has previous page?
```

## Aggregation Pipeline

```typescript
// Fluent API for building pipelines
const stats = await userRepo.aggregate(
  userRepo.aggregation()
    .match({ status: 'active' })
    .group({
      _id: '$country',
      count: { $sum: 1 },
      avgAge: { $avg: '$age' }
    })
    .sort({ count: -1 })
    .limit(10)
    .build()
);

// Supports: match, group, sort, limit, skip, lookup, project, unwind, count
```

## Soft Deletes

```typescript
import { SoftDeleteMongoRepository, SoftDeletable } from '@stratix/db-mongodb';

interface User extends SoftDeletable {
  id: string;
  email: string;
  name: string;
  deletedAt?: Date;
  isDeleted?: boolean;
}

class UserRepository extends SoftDeleteMongoRepository<User, string> {
  protected collectionName = 'users';
  // ... implement toDocument, toDomain, extractId
}

// Soft delete (sets deletedAt and isDeleted)
await userRepo.softDelete(userId);

// Restore
await userRepo.restore(userId);

// Find only active users
const activeUsers = await userRepo.findAllActive();

// Find only deleted users
const deletedUsers = await userRepo.findAllDeleted();

// Permanent delete (bypass soft delete)
await userRepo.permanentDelete(userId);
```

## Index Management

```typescript
// Declarative indexes in repository
protected indexes = [
  { 
    keys: { email: 1 }, 
    options: { unique: true } 
  },
  { 
    keys: { 'profile.country': 1, status: 1 } 
  },
  {
    keys: { location: '2dsphere' }
  }
];

// Create indexes
await userRepo.ensureIndexes();

// Or create individual index
await userRepo.createIndex({ email: 1 }, { unique: true });

// List all indexes
const indexes = await userRepo.listIndexes();
```

## Transactions

```typescript
const connection = app.resolve('mongo:connection');
const uow = connection.createUnitOfWork();

await uow.begin();
try {
  const users = uow.collection('users');
  await users.insertOne({ name: 'Jane Doe' });
  
  const orders = uow.collection('orders');
  await orders.insertOne({ userId: '123', total: 100 });
  
  await uow.commit();
} catch (error) {
  await uow.rollback();
  throw error;
}
```

## Exports

### Core
- `MongoPlugin` - Main plugin class
- `MongoConnection` - Connection wrapper
- `MongoRepository<E, ID>` - Base repository
- `MongoUnitOfWork` - Transaction management
- `MongoDocument` - Document type

### Pagination
- `PaginationOptions` - Pagination input
- `PaginatedResult<T>` - Pagination output

### Indexing
- `IndexDefinition` - Index definition
- `IndexOptions` - Index options
- `IndexManager` - Index utilities

### Aggregation
- `MongoAggregationBuilder` - Pipeline builder

### Patterns
- `SoftDeleteMongoRepository<E, ID>` - Soft delete repository
- `SoftDeletable` - Soft delete interface

## Services Registered

- `mongo:connection` - MongoConnection instance
- `mongo:client` - Native MongoClient
- `mongo:createUnitOfWork` - UnitOfWork factory

## License

MIT
