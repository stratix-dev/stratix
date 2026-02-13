export const appConfig = {
  port: 3000,
  env: 'development',
  database: {
    host: 'localhost',
    port: 5432,
    name: 'stratix_dev'
  },
  logging: {
    level: 'info',
    pretty: true
  }
};

export type AppConfig = typeof appConfig;
