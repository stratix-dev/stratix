import { Aggregate, DomainEvent } from "@stratix/framework";

@Aggregate({autoTimestamps: true, autoEvents: true})
export class User {
    private _id: string;
    private _name: string;
    private _email: string;

    constructor(id: string, name: string, email: string) {
        this._id = id;
        this._name = name;
        this._email = email;
    }

    static create(id: string, name: string, email: string): User {
        return new User(id, name, email);
    }

    get id(): string {
        return this._id;
    }

    get name(): string {
        return this._name;
    }
}