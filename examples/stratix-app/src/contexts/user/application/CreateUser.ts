import { UUID } from "@stratix/core";
import { User } from "../domain/User.js";
import { UserRepository } from "../domain/UserRepository.js";
import { Inject, Injectable } from "@stratix/framework";
import { InMemoryUserRepository } from "../infrastructure/InMemoryUserRepository.js";

@Injectable()
export class CreateUser {

    @Inject("UserRepository")
    private readonly userRepository!: UserRepository;

    constructor() {}

    async execute(name: string, email: string): Promise<void> {
        const user = User.create(UUID.generate().toString(), name, email);
        const saved = await this.userRepository.save(user);
    }
}