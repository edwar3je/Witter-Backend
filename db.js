const { Client } = require('pg');
const { DB_URI } = require('./config');

const client = new Client({
    host: '/var/run/postgresql/',
    database: DB_URI
});

client.connect();

module.exports = client;