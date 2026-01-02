import { bootstrap, StratixApp } from "@stratix/framework";
import { UserModule } from "./contexts/user/UserModule.js";
import { CreateUser } from "./contexts/user/application/CreateUser.js";

@StratixApp({
  modules: [UserModule],
})
export class App{}

async function main () {
    const app = await bootstrap(App);
    console.log("Stratix App started");
    console.log('1. Creating user...');

}