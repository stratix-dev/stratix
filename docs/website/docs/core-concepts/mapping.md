---
sidebar_position: 4
title: Mappers
description: Domain-persistence mapping with @stratix/mappers
---

# Mappers

**Package:** `@stratix/core`

The `Mapper` interface provides a type-safe way to convert between domain entities and persistence models (DTOs), following Domain-Driven Design principles. It is now part of the core package.

## Installation

Since `Mapper` is part of `@stratix/core`, no additional installation is required.

## Mapper Interface

```typescript
export interface Mapper<Domain, Persistence> {
  toDomain(raw: Persistence): Domain;
  toPersistence(entity: Domain): Persistence;
}
```

## Basic Usage

```typescript
import { Mapper } from '@stratix/core';

interface UserPersistence {
  id: string;
  email: string;
  name: string;
  created_at: Date;
}

class UserMapper implements Mapper<User, UserPersistence> {
  toDomain(raw: UserPersistence): User {
    return User.reconstitute(
      UserId.create(raw.id),
      Email.create(raw.email),
      raw.name,
      raw.created_at
    );
  }

  toPersistence(entity: User): UserPersistence {
    return {
      id: entity.id.value,
      email: entity.email.value,
      name: entity.name,
      created_at: entity.createdAt
    };
  }
}
```

## Usage in Repositories

```typescript
import { Repository } from '@stratix/core';
import { Mapper } from '@stratix/core';

export class PostgresUserRepository implements Repository<User, string> {
  constructor(
    private db: Database,
    private mapper: Mapper<User, UserPersistence>
  ) {}

  async save(user: User): Promise<void> {
    const data = this.mapper.toPersistence(user);
    
    await this.db.query(
      `INSERT INTO users (id, email, name, created_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE
       SET email = $2, name = $3`,
      [data.id, data.email, data.name, data.created_at]
    );
  }

  async findById(id: string): Promise<User | null> {
    const result = await this.db.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapper.toDomain(result.rows[0]);
  }
}
```

## Complex Mapping Examples

### Aggregate with Value Objects

```typescript
class OrderMapper implements Mapper<Order, OrderPersistence> {
  toDomain(raw: OrderPersistence): Order {
    const items = raw.items.map(item => 
      OrderItem.create(
        ProductId.create(item.product_id),
        item.quantity,
        Money.create(item.price, item.currency)
      )
    );

    return Order.reconstitute(
      OrderId.create(raw.id),
      CustomerId.create(raw.customer_id),
      items,
      OrderStatus.create(raw.status),
      raw.created_at
    );
  }

  toPersistence(order: Order): OrderPersistence {
    return {
      id: order.id.value,
      customer_id: order.customerId.value,
      status: order.status.value,
      items: order.items.map(item => ({
        product_id: item.productId.value,
        quantity: item.quantity,
        price: item.price.amount,
        currency: item.price.currency
      })),
      created_at: order.createdAt
    };
  }
}
```

### Nested Entities

```typescript
class BlogPostMapper implements Mapper<BlogPost, BlogPostPersistence> {
  constructor(
    private commentMapper: Mapper<Comment, CommentPersistence>
  ) {}

  toDomain(raw: BlogPostPersistence): BlogPost {
    const comments = raw.comments.map(c => 
      this.commentMapper.toDomain(c)
    );

    return BlogPost.reconstitute(
      PostId.create(raw.id),
      raw.title,
      raw.content,
      AuthorId.create(raw.author_id),
      comments,
      raw.published_at
    );
  }

  toPersistence(post: BlogPost): BlogPostPersistence {
    return {
      id: post.id.value,
      title: post.title,
      content: post.content,
      author_id: post.authorId.value,
      comments: post.comments.map(c => 
        this.commentMapper.toPersistence(c)
      ),
      published_at: post.publishedAt
    };
  }
}
```

### Handling Nulls and Optionals

```typescript
class ProfileMapper implements Mapper<Profile, ProfilePersistence> {
  toDomain(raw: ProfilePersistence): Profile {
    return Profile.reconstitute(
      ProfileId.create(raw.id),
      raw.bio ?? undefined,
      raw.avatar_url ? Url.create(raw.avatar_url) : undefined,
      raw.birth_date ? new Date(raw.birth_date) : undefined
    );
  }

  toPersistence(profile: Profile): ProfilePersistence {
    return {
      id: profile.id.value,
      bio: profile.bio ?? null,
      avatar_url: profile.avatarUrl?.value ?? null,
      birth_date: profile.birthDate?.toISOString() ?? null
    };
  }
}
```

## Mapper Composition

Create reusable mappers for common patterns:

```typescript
class AddressMapper implements Mapper<Address, AddressPersistence> {
  toDomain(raw: AddressPersistence): Address {
    return Address.create(
      raw.street,
      raw.city,
      raw.state,
      raw.zip_code,
      raw.country
    );
  }

  toPersistence(address: Address): AddressPersistence {
    return {
      street: address.street,
      city: address.city,
      state: address.state,
      zip_code: address.zipCode,
      country: address.country
    };
  }
}

class CustomerMapper implements Mapper<Customer, CustomerPersistence> {
  constructor(private addressMapper: AddressMapper) {}

  toDomain(raw: CustomerPersistence): Customer {
    return Customer.reconstitute(
      CustomerId.create(raw.id),
      raw.name,
      Email.create(raw.email),
      this.addressMapper.toDomain(raw.address)
    );
  }

  toPersistence(customer: Customer): CustomerPersistence {
    return {
      id: customer.id.value,
      name: customer.name,
      email: customer.email.value,
      address: this.addressMapper.toPersistence(customer.address)
    };
  }
}
```

## Array Mapping Helpers

```typescript
class BaseMapper<Domain, Persistence> 
  implements Mapper<Domain, Persistence> {
  
  toDomain(raw: Persistence): Domain {
    throw new Error('Must implement');
  }

  toPersistence(entity: Domain): Persistence {
    throw new Error('Must implement');
  }

  toDomainArray(rawArray: Persistence[]): Domain[] {
    return rawArray.map(raw => this.toDomain(raw));
  }

  toPersistenceArray(entities: Domain[]): Persistence[] {
    return entities.map(entity => this.toPersistence(entity));
  }
}
```

## Best Practices

### 1. One Mapper Per Aggregate

```typescript
// ✅ Good: One mapper for User aggregate
class UserMapper implements Mapper<User, UserPersistence> {
  // ...
}

// ❌ Bad: Multiple mappers for same aggregate
class UserDomainMapper { /* ... */ }
class UserPersistenceMapper { /* ... */ }
```

### 2. Handle All Fields

```typescript
// ✅ Good: All fields mapped
toPersistence(user: User): UserPersistence {
  return {
    id: user.id.value,
    email: user.email.value,
    name: user.name,
    created_at: user.createdAt,
    updated_at: user.updatedAt
  };
}

// ❌ Bad: Missing fields
toPersistence(user: User): UserPersistence {
  return {
    id: user.id.value,
    email: user.email.value
    // Missing name, created_at, updated_at
  };
}
```

### 3. Use Type Safety

```typescript
// ✅ Good: Strongly typed
class UserMapper implements Mapper<User, UserPersistence> {
  toDomain(raw: UserPersistence): User {
    // TypeScript ensures all fields are handled
  }
}

// ❌ Bad: Weak typing
class UserMapper {
  toDomain(raw: any): any {
    // No type safety
  }
}
```

### 4. Inject Mappers in Repositories

```typescript
// ✅ Good: Mapper injected
class UserRepository {
  constructor(
    private db: Database,
    private mapper: Mapper<User, UserPersistence>
  ) {}
}

// ❌ Bad: Mapper created inside
class UserRepository {
  private mapper = new UserMapper();
}
```

## Testing Mappers

```typescript
import { describe, it, expect } from 'vitest';

describe('UserMapper', () => {
  const mapper = new UserMapper();

  it('should map to domain', () => {
    const raw: UserPersistence = {
      id: '123',
      email: 'user@example.com',
      name: 'John',
      created_at: new Date('2024-01-01')
    };

    const user = mapper.toDomain(raw);

    expect(user.id.value).toBe('123');
    expect(user.email.value).toBe('user@example.com');
    expect(user.name).toBe('John');
  });

  it('should map to persistence', () => {
    const user = User.create(
      Email.create('user@example.com'),
      'John'
    );

    const raw = mapper.toPersistence(user);

    expect(raw.email).toBe('user@example.com');
    expect(raw.name).toBe('John');
    expect(raw.created_at).toBeInstanceOf(Date);
  });

  it('should be reversible', () => {
    const original: UserPersistence = {
      id: '123',
      email: 'user@example.com',
      name: 'John',
      created_at: new Date('2024-01-01')
    };

    const domain = mapper.toDomain(original);
    const persistence = mapper.toPersistence(domain);

    expect(persistence).toEqual(original);
  });
});
```

## Next Steps

- **[Domain Modeling](../core-concepts/domain-modeling)** - Learn about entities and value objects
- **[Domain Layer](../core-concepts/architecture-overview#1-domain-layer-core)** - Use mappers in repositories
- **[Database Plugins](../database/database-overview)** - Integrate with databases
