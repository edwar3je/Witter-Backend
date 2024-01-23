require('dotenv');

const SECRET_KEY = process.env.SECRET_KEY || 'witter-secret-key';

const PORT = +process.env.PORT || 3000;

const BCRYPT_WORK_FACTOR = 11;

const DB_URI = process.env.NODE_ENV === 'test' ? 'witter_test' : 'witter';

module.exports = {
    BCRYPT_WORK_FACTOR,
    SECRET_KEY,
    PORT,
    DB_URI
}