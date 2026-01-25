import { bootstrap } from '@stratix/framework';
import { MyHttpApp } from './app/MyHttpApp.js';

console.log('Starting MyHttpApp...');

const app = await bootstrap(MyHttpApp, ['playground/src']);
await app.initialize();
