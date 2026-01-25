import * as http from 'node:http';

export class MyHttpApp {
  private server: http.Server;

  constructor() {
    console.log('MyHttpApp initialized');
    this.server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Hello, World! From the new and improved MyHttpApp!\n');
    });

    const port = 3000;
    this.server.listen(port, () => {
      console.log(`MyHttpApp listening on port ${port}`);
      console.log('You can now attach the debugger.');
    });
  }

  public stop(): void {
    this.server.close();
  }
}
