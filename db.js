// Database setup for BizTime.
const { Client } = require("pg");

const client = new Client({
  connectionString: 'postgresql:///biztime',
});

client.connect()
  .then(() => console.log('Database connected successfully'))
  .catch((err) => console.error('Database connection error:', err));

module.exports = client;