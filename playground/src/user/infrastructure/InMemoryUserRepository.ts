import { UserEntity } from '../domain/UserEntity.js';

export class InMemoryUserRepository {
  save(user: UserEntity): Promise<void> {
    console.log('User saved:', user);
    return Promise.resolve();
  }
}
