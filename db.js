require('dotenv').config();
const mysql = require('mysql2/promise');

const charPool = mysql.createPool({
  host: process.env.CHAR_DB_HOST,
  port: Number(process.env.CHAR_DB_PORT || 3306),
  user: process.env.CHAR_DB_USER,
  password: process.env.CHAR_DB_PASSWORD,
  database: process.env.CHAR_DB_NAME,
  waitForConnections: true,
  connectionLimit: 5,
});

const playerbotsPool = mysql.createPool({
  host: process.env.PLAYERBOTS_DB_HOST,
  port: Number(process.env.PLAYERBOTS_DB_PORT || 3306),
  user: process.env.PLAYERBOTS_DB_USER,
  password: process.env.PLAYERBOTS_DB_PASSWORD,
  database: process.env.PLAYERBOTS_DB_NAME,
  waitForConnections: true,
  connectionLimit: 2,
});

module.exports = { charPool, playerbotsPool };
