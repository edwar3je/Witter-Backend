process.env.NODE_ENV = 'test';

const db = require('../db');
const bcrypt = require('bcrypt');
const { BCRYPT_WORK_FACTOR } = require('../config');
const jwt = require('jsonwebtoken');

const createToken = require('../helpers/createToken');
const convertTime = require('../helpers/convertTime');
const getStats = require('../helpers/getStats');
const getAuthor = require('../helpers/getAuthor');

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

    const firstWeet = await db.query('SELECT * FROM weets WHERE author = $1', ['handle1']);

    await db.query(
        `INSERT INTO reweets (weet_id, user_id, time_date) VALUES ($1, $2, NOW()), ($3, $4, NOW())`,
        [firstWeet.rows[0].id, 'handle1', firstWeet.rows[0].id, 'handle2']
    );

    await db.query(
        `INSERT INTO favorites (weet_id, user_id, time_date) VALUES ($1, $2, NOW())`,
        [firstWeet.rows[0].id, 'handle1']
    );

    await db.query(
        `INSERT INTO tabs (weet_id, user_id, time_date) VALUES ($1, $2, NOW()), ($3, $4, NOW()), ($5, $6, NOW())`,
        [firstWeet.rows[0].id, 'handle1', firstWeet.rows[0].id, 'handle2', firstWeet.rows[0].id, 'handle3']
    );
});

afterEach(async () => {
    await db.query('DELETE FROM followers');
    await db.query('DELETE FROM favorites');
    await db.query('DELETE FROM reweets');
    await db.query('DELETE FROM tabs');
    await db.query('DELETE FROM weets');
    await db.query('DELETE FROM users');
});

afterAll(() => {
    db.end();
})

describe('createToken', () => {
    test('it should create a string representing a token that contains information', async () => {
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
    test('it should create a new object that contains a string representation of the timestamp', async () => {
        const firstWeet = await db.query('SELECT * FROM weets WHERE author = $1', ['handle1']);
        const result = convertTime(firstWeet.rows[0]);
        expect(result.id).toEqual(firstWeet.rows[0].id);
        expect(result.author).toEqual('handle1');
        expect(result.weet).toEqual(firstWeet.rows[0].weet);
        expect(result.time_date).toEqual(firstWeet.rows[0].time_date);
        expect(typeof(result.time)).toEqual('string');
        expect(typeof(result.date)).toEqual('string');
    });

    test('it should throw an error if a non-object data type is provided', () => {
        expect(() => {
            convertTime('not_an_object');
        }).toThrow();
    });

    test('it should throw an error if an object is provided that does not contain a defined time_date field', async () => {
        expect(() => {
            convertTime({handle: 'handle1'})
        }).toThrow();
    });

    test('it should throw an error if an object is provided that does not contain a valid time stamp in the time_date field', async () => {
        expect(() => {
            convertTime({time_date: 'not_a_timestamp'})
        }).toThrow();
    });

    test('it should throw an error if no data is provided', async () => {
        expect(() => {
            convertTime()
        }).toThrow();
    });
});

describe('getStats', () => {
    test('it should return accurate data (weet has a few reweets, favorites and tabs)', async () => {
        const firstWeet = await db.query(`SELECT * FROM weets WHERE author = $1`, ['handle1']);
        const result = await getStats(firstWeet.rows[0].id);
        expect(result).toEqual({reweets: 2, favorites: 1, tabs: 3});
    });

    test('it should return accurate data (weet does not have any reweets, favorites or tabs', async () => {
        const secondWeet = await db.query(`SELECT * FROM weets WHERE author = $1`, ['handle2']);
        const result = await getStats(secondWeet.rows[0].id);
        expect(result).toEqual({reweets: 0, favorites: 0, tabs: 0})
    });

    test('it should throw an error if an invalid weet id is provided', async () => {
        expect(async () => {
            await getStats(-1)
        }).rejects.toThrow();
    });
});

describe('getAuthor', () => {
    test('it should return accurate data if a valid handle is provided', async () => {
        const result = await getAuthor('handle1');
        expect(result).toEqual({username: 'user1', user_description: 'A default user description', profile_image: 'A default profile image', banner_image: 'A default banner image'});
    });

    test('it should throw an error if an in invalid handle is provided', async () => {
        expect(async () => {
            await getAuthor('not_a_handle')
        }).rejects.toThrow();
    });
});