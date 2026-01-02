import { User } from "./User.js";

export interface UserRepository {
    save(user: User): Promise<User>;
}