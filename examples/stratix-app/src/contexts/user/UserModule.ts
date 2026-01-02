import { Module } from "@stratix/framework";
import { InMemoryUserRepository } from "./infrastructure/InMemoryUserRepository.js";

@Module({
    providers: [InMemoryUserRepository]
})
 export class UserModule {

}