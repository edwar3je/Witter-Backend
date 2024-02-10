process.env.NODE_ENV = 'test';

const db = require('../db');
const bcrypt = require('bcrypt');
const { BCRYPT_WORK_FACTOR } = require('../config');
const jwt = require('jsonwebtoken');

const createToken = require('../helpers/createToken');
const convertTime = require('../helpers/convertTime');
const getStats = require('../helpers/getStats');
const getAuthor = require('../helpers/getAuthor');
const hasReweeted = require('../helpers/hasReweeted');
const hasFavorited = require('../helpers/hasFavorited');
const hasTabbed = require('../helpers/hasTabbed');
const checkHandle = require('../helpers/checkHandle');
const checkUsername = require('../helpers/checkUsername');
const checkPassword = require('../helpers/checkPassword');
const checkEmailSignUp = require('../helpers/checkEmailSignUp');
const isValidSignUp = require('../helpers/isValidSignUp');

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
        expect(result).toEqual({username: 'user1', user_description: 'A default user description', profile_image: 'https://i.pinimg.com/736x/fb/1d/d6/fb1dd695cf985379da1909b2ceea3257.jpg', banner_image: 'https://cdn.pixabay.com/photo/2017/08/30/01/05/milky-way-2695569_640.jpg'});
    });

    test('it should throw an error if an in invalid handle is provided', async () => {
        expect(async () => {
            await getAuthor('not_a_handle')
        }).rejects.toThrow();
    });
});

describe('hasReweeted', () => {
    test('it should return true if the account (handle) has reweeted the weet', async () => {
        const firstWeet = await db.query(`SELECT * FROM weets WHERE author = $1`, ['handle1']);
        const result = await hasReweeted(firstWeet.rows[0].id, 'handle1');
        expect(result).toEqual(true);
    });

    test('it should return false if the account (handle) has not reweeted the weet', async () => {
        const firstWeet = await db.query(`SELECT * FROM weets WHERE author = $1`, ['handle1']);
        const result = await hasReweeted(firstWeet.rows[0].id, 'handle3');
        expect(result).toEqual(false);
    });
});

describe('hasFavorited', () => {
    test('it should return true if the account (handle) has favorited the weet', async () => {
        const firstWeet = await db.query(`SELECT * FROM weets WHERE author = $1`, ['handle1']);
        const result = await hasFavorited(firstWeet.rows[0].id, 'handle1');
        expect(result).toEqual(true);
    });

    test('it should return false if the account (handle) has not favorited the weet', async () => {
        const firstWeet = await db.query(`SELECT * FROM weets WHERE author = $1`, ['handle1']);
        const result = await hasFavorited(firstWeet.rows[0].id, 'handle2');
        expect(result).toEqual(false);
    });
});

describe('hasTabbed', () => {
    test('it should return true if the account (handle) has tabbed the weet', async () => {
        const firstWeet = await db.query(`SELECT * FROM weets WHERE author = $1`, ['handle1']);
        const result = await hasTabbed(firstWeet.rows[0].id, 'handle1');
        expect(result).toEqual(true);
    });

    test('it should return false if the account (handle) has not tabbed the weet', async () => {
        const firstWeet = await db.query(`SELECT * FROM weets WHERE author = $1`, ['handle1']);
        await db.query(`DELETE FROM tabs WHERE user_id = $1`, ['handle3']);
        const result = await hasTabbed(firstWeet.rows[0].id, 'handle3');
        expect(result).toEqual(false);
    });
});

describe('checkHandle', () => {
    test('it should return an object containing true as a value for isValid if a valid handle is provided', async () => {
        const result = await checkHandle('edwar3je');
        expect(result).toEqual({
            isValid: true,
            messages: []
        });
    });

    test('it should return an object containing false as a value for isValid if the handle provided is either too long or too short', async () => {
        const result1 = await checkHandle('short');
        expect(result1).toEqual({
            isValid: false,
            messages: ['Handle must be between 8 - 20 characters long.']
        });

        const result2 = await checkHandle('ahandlethatgreatlyexceedsthecharacterlimit');
        expect(result2).toEqual({
            isValid: false,
            messages: ['Handle must be between 8 - 20 characters long.']
        });
    });

    test('it should return an object containing false as a value for isValid if the handle provided is not unique', async () => {
        await db.query(
            `INSERT INTO users (handle, username, password, email) VALUES ($1, $2, $3, $4)`,
            ['edwar3je', 'jamesedwards', 'K0kof1nsz$', 'jameserikedwards@gmail.com']
        );
        const result = await checkHandle('edwar3je');
        expect(result).toEqual({
            isValid: false,
            messages: ['Please select another handle. edwar3je is already taken.']
        });
    });

    test('it should return an object containing false as a value for isValid if the handle provided does not match regular expression', async () => {
        const result1 = await checkHandle('edwar3 je');
        expect(result1).toEqual({
            isValid: false,
            messages: ['Handle must contain only lowercase letters, uppercase letters and numbers with no spaces.']
        });

        const result2 = await checkHandle('edwar3je!');
        expect(result2).toEqual({
            isValid: false,
            messages: ['Handle must contain only lowercase letters, uppercase letters and numbers with no spaces.']
        })
    });
});

describe('checkUsername', () => {
    test('it should return an object containing true as a value for isValid if a valid username is provided', () => {
        const result = checkUsername('james edwards');
        expect(result).toEqual({
            isValid: true,
            messages: []
        });
    });

    test('it should return an object containing false as a value for isValid if the username provided is either too long or too short', () => {
        const result1 = checkUsername('short');
        expect(result1).toEqual({
            isValid: false,
            messages: ['Username must be between 8 - 20 characters long.']
        });

        const result2 = checkUsername('ahandlethatgreatlyexceedsthecharacterlimit');
        expect(result2).toEqual({
            isValid: false,
            messages: ['Username must be between 8 - 20 characters long.']
        });
    });

    test('it should return an object containing false as a value for isValid if the username provided either only contains blank spaces or starts with a blank space', () => {
        const result1 = checkUsername('               ');
        expect(result1).toEqual({
            isValid: false,
            messages: ['Username cannot contain only empty spaces nor start with an empty space.']
        });

        const result2 = checkUsername(' james edwards');
        expect(result2).toEqual({
            isValid: false,
            messages: ['Username cannot contain only empty spaces nor start with an empty space.']
        });
    });
});

describe('checkPassword', () => {
    test('it should return an object containing true as a value for isValid if a valid password is provided', () => {
        const result = checkPassword('K0kof!nsz');
        expect(result).toEqual({
            isValid: true,
            messages: []
        });
    });

    test('it should return an object containing false as a value for isValid if the password provided is either too long or too short', () => {
        const result1 = checkPassword('K4r%');
        expect(result1).toEqual({
            isValid: false,
            messages: ['Password must be between 8 - 20 characters long.']
        });

        const result2 = checkPassword('K4r%fjfjfjfjsiIldjflsdkjfl;kjsdfjsdlkfjaslk;fdj');
        expect(result2).toEqual({
            isValid: false,
            messages: ['Password must be between 8 - 20 characters long.']
        });
    });

    test('it should return an object containing false as a value for isValid if the password provided does not contain at least 1 capital letter, 1 lowercase letter, 1 number and/or 1 special character or contains a blank space', () => {
        const result1 = checkPassword('notValid!');
        expect(result1).toEqual({
            isValid: false,
            messages: ['Password must contain at least 1 capital letter, 1 lowercase letter, 1 number and 1 special character (e.g. !, #, *, etc.) and no blank spaces.']
        });

        const result2 = checkPassword('notValid !1');
        expect(result2).toEqual({
            isValid: false,
            messages: ['Password must contain at least 1 capital letter, 1 lowercase letter, 1 number and 1 special character (e.g. !, #, *, etc.) and no blank spaces.']
        });
    });
});

describe('checkEmailSignUp', () => {
    test('it should return an object containing true as a value for isValid if a valid email is provided', async () => {
        const result = await checkEmailSignUp('jameserikedwards@gmail.com');
        expect(result).toEqual({
            isValid: true,
            messages: []
        });
    });

    test('it should return an object containing false as a value for isValid if the email provided is not unique', async () => {
        await db.query(
            `INSERT INTO users (handle, username, password, email) VALUES ($1, $2, $3, $4)`,
            ['edwar3je', 'jamesedwards', 'K0kof1nsz$', 'jameserikedwards@gmail.com']
        );
        const result = await checkEmailSignUp('jameserikedwards@gmail.com');
        expect(result).toEqual({
            isValid: false,
            messages: ['Please select another email. jameserikedwards@gmail.com is already taken.']
        });
    });

    test('it should return an object containing false as a value for isValid if the email provided does not match the regular expression', async () => {
        const result1 = await checkEmailSignUp('notanemail.com');
        expect(result1).toEqual({
            isValid: false,
            messages: ['Invalid email. Please provide a valid email.']
        });

        const result2 = await checkEmailSignUp('notanemail@email');
        expect(result2).toEqual({
            isValid: false,
            messages: ['Invalid email. Please provide a valid email.']
        });
    });
});

describe('isValidSignUp', () => {
    test('it should return an object containing multiple objects each having true as a value for isValid if valid information is provided', async () => {
        const result = await isValidSignUp('edwar3je', 'james edwards', 'K0kof!nsz', 'jameserikedwards@gmail.com');
        expect(result.handle.isValid).toEqual(true);
        expect(result.username.isValid).toEqual(true);
        expect(result.password.isValid).toEqual(true);
        expect(result.email.isValid).toEqual(true);
    });

    test('it should return an object containing multiple objects with the handle object having false as a value for isValid if one or more checks fail', async () => {
        const result1 = await isValidSignUp('short', 'james edwards', 'K0kof!nsz', 'jameserikedwards@gmail.com');
        expect(result1.handle.isValid).toEqual(false);
        const result2 = await isValidSignUp('ahandlethatgreatlyexceedsthecharacterlimit', 'james edwards', 'K0kof!nsz', 'jameserikedwards@gmail.com');
        expect(result2.handle.isValid).toEqual(false);
        const result3 = await isValidSignUp('edwar3je!', 'james edwards', 'K0kof!nsz', 'jameserikedwards@gmail.com');
        expect(result3.handle.isValid).toEqual(false);
        const result4 = await isValidSignUp('edwar3 je', 'james edwards', 'K0kof!nsz', 'jameserikedwards@gmail.com');
        expect(result4.handle.isValid).toEqual(false);
        await db.query(
            `INSERT INTO users (handle, username, password, email) VALUES ($1, $2, $3, $4)`,
            ['edwar3je', 'jamesedwards', 'K0kof1nsz$', 'jameserikedwards@gmail.com']
        );
        const result5 = await isValidSignUp('edwar3je', 'james edwards', 'K0kof!nsz', 'jameserikedwards@gmail.com');
        expect(result5.handle.isValid).toEqual(false);
    });

    test('it should return an object containing multiple objects with the username object having false as a value for isValid if one or more checks fail', async () => {
        const result1 = await isValidSignUp('edwar3je', 'short', 'K0kof!nsz', 'jameserikedwards@gmail.com');
        expect(result1.username.isValid).toEqual(false);
        const result2 = await isValidSignUp('edwar3je', 'ausernamethatgreatlyexceedsthecharacterlimit', 'K0kof!nsz', 'jameserikedwards@gmail.com');
        expect(result2.username.isValid).toEqual(false);
        const result3 = await isValidSignUp('edwar3je', '              ', 'K0kof!nsz', 'jameserikedwards@gmail.com');
        expect(result3.username.isValid).toEqual(false);
        const result4 = await isValidSignUp('edwar3je', ' james edwards', 'K0kof!nsz', 'jameserikedwards@gmail.com');
        expect(result4.username.isValid).toEqual(false);
    });

    test('it should return an object containing multiple objects with the password object having false as a value for isValid if one or more checks fail', async () => {
        const result1 = await isValidSignUp('edwar3je', 'james edwards', 'K4r%', 'jameserikedwards@gmail.com');
        expect(result1.password.isValid).toEqual(false);
        const result2 = await isValidSignUp('edwar3je', 'james edwards', 'K4r%fjfjfjfjsiIldjflsdkjfl;kjsdfjsdlkfjaslk;fdj', 'jameserikedwards@gmail.com');
        expect(result2.password.isValid).toEqual(false);
        const result3 = await isValidSignUp('edwar3je', 'james edwards', 'notValid!', 'jameserikedwards@gmail.com');
        expect(result3.password.isValid).toEqual(false);
        const result4 = await isValidSignUp('edwar3je', 'james edwards', 'notValid !1', 'jameserikedwards@gmail.com');
        expect(result4.password.isValid).toEqual(false);
    });

    test('it should return an object containing multiple objects with the email object having false as a value for isValid if one or more checks fail', async () => {
        const result1 = await isValidSignUp('edwar3je', 'james edwards', 'K0kof!nsz', 'notanemail.com');
        expect(result1.email.isValid).toEqual(false);
        const result2 = await isValidSignUp('edwar3je', 'james edwards', 'K0kof!nsz', 'notanemail@email');
        expect(result2.email.isValid).toEqual(false);
        await db.query(
            `INSERT INTO users (handle, username, password, email) VALUES ($1, $2, $3, $4)`,
            ['edwar3je', 'jamesedwards', 'K0kof1nsz$', 'jameserikedwards@gmail.com']
        );
        const result3 = await isValidSignUp('edwar3je', 'james edwards', 'K0kof!nsz', 'jameserikedwards@gmail.com');
        expect(result3.email.isValid).toEqual(false);
    });
});