import { UserEntity } from '../domain/UserEntity.js';
import { UserRepository } from '../domain/UserRepository.js';

export class InMemoryUserRepository implements UserRepository {
  save(user: UserEntity): Promise<void> {
    console.log('User saved:', user);
    return Promise.resolve();
  }
}
