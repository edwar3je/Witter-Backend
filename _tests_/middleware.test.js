process.env.NODE_ENV = 'test';

const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { BCRYPT_WORK_FACTOR, SECRET_KEY } = require('../config');

const createToken = require('../helpers/createToken');

const ensureSignedIn = require('../middleware/ensureSignedIn');
const ensureTokenOrigin = require('../middleware/ensureTokenOrigin');
const ensureAuthor = require('../middleware/ensureAuthor');

beforeEach(async () => {
    const users = [
        ['handle1', 'user1', await bcrypt.hash('password1', BCRYPT_WORK_FACTOR), 'email1'],
        ['handle2', 'user2', await bcrypt.hash('password2', BCRYPT_WORK_FACTOR), 'email2']
    ];

    for (let user of users){
        await db.query(
            `INSERT INTO users (handle, username, password, email) VALUES ($1, $2, $3, $4)`,
            [...user]
        );
    };

    const weets = [
        ['The first weet', 'handle1'],
        ['The second weet', 'handle2']
    ];

    for (let weet of weets){
        await db.query(
            `INSERT INTO weets (weet, author, time_date) VALUES ($1, $2, NOW())`,
            [...weet]
        );
    };
});

describe('ensureSignedIn', () => {
    test('it should work if a valid json web token is provided that contains a valid user handle', async () => {
        const validToken = createToken({handle: 'handle1', username: 'user1', email: 'email1'});
        const req = { body: { _token: validToken } };
        const res = {};
        const next = function (err) {
            expect(err).toBeFalsy();
        };
        await ensureSignedIn(req, res, next);
    });

    test('it should throw an error if a valid json web token is provided that contains an invalid user handle', async () => {
        const invalidToken = createToken({handle: 'not a handle'});
        const req = { body: { _token: invalidToken } };
        const res = {};
        const next = function (err) {
            expect(err).toBeTruthy();
            expect(err.status).toEqual(401);
        };
        await ensureSignedIn(req, res, next);
    });

    test('it should throw an error if a valid json web token is provided that does not contain a user handle', async () => {
        const invalidToken = createToken({nonHandle: 'not a handle'});
        const req = { body: { _token: invalidToken } };
        const res = {};
        const next = function (err) {
            expect(err).toBeTruthy();
            expect(err.status).toEqual(401);
        };
        await ensureSignedIn(req, res, next);
    });

    test('it should throw an error if a non-decodable string is provided', async () => {
        const invalidToken = 'not a token';
        const req = { body: { _token: invalidToken } };
        const res = {};
        const next = function (err) {
            expect(err).toBeTruthy();
            expect(err.status).toEqual(401);
        };
        await ensureSignedIn(req, res, next);
    });

    test('it should throw an error if a non-string data type is provided', async () => {
        const invalidToken = ['not a token', 'still not a token'];
        const req = { body: { _token: invalidToken } };
        const res = {};
        const next = function (err) {
            expect(err).toBeTruthy();
            expect(err.status).toEqual(401);
        };
        await ensureSignedIn(req, res, next);
    });

    test('it should throw an error if no data is provided', async () => {
        const req = { body: {} };
        const res = {};
        const next = function (err) {
            expect(err).toBeTruthy();
            expect(err.status).toEqual(401);
        };
        await ensureSignedIn(req, res, next);
    });
});

describe('ensureTokenOrigin', () => {
    test('it should work if a valid json web token is provided that was signed using the secret key in config.js', () => {
        const validToken = createToken({handle: 'handle1'});
        const req = { body: { _token: validToken } };
        const res = {};
        const next = function (err) {
            expect(err).toBeFalsy()
        };
        ensureTokenOrigin(req, res, next);
    });

    test('it should throw an error if a valid json web token is provided that was signed using a different secret key', () => {
        const invalidToken = jwt.sign({handle: 'handle1'}, 'some other secret key');
        const req = { body: { _token: invalidToken } };
        const res = {};
        const next = function (err) {
            expect(err).toBeTruthy();
            expect(err.status).toEqual(401);
        };
        ensureTokenOrigin(req, res, next);
    });

    test('it should throw an error if the string provided is not decodable', () => {
        const invalidToken = 'not a token';
        const req = { body: { _token: invalidToken } };
        const res = {};
        const next = function (err) {
            expect(err).toBeTruthy();
            expect(err.status).toEqual(401);
        };
        ensureTokenOrigin(req, res, next);
    });

    test('it should throw an error if the data type provided is not a string', () => {
        const invalidToken = ['not a token', 'still not a token'];
        const req = { body: { _token: invalidToken } };
        const res = {};
        const next = function (err) {
            expect(err).toBeTruthy();
            expect(err.status).toEqual(401);
        };
        ensureTokenOrigin(req, res, next);
    });

    test('it should throw an error if no data is provided', () => {
        const req = { body: {} };
        const res = {};
        const next = function (err) {
            expect(err).toBeTruthy();
            expect(err.status).toEqual(401);
        };
        ensureTokenOrigin(req, res, next);
    });
});

describe('ensureAuthor', () => {
    test('it should work if a valid json web token and weet are provided where the user and author are the same', () => {
        const validToken = createToken({handle: 'handle1'});
        const req = { body: { _token: validToken, _weet: {author: 'handle1'} } };
        const res = {};
        const next = function (err) {
            expect(err).toBeFalsy();
        };
        ensureAuthor(req, res, next);
    });

    test('it should throw an error if a valid json web token and weet are provided where the user and author are different', () => {
        const validToken = createToken({handle: 'handle1'});
        const req = { body: { _token: validToken, _weet: {author: 'handle2'} } };
        const res = {};
        const next = function (err) {
            expect(err).toBeTruthy();
            expect(err.status).toEqual(401);
        };
        ensureAuthor(req, res, next);
    });

    test('it should throw an error if an invalid json web token is provided', () => {
        const invalidToken = createToken({noHandle: 'not a handle'});
        const req = { body: { _token: invalidToken, _weet: {author: 'handle1'} } };
        const res = {};
        const next = function (err) {
            expect(err).toBeTruthy();
            expect(err.status).toEqual(401);
        };
        ensureAuthor(req, res, next);
    });

    test('it should throw an error if an invalid weet is provided', () => {
        const validToken = createToken({handle: 'handle1'});
        const req = { body: { _token: validToken, _weet: {noAuthor: 'not an author'} } };
        const res = {};
        const next = function (err) {
            expect(err).toBeTruthy();
            expect(err.status).toEqual(401);
        };
        ensureAuthor(req, res, next);
    });

    test('it should throw an error if an invalid json web token and invalid weet are provided', () => {
        const invalidToken = createToken({noHandle: 'not a handle'});
        const req = { body: { _token: invalidToken, _weet: {noAuthor: 'not an author'} } };
        const res = {};
        const next = function (err) {
            expect(err).toBeTruthy();
            expect(err.status).toEqual(401);
        };
        ensureAuthor(req, res, next);
    });

    test('it should throw an error if a json web token is not provided', () => {
        const req = { body: { _weet: {author: 'handle1'} } };
        const res = {};
        const next = function (err) {
            expect(err).toBeTruthy();
            expect(err.status).toEqual(401);
        };
        ensureAuthor(req, res, next);
    });

    test('it should throw an error if a weet is not provided', () => {
        const validToken = createToken({handle: 'handle1'});
        const req = { body: { _token: validToken} };
        const res = {};
        const next = function (err) {
            expect(err).toBeTruthy();
            expect(err.status).toEqual(401);
        };
        ensureAuthor(req, res, next);
    });

    test('it should throw an error if neither a json web token, nor a weet are provided', () => {
        const req = { body: {} };
        const res = {};
        const next = function (err) {
            expect(err).toBeTruthy();
            expect(err.status).toEqual(401);
        };
        ensureAuthor(req, res, next);
    });
})

afterEach(async () => {
    await db.query(`DELETE FROM weets`);
    await db.query(`DELETE FROM users`);
});

afterAll(async () => {
    await db.end();
});