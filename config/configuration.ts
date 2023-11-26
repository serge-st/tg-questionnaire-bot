export default () => ({
  port: parseInt(process.env.APP_PORT) || 3000,
  database: {
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT),
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DATABASE,
  },
  mode: process.env.APP_MODE || 'production',
});
