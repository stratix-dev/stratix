import { Injectable } from "@stratix/framework";
import { User } from "../domain/User.js";
import { UserRepository } from "../domain/UserRepository.js";

@Injectable("UserRepository")
export class InMemoryUserRepository implements UserRepository {
      private users = new Map<string, User>();

  async save(user: User): Promise<User> {
    this.users.set(user.id, user);
    return user;
  }
}