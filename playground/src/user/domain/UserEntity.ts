export class UserEntity {
  private readonly id: string;
  private name: string;
  private email: string;

  constructor(id: string, name: string, email: string) {
    this.id = id;
    this.name = name;
    this.email = email;
  }

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getEmail(): string {
    return this.email;
  }

  setName(name: string): void {
    this.name = name;
  }

  setEmail(email: string): void {
    this.email = email;
  }
}
