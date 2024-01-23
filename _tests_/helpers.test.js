process.env.NODE_ENV = 'test';

const db = require('../db');
const bcrypt = require('bcrypt');
const { BCRYPT_WORK_FACTOR } = require('../config');
const jwt = require('jsonwebtoken');

const createToken = require('../helpers/createToken');
const convertTime = require('../helpers/convertTime');

beforeEach(async () => {
    const user = ['handle1', 'user1', await bcrypt.hash('password1', BCRYPT_WORK_FACTOR), 'email1'];
    
    await db.query(
        'INSERT INTO users (handle, username, password, email) VALUES ($1, $2, $3, $4)',
        [...user]
    );

    await db.query(
        'INSERT INTO weets (weet, author, time_date) VALUES ($1, $2, NOW())',
        ['Just an example weet', 'handle1']
    );
});

afterEach(async () => {
    await db.query('DELETE FROM weets');
    await db.query('DELETE FROM users');
});

afterAll(() => {
    db.end();
})

describe('createToken', () => {
    test('createToken should create a string representing a token that contains information', async () => {
        const info = {user: 'edwar3je', password: 'somepassword', email: 'someemail'};
        const result = createToken(info);
        expect(result).not.toEqual(info);
        const decode = jwt.decode(result);
        expect(decode.user).toEqual('edwar3je');
        expect(decode.password).toEqual('somepassword');
        expect(decode.email).toEqual('someemail');
        expect(decode.iat).toBeTruthy();
    });
});

describe('convertTime', () => {
    test('convertTime should create a new object that contains a string representation of the timestamp', async () => {
        const firstWeet = await db.query('SELECT * FROM weets WHERE author = $1', ['handle1']);
        const result = convertTime(firstWeet.rows[0]);
        expect(result.id).toEqual(firstWeet.rows[0].id);
        expect(result.author).toEqual('handle1');
        expect(result.weet).toEqual(firstWeet.rows[0].weet);
        expect(result.time_date).toEqual(firstWeet.rows[0].time_date);
        expect(typeof(result.time)).toEqual('string');
        expect(typeof(result.date)).toEqual('string');
    });
    test('throws an error if a non-object data type is provided', () => {
        expect(() => {
            convertTime('not_an_object');
        }).toThrow();
    });
    test('throws an error if an object is provided that does not contain a defined time_date field', async () => {
        expect(() => {
            convertTime({handle: 'handle1'})
        }).toThrow();
    });
    test('throws an error if an object is provided that does not contain a valid time stamp in the time_date field', async () => {
        expect(() => {
            convertTime({time_date: 'not_a_timestamp'})
        }).toThrow();
    });
    test('throws an error if no data is provided', async () => {
        expect(() => {
            convertTime()
        }).toThrow();
    });
});