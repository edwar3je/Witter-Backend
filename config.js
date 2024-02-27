require('dotenv');

const SECRET_KEY = process.env.SECRET_KEY || 'witter-secret-key';

const PORT = +process.env.PORT || 3000;

const BCRYPT_WORK_FACTOR = 11;

module.exports = {
    BCRYPT_WORK_FACTOR,
    SECRET_KEY,
    PORT
}