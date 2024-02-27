const { Client } = require('pg');

let DB_URI;

let client;

if (process.env.NODE_ENV === 'test') {
    DB_URI = 'witter_test'
} else if (process.env.DATABASE_URL) {
    DB_URI = process.env.DATABASE_URL
} else {
    DB_URI = 'witter'
}

if(process.env.DATABASE_URL) {
    client = new Client({
        connectionString: DB_URI
    });
} else {
    client = new Client({
        host: '/var/run/postgresql/',
        database: DB_URI
    });
}

client.connect();

module.exports = client;