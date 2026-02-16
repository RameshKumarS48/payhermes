require('dotenv').config();

const connection = process.env.DATABASE_URL;

// Railway internal connections don't need SSL
const needsSsl = connection && !connection.includes('.railway.internal');

module.exports = {
  development: {
    client: 'pg',
    connection,
    migrations: { directory: './src/db/migrations' },
    seeds: { directory: './src/db/seeds' },
    pool: { min: 2, max: 10 },
  },
  production: {
    client: 'pg',
    connection: needsSsl
      ? { connectionString: connection, ssl: { rejectUnauthorized: false } }
      : connection,
    migrations: { directory: './src/db/migrations' },
    seeds: { directory: './src/db/seeds' },
    pool: { min: 2, max: 20 },
  },
};
