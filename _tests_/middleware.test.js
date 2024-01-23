process.env.NODE_ENV = 'test';

const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { BCRYPT_WORK_FACTOR, SECRET_KEY } = require('../config');

const ensureSignedIn = require('../middleware/ensureSignedIn');
const ensureTokenOrigin = require('../middleware/ensureTokenOrigin');

beforeEach(async () => {
    await db.query(
        `INSERT INTO users (handle, username, password, email) VALUES ($1, $2, $3, $4)`,
        ['handle1', 'user1', await bcrypt.hash('password1', BCRYPT_WORK_FACTOR), 'email1']
    );
});

afterEach(async () => {
    await db.query(`DELETE FROM users`);
});

afterAll(async () => {
    await db.end();
});

describe('ensureSignedIn', () => {
    test('returns true if a valid json web token is provided that contains a valid user handle', async () => {
        const token = jwt.sign({handle: 'handle1'}, SECRET_KEY);
        const result = await ensureSignedIn(token);
        expect(result).toBeTruthy();
    });
    test('returns false if a valid json web token is provided that contains an invalid user handle', async () => {
        const token = jwt.sign({handle: 'not_a_handle'}, SECRET_KEY);
        const result = await ensureSignedIn(token);
        expect(result).toBeFalsy();
    });
    test('returns false if a valid json web token is provided that does not contain a user handle', async () => {
        const token = jwt.sign({user: 'user1'}, SECRET_KEY);
        const result = await ensureSignedIn(token);
        expect(result).toBeFalsy();
    });
    test('returns false if a non-decodable string is provided', async () => {
        const token = 'notajsonstring';
        const result = await ensureSignedIn(token);
        expect(result).toBeFalsy();
    });
    test('returns flase if a non-string data type is provided', async () => {
        const token = 245;
        const result = await ensureSignedIn(token);
        expect(result).toBeFalsy();
    });
    test('returns false if no data is provided', async () => {
        const result = await ensureSignedIn();
        expect(result).toBeFalsy();
    });
});

describe('ensureTokenOrigin', () => {
    test('returns true if a valid json web token is provided that was signed using the secret key in config.js', () => {
        const token = jwt.sign({handle: 'handle1'}, SECRET_KEY);
        const result = ensureTokenOrigin(token);
        expect(result).toBeTruthy();
    });
    test('returns false if a valid json web token is provided that was signed using a different secret key', () => {
        const token = jwt.sign({handle: 'handle1'}, 'some_other_secret');
        const result = ensureTokenOrigin(token);
        console.log('-----------------');
        console.log(result);
        console.log('-----------------');
        expect(result).toBeFalsy();
    });
    test('returns false if the string provided is not decodable', () => {
        const token = 'non_decodable_string';
        const result = ensureTokenOrigin(token);
        expect(result).toBeFalsy();
    });
    test('returns false if the data type provided is not a string', () => {
        const token = 245;
        const result = ensureTokenOrigin(token);
        expect(result).toBeFalsy();
    });
    test('returns false if no data is provided', () => {
        const result = ensureTokenOrigin();
        expect(result).toBeFalsy();
    });
});