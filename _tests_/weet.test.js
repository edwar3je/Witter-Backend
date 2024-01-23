process.env.NODE_ENV = 'test';

const db = require('../db');
const bcrypt = require('bcrypt');
const { BCRYPT_WORK_FACTOR } = require('../config');

const Weet = require('../models/Weet');

beforeEach(async () => {

    let sampleUsers = [
        ['handle1', 'user1', await bcrypt.hash('password1', BCRYPT_WORK_FACTOR), 'email1'],
        ['handle2', 'user2', await bcrypt.hash('password2', BCRYPT_WORK_FACTOR), 'email2'],
        ['handle3', 'user3', await bcrypt.hash('password3', BCRYPT_WORK_FACTOR), 'email3']
    ];

    for (let user of sampleUsers){
        await db.query(
            `INSERT INTO users (handle, username, password, email) VALUES ($1, $2, $3, $4)`,
            [...user]
        )
    };

    let sampleWeets = [
        ['Just an example weet', 'handle1'],
        ['Just enjoying my day', 'handle2'],
        ['Good morning New York', 'handle3']
    ];

    for (let weet of sampleWeets){
        await db.query(
            `INSERT INTO weets (weet, author, time_date) VALUES ($1, $2, NOW())`,
            [...weet]
        )
    }
});

afterEach(async () => {
    await db.query('DELETE FROM weets');
    await db.query('DELETE FROM users');
});

afterAll(() => {
    db.end();
});

describe('get', () => {
    test('works if the id provided is valid', async () => {
        const firstWeet = await db.query(`SELECT * FROM weets WHERE author = 'handle1'`);
        const result = await Weet.get(firstWeet.rows[0].id);
        expect(firstWeet.rows[0].id).toEqual(result.id);
        expect(firstWeet.time).toBeUndefined();
        expect(result.time).toBeDefined();
    });

    test('throws an error if the id provided is invalid', () => {
        expect(async () => {
            await Weet.get(-1)
        }).rejects.toThrow()
    });
});

describe('create', () => {
    test('creates a new weet if a valid handle is provided for the author', async () => {
        const result = await Weet.create('A test weet generated for testing.', 'handle1');
        expect(result.weet).toEqual('A test weet generated for testing.');
        const check = await db.query(`SELECT * FROM weets WHERE weet = 'A test weet generated for testing.'`);
        expect(check.rows[0].id).toEqual(result.id);
        expect(result.time).toBeDefined();
        expect(result.date).toBeDefined();
        expect(check.time).toBeUndefined();
        expect(check.date).toBeUndefined();
    });
    test('does not create a new weet if an invalid handle is provided for the author', () => {
        expect(async () => {
            await Weet.create('not_a_user', 'A test weet generated for testing.')
        }).rejects.toThrow();
    });
});

describe('edit', () => {
    test('edits an existing weet if a valid weet id is provided', async () => {
        const firstWeet = await db.query(`SELECT * FROM weets WHERE author = 'handle1'`);
        expect(firstWeet.rows[0].weet).toEqual('Just an example weet');
        const edit = await Weet.edit(firstWeet.rows[0].id, 'an edited weet');
        const checkEdit = await Weet.get(firstWeet.rows[0].id);
        expect(checkEdit.weet).toEqual('an edited weet');
        expect(edit.time).toBeDefined();
        expect(edit.date).toBeDefined();
    });

    test('throws an error if an invalid weet id is provided', async () => {
        expect(async () => {
            await Weet.edit(-1, 'an edited weet')
        }).rejects.toThrow();
    })
});

describe('delete', () => {
    test('deletes an existing weet if a valid weet id is provided', async () => {
        const firstWeet = await db.query(`SELECT * FROM weets WHERE author = 'handle1'`);
        expect(firstWeet.rows[0].weet).toEqual('Just an example weet');
        const result = await Weet.delete(firstWeet.rows[0].id);
        expect(result).toEqual('Weet succesfully deleted.');
        const check = await db.query(`SELECT * FROM weets WHERE author = 'handle1'`);
        expect(check.rows).toEqual([]);
    });

    test('throws an error if an invalid weet id is provided', async () => {
        expect(async () => {
            await Weet.delete(-1)
        }).rejects.toThrow()
    });
});