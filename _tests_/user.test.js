process.env.NODE_ENV = 'test';

const db = require('../db');
const bcrypt = require('bcrypt');
const { BCRYPT_WORK_FACTOR } = require('../config');

const User = require('../models/User');
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

    await db.query(
        `INSERT INTO followers
         (follower_id, followee_id)
        VALUES ($1, $2)`,
        ['handle2', 'handle1']
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
});

describe('register', () => {
    test('it should work if the handle and username provided are unique', async () => {
        const result = await User.register('handle4', 'user4', 'password4', 'email4');
        expect(result.handle).toEqual('handle4');
        expect(result.username).toEqual('user4');
        expect(result.password).not.toEqual('password4');
        const check = await db.query(`SELECT * FROM users WHERE handle = 'handle4'`);
        expect(check.rows[0].handle).toEqual('handle4');
    });

    test('it should work if only the handle provided is unique', async () => {
        const result = await User.register('handle4', 'user1', 'password1', 'email4');
        expect(result.handle).toEqual('handle4');
        expect(result.username).toEqual('user1');
        expect(result.password).not.toEqual('password1');
        const check = await db.query(`SELECT * FROM users WHERE handle = 'handle4'`);
        expect(check.rows[0].handle).toEqual('handle4');
    });

    test('it should throw an error if a non-unique email is provided', async () => {
        expect(async () => {
            await User.register('handle4', 'user4', 'password4', 'email1')
        }).rejects.toThrow();
    });

    test('it should throw an error if the handle provided is not unique', async () => {
        expect(async () => {
            await User.register('handle1', 'user4', 'password4', 'email4')
        }).rejects.toThrow();
        const check = await db.query(`SELECT * FROM users WHERE handle = 'handle1'`);
        expect(check.rows[0].handle).toEqual('handle1');
    });
});

describe('authenticate', () => {
    test('it should work if the username and password provided are valid', async () => {
        const result = await User.authenticate('handle1', 'password1');
        expect(result.handle).toEqual('handle1');
    });

    test('it should thrown an error if an invalid handle is provided', async () => {
        expect(async () => {
            await User.authenticate('handle4', 'password1')
        }).rejects.toThrow();
    });

    test('it should throw an error if an invalid password is provided', async () => {
        expect(async () => {
            await User.authenticate('handle1', 'password4')
        }).rejects.toThrow();
    });

    test('it should throw an error if both the handle and password are invalid', async () => {
        expect(async () => {
            await User.authenticate('handle4', 'password4')
        }).rejects.toThrow();
    });
});

describe('get', () => {
    test('it should work if the handle provided is valid', async () => {
        const result = await User.get('handle1');
        expect(result.handle).toEqual('handle1');
    });

    test('it should thrown an error if the handle provided is invalid', async () => {
        expect(async () => {
            await User.get('not_a_handle')
        }).rejects.toThrow();
    });
});

describe('update', () => {
    test('it should update the account information if valid information is provided (no new password)', async () => {
        const result = await User.update('handle1', 'new username', 'password1', '', 'new email', 'new user description', 'new profile picture', 'new banner picture');
        const check = await db.query(`SELECT * FROM users WHERE handle = $1`, ['handle1']);
        expect(result.username).toEqual('new username');
        expect(await bcrypt.compare('password1', check.rows[0].password)).toBeTruthy();
        expect(result.email).toEqual('new email');
        expect(result.user_description).toEqual('new user description');
        expect(result.profile_image).toEqual('new profile picture');
        expect(result.banner_image).toEqual('new banner picture');
    });

    test('it should update the account information if valid information is provided (new password provided)', async () => {
        const result = await User.update('handle1', 'new username', 'password1', 'new password', 'new email', 'new user description', 'new profile picture', 'new banner picture');
        const check = await db.query(`SELECT * FROM users WHERE handle = $1`, ['handle1']);
        expect(result.username).toEqual('new username');
        expect(await bcrypt.compare('password1', check.rows[0].password)).toBeFalsy();
        expect(await bcrypt.compare('new password', check.rows[0].password)).toBeTruthy();
        expect(result.email).toEqual('new email');
        expect(result.user_description).toEqual('new user description');
        expect(result.profile_image).toEqual('new profile picture');
        expect(result.banner_image).toEqual('new banner picture');
    });

    test('it should throw an error if a new password is provided that is less than the character min or greater than the character max', async () => {
        expect(async () => {
            await User.update('handle1', 'new username', 'password1', 'new', 'new email', 'new user description', 'new profile picture', 'new banner picture')
        }).rejects.toThrow();
        expect(async () => {
            await User.update('handle1', 'new username', 'password1', 'a password that greatly exceeds the character limit', 'new email', 'new user description', 'new profile picture', 'new banner picture')
        }).rejects.toThrow();
    });

    test('it should throw an error if a non-unique password is provided that is from the same account', async () => {
        expect(async () => {
            await User.update('handle1', 'new username', 'password1', 'password1', 'new email', 'new user description', 'new profile picture', 'new banner picture')
        }).rejects.toThrow();
    });

    test('it should throw an error if the wrong password is provided', async () => {
        expect(async () => {
            await User.update('handle1', 'new username', 'not a password', '', 'new email', 'new user description', 'new profile picture', 'new banner picture')
        }).rejects.toThrow();
    });

    // Find out why this is failing the 'delete' test (it fails the subsequent available test)

    test('it should throw an error if a non-unique email is provided that is from another account', async () => {
        expect(async () => {
            await User.update('handle1', 'new username', 'password1', '', 'email2', 'new user description', 'new profile picture', 'new banner picture')
        }).rejects.toThrow();
    });
});

describe('delete', () => {

    // This appears to work by itself, but is failing due to the test just above it

    test('it should work if the handle provided is valid', async () => {
        const result = await User.delete('handle1');
        expect(result).toEqual(true);
        const check = await db.query(`SELECT * FROM users WHERE handle = 'handle1'`);
        expect(check.rows).toEqual([]);
    });

    test('it should throw an error if the handle provided is invalid', async () => {
        expect(async () => {
            await User.delete('not_a_user')
        }).rejects.toThrow();
    });
});

describe('follow', () => {
    test('it should work if the handles provided are valid', async () => {
        const firstCheck = await db.query(`SELECT * FROM followers WHERE follower_id = 'handle1' AND followee_id = 'handle2'`);
        expect(firstCheck.rows).toEqual([]);
        const result = await User.follow('handle1', 'handle2');
        expect(result).toEqual('handle1 is now following handle2');
        const secondCheck = await db.query(`SELECT * FROM followers WHERE follower_id = 'handle1' AND followee_id = 'handle2'`);
        expect(secondCheck.rows).not.toEqual([]);
    });

    test('it should throw an error if one of the handles provided is invalid', async () => {
        expect(async () => {
            await User.follow('handle1', 'not_a_handle')
        }).rejects.toThrow();
        expect(async () => {
            await User.follow('not_a_handle', 'handle2')
        }).rejects.toThrow();
    });

    test('it should throw an error if both of the handles provided are invalid', async () => {
        expect(async () => {
            await User.follow('not_a_handle1', 'not_a_handle2')
        }).rejects.toThrow();
    });

    // Ask how to solve this test case. Throwing an error, but seems to resolve promise nonetheless.

    test('it should throw an error if the follower account already follows the followee account', async () => {
        //console.log(await User.follow('handle2', 'handle1'));
        expect(async () => {
            await User.follow('handle2', 'handle1')
        }).rejects.toThrow();
    });
});

describe('unfollow', () => {
    test('it should work if the handles provided are valid', async () => {
        const firstCheck = await db.query(`SELECT * FROM followers WHERE follower_id = 'handle2' AND followee_id = 'handle1'`);
        expect(firstCheck.rows).not.toEqual([]);
        const result = await User.unfollow('handle2', 'handle1');
        expect(result).toEqual('handle2 is no longer following handle1');
        const secondCheck = await db.query(`SELECT * FROM followers WHERE follower_id = 'handle2' AND followee_id = 'handle1'`);
        expect(secondCheck.rows).toEqual([]);
    });

    test('it should throw an error if one of the handles provided is invalid', async () => {
        expect(async () => {
            await User.unfollow('not_a_handle', 'handle1');
        }).rejects.toThrow();
        expect(async () => {
            await User.unfollow('handle2', 'not_a_handle');
        }).rejects.toThrow();
    });

    test('it should throw an error if both of the handles provided are invalid', async () => {
        expect(async () => {
            await User.unfollow('not_a_handle1', 'not_a_handle2');
        }).rejects.toThrow();
    });

    test('it should throw an error if the follower account is not currently following the followee account', async () => {
        expect(async () => {
            await User.unfollow('handle1', 'handle2')
        }).rejects.toThrow();
    });
});

describe('getFollowers', () => {
    test('it should return an array of followers (assuming the account has followers)', async () => {
        await User.follow('handle3', 'handle1');
        const result = await User.getFollowers('handle1');
        expect(result).toEqual(['handle2', 'handle3']);
    });

    test('it should return an empty array of followers (if the account does not have any followers)', async () => {
        const result = await User.getFollowers('handle3');
        expect(result).toEqual([]);
    });

    test('it should throw an error if an invalid handle is provided', async () => {
        expect(async () => {
            await User.getFollowers('not_a_handle')
        }).rejects.toThrow();
    });
});

describe('getFollowing', () => {
    test('it should return an array of accounts the user is following (assuming the account is following a few users)', async () => {
        await User.follow('handle2', 'handle3')
        const result = await User.getFollowing('handle2');
        expect(result).toEqual(['handle1', 'handle3']);
    });

    test('it should return an empty array (assuming the user is not following any accounts)', async () => {
        await User.unfollow('handle2', 'handle1');
        const result = await User.getFollowing('handle2');
        expect(result).toEqual([]);
    });

    test('it should throw an error if an invalid handle is provided', async () => {
        expect(async () => {
            await User.getFollowing('not_a_handle')
        }).rejects.toThrow();
    });
});

describe('search', () => {
    test('it should return an array of users that match the string (all uppercase)', async () => {
        const result = await User.search('USER');
        expect(result[0].username).toEqual('user1');
        expect(result[1].username).toEqual('user2');
        expect(result[2].username).toEqual('user3');
    });

    test('it should return an array of users that match the string (all lowercase)', async () => {
        const result = await User.search('user');
        expect(result[0].username).toEqual('user1');
        expect(result[1].username).toEqual('user2');
        expect(result[2].username).toEqual('user3');
    });

    test('it should return an array of users that match the string (mixed case)', async () => {
        const result = await User.search('UseR');
        expect(result[0].username).toEqual('user1');
        expect(result[1].username).toEqual('user2');
        expect(result[2].username).toEqual('user3');
    });

    test('it should return an empty array (string does not match any users)', async () => {
        const result = await User.search('something');
        expect(result).toEqual([]);
    });

    test('it should throw an error if no string is provided', async () => {
        expect(async () => {
            await User.search()
        }).rejects.toThrow();
    });
});

describe('getWeets', () => {
    test('it should return an array of weets the user has written', async () => {
        const result = await User.getWeets('handle1', 'handle1');
        expect(result[0].weet).toEqual('Just an example weet');
        expect(result[0].time).toBeDefined();
        expect(result[0].date).toBeDefined();
        expect(result[0].checks).toBeDefined();
    });

    test('it should return an array of sorted weets the user has written (from newest to oldest)', async () => {
        await Weet.create('Autumn is my favorite season', 'handle1', 'handle1');
        await Weet.create('Dogs sure are cute', 'handle1', 'handle1');
        await Weet.create('I enjoy rainy days', 'handle1', 'handle1');
        const result = await User.getWeets('handle1', 'handle1');
        expect(result[0].weet).toEqual('I enjoy rainy days');
        expect(result[1].weet).toEqual('Dogs sure are cute');
        expect(result[2].weet).toEqual('Autumn is my favorite season');
        expect(result[3].weet).toEqual('Just an example weet');
    })

    test('it should return an empty array of weets (assuming the user has not written any weets)', async () => {
        await db.query(`DELETE FROM weets WHERE author = 'handle1'`);
        const result = await User.getWeets('handle1', 'handle1');
        expect(result).toEqual([]);
    });

    test('it should throw an error if an invalid handle is provided', async () => {
        expect(async () => {
            await User.getWeets('not_a_handle', 'not_a_handle')
        }).rejects.toThrow();
    });
});

describe('reweet', () => {
    
    test('it should work if a valid handle and weetId are provided (assuming the account has not reweeted the weet; different user)', async () => {
        const firstWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle1'`);
        const result = await User.reweet('handle2', firstWeet.rows[0].id, 'handle2');
        expect(result).toEqual('weet succesfully reweeted');
        const check = await db.query(`SELECT user_id FROM reweets WHERE user_id = $1 AND weet_id = $2`, ['handle2', firstWeet.rows[0].id]);
        expect(check.rows[0].user_id).toEqual('handle2');
    });

    test('it should work if a valid handle and weetId are provided (assuming the account has not reweeted the weet; same user)', async () => {
        const firstWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle1'`);
        const result = await User.reweet('handle1', firstWeet.rows[0].id, 'handle1');
        expect(result).toEqual('weet succesfully reweeted');
        const check = await db.query(`SELECT user_id FROM reweets WHERE user_id = $1 AND weet_id = $2`, ['handle1', firstWeet.rows[0].id]);
        expect(check.rows[0].user_id).toEqual('handle1');
    });

    test('it should throw an error if the handle and/or weetId provided is/are invalid', async () => {
        const firstWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle1'`);
        expect(async () => {
            await User.reweet('not_a_handle', firstWeet.rows[0].id, 'not_a_handle')
        }).rejects.toThrow();
        expect(async () => {
            await User.reweet('handle1', 'not_a_weet', 'handle1')
        }).rejects.toThrow();
        expect(async () => {
            await User.reweet('not_a_handle', 'not_a_weet', 'not_a_handle')
        }).rejects.toThrow();
    });

    test('it should throw an error if the account has already reweeted the weet', async () => {
        const firstWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle1'`);
        await User.reweet('handle2', firstWeet.rows[0].id, 'handle2'); 
        expect(async () => {
            await User.reweet('handle2', firstWeet.rows[0].id, 'handle2')
        }).rejects.toThrow();
    });
});

describe('unReweet', () => {
    test('it should remove a reweet if a valid handle and weetId are provided (different user)', async () => {
        const firstWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle1'`);
        await User.reweet('handle2', firstWeet.rows[0].id, 'handle2');
        const result = await User.unReweet('handle2', firstWeet.rows[0].id, 'handle2');
        expect(result).toEqual('succesfully removed the reweet');
        const check = await db.query(`SELECT user_id FROM reweets WHERE user_id = $1 AND weet_id = $2`, ['handle2', firstWeet.rows[0].id]);
        expect(check.rows).toEqual([]);
    });

    test('it should remove a reweet if a valid handle and weetId are provide(same user)', async () => {
        const firstWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle1'`);
        await User.reweet('handle1', firstWeet.rows[0].id, 'handle1');
        const result = await User.unReweet('handle1', firstWeet.rows[0].id, 'handle1');
        expect(result).toEqual('succesfully removed the reweet');
        const check = await db.query(`SELECT user_id FROM reweets WHERE user_id = $1 AND weet_id = $2`, ['handle1', firstWeet.rows[0].id]);
        expect(check.rows).toEqual([]);
    });

    test('it should throw an error if the handle and/or weetId provided is/are invalid', async () => {
        const firstWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle1'`);
        await User.reweet('handle2', firstWeet.rows[0].id, 'handle2');
        expect(async () => {
            await User.unReweet('not_a_handle', firstWeet.rows[0].id, 'not_a_handle')
        }).rejects.toThrow();
        expect(async () => {
            await User.unReweet('handle1', 'not_a_weet', 'handle1')
        }).rejects.toThrow();
        expect(async () => {
            await User.unReweet('not_a_handle', 'not_a_weet', 'not_a_handle')
        }).rejects.toThrow();
    });

    test('it should throw an error if the account has not reweeted the weet', async () => {
        const firstWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle1'`);
        expect(async () => {
            await User.unReweet('handle2', firstWeet.rows[0].id, 'handle2')
        }).rejects.toThrow();
    });
});

describe('getReweets', () => {
    test('it should return an array of weets the user has reweeted', async () => {
        const firstWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle1'`);
        const secondWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle2'`);
        await User.reweet('handle1', firstWeet.rows[0].id, 'handle1');
        await User.reweet('handle1', secondWeet.rows[0].id, 'handle1');
        const result = await User.getReweets('handle1', 'handle1');
        expect(result[0].weet).toEqual('Just enjoying my day');
        expect(result[0].time).toBeDefined();
        expect(result[0].date).toBeDefined();
        expect(result[0].checks).toBeDefined();
        expect(result[0].checks.reweeted).toEqual(true);
        expect(result[1].weet).toEqual('Just an example weet');
        expect(result[1].time).toBeDefined();
        expect(result[1].date).toBeDefined();
        expect(result[1].checks).toBeDefined();
        expect(result[1].checks.reweeted).toEqual(true);
    });
    
    test('it should return an empty array (assuming the user has not reweeted any weets)', async () => {
        const result = await User.getReweets('handle1', 'handle1');
        expect(result).toEqual([]);
    });

    test('it should throw an error if the handle provided is invalid', async () => {
        expect(async () => {
            await User.getReweets('not_a_handle', 'not_a_handle')
        }).rejects.toThrow();
    })
});

describe('favorite', () => {
    test('it should work if a valid handle and weet id are provided (different user)', async () => {
        const firstWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle1'`);
        const result = await User.favorite('handle2', firstWeet.rows[0].id, 'handle2');
        expect(result).toEqual('weet succesfully favorited');
        const check = await db.query(`SELECT user_id FROM favorites WHERE user_id = $1 AND weet_id = $2`, ['handle2', firstWeet.rows[0].id]);
        expect(check.rows[0].user_id).toEqual('handle2');
    });
    
    test('it should work if a valid handle and weet id are provided (same user)', async () => {
        const firstWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle1'`);
        const result = await User.favorite('handle1', firstWeet.rows[0].id, 'handle1');
        expect(result).toEqual('weet succesfully favorited');
        const check = await db.query(`SELECT user_id FROM favorites WHERE user_id = $1 AND weet_id = $2`, ['handle1', firstWeet.rows[0].id]);
        expect(check.rows[0].user_id).toEqual('handle1');
    });
    
    test('it should throw an error if the handle and/or weet id are invalid', async () => {
        const firstWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle1'`);
        expect(async () => {
            await User.favorite('not_a_handle', firstWeet.rows[0].id, 'not_a_handle')
        }).rejects.toThrow();
        expect(async () => {
            await User.favorite('handle1', 'not_a_weet', 'handle1')
        }).rejects.toThrow();
        expect(async () => {
            await User.favorite('not_a_handle', 'not_a_weet', 'not_a_handle')
        }).rejects.toThrow(); 
    });

    test('it should throw an error if the account has already favorited the weet', async () => {
        const firstWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle1'`);
        await User.favorite('handle2', firstWeet.rows[0].id, 'handle2');
        expect(async () => {
            await User.favorite('handle2', firstWeet.rows[0].id, 'handle2')
        }).rejects.toThrow();
    });
});

describe('unFavorite', () => {
    test('it should work if a valid handle and weet id are provided (different user)', async () => {
        const firstWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle1'`);
        await User.favorite('handle2', firstWeet.rows[0].id, 'handle2');
        const result = await User.unFavorite('handle2', firstWeet.rows[0].id, 'handle2');
        expect(result).toEqual('succesfully removed the favorite');
        const check = await db.query(`SELECT user_id FROM favorites WHERE user_id = $1 AND weet_id = $2`, ['handle2', firstWeet.rows[0].id]);
        expect(check.rows).toEqual([]);
    });

    test('it should work if a valid handle and weet id are provided (same user)', async () => {
        const firstWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle1'`);
        await User.favorite('handle1', firstWeet.rows[0].id, 'handle1');
        const result = await User.unFavorite('handle1', firstWeet.rows[0].id, 'handle1');
        expect(result).toEqual('succesfully removed the favorite');
        const check = await db.query(`SELECT user_id FROM favorites WHERE user_id = $1 AND weet_id = $2`, ['handle1', firstWeet.rows[0].id]);
        expect(check.rows).toEqual([]);
    });

    test('it should throw an error if the handle and/or weet id are invalid', async () => {
        const firstWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle1'`);
        await User.favorite('handle1', firstWeet.rows[0].id, 'handle1');
        expect(async () => {
            await User.unFavorite('not_a_handle', firstWeet.rows[0].id, 'not_a_handle')
        }).rejects.toThrow();
        expect(async () => {
            await User.unFavorite('handle1', 'not_a_weet', 'handle1');
        }).rejects.toThrow();
        expect(async () => {
            await User.unFavorite('not_a_handle', 'not_a_weet', 'not_a_handle')
        }).rejects.toThrow();
    });

    test('it should throw an error if the account has not favorited the weet', async () => {
        const firstWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle1'`);
        expect(async () => {
            await User.unFavorite('handle1', firstWeet.rows[0].id, 'handle1')
        });
    });
});

describe('getFavorites', () => {
    test('it should return an array of weets the user has favorited', async () => {
        const firstWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle1'`);
        const secondWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle2'`);
        await User.favorite('handle1', firstWeet.rows[0].id, 'handle1');
        await User.favorite('handle1', secondWeet.rows[0].id, 'handle1');
        const result = await User.getFavorites('handle1', 'handle1');
        expect(result[0].weet).toEqual('Just enjoying my day');
        expect(result[0].time).toBeDefined();
        expect(result[0].date).toBeDefined();
        expect(result[0].checks).toBeDefined();
        expect(result[0].checks.favorited).toEqual(true);
        expect(result[1].weet).toEqual('Just an example weet');
        expect(result[1].time).toBeDefined();
        expect(result[1].date).toBeDefined();
        expect(result[1].checks).toBeDefined();
        expect(result[1].checks.favorited).toEqual(true);
    });

    test('it should return an empty array (assuming the user has not favorited any weets)', async () => {
        const result = await User.getFavorites('handle1', 'handle1');
        expect(result).toEqual([]);
    });

    test('it should throw an error if the handle provided is not valid', async () => {
        expect(async () => {
            await User.getFavorites('not_a_handle', 'not_a_handle')
        }).rejects.toThrow();
    });
});

describe('tab', () => {
    test('it should work if a valid handle and weet id are provided (different user)', async () => {
        const firstWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle1'`);
        const result = await User.tab('handle2', firstWeet.rows[0].id, 'handle2');
        expect(result).toEqual('weet succesfully tabbed');
        const check = await db.query(`SELECT user_id FROM tabs WHERE user_id = $1 AND weet_id = $2`, ['handle2', firstWeet.rows[0].id]);
        expect(check.rows[0].user_id).toEqual('handle2');
    });

    test('it should work if a valid handle and weet id are provided (same user)', async () => {
        const firstWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle1'`);
        const result = await User.tab('handle1', firstWeet.rows[0].id, 'handle1');
        expect(result).toEqual('weet succesfully tabbed');
        const check = await db.query(`SELECT user_id FROM tabs WHERE user_id = $1 AND weet_id = $2`, ['handle1', firstWeet.rows[0].id]);
        expect(check.rows[0].user_id).toEqual('handle1');
    });

    test('it should throw an error if the handle and/or weet id are invalid', async () => {
        const firstWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle1'`);
        expect(async () => {
            await User.tab('not_a_handle', firstWeet.rows[0].id, 'not_a_handle')
        }).rejects.toThrow();
        expect(async () => {
            await User.tab('handle2', 'not_a_weet', 'handle2')
        }).rejects.toThrow();
        expect(async () => {
            await User.tab('not_a_handle', 'not_a_weet', 'not_a_handle')
        }).rejects.toThrow();
    });

    test('it should throw an error if the account already tabbed the weet', async () => {
        const firstWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle1'`);
        await User.tab('handle2', firstWeet.rows[0].id, 'handle2');
        expect(async () => {
            await User.tab('handle2', firstWeet.rows[0].id, 'handle2')
        }).rejects.toThrow();
    });
});

describe('unTab', () => {
    test('it should work if a valid handle and weet id are provided (different user)', async () => {
        const firstWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle1'`);
        await User.tab('handle2', firstWeet.rows[0].id, 'handle2');
        const result = await User.unTab('handle2', firstWeet.rows[0].id, 'handle2');
        expect(result).toEqual('succesfully removed the tab');
        const check = await db.query(`SELECT user_id FROM tabs WHERE user_id = $1 AND weet_id = $2`, ['handle2', firstWeet.rows[0].id]);
        expect(check.rows).toEqual([]);
    });

    test('it should work if a valid handle and weet id are provided (same user)', async () => {
        const firstWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle1'`);
        await User.tab('handle1', firstWeet.rows[0].id, 'handle1');
        const result = await User.unTab('handle1', firstWeet.rows[0].id, 'handle1');
        expect(result).toEqual('succesfully removed the tab');
        const check = await db.query(`SELECT user_id FROM tabs WHERE user_id = $1 AND weet_id = $2`, ['handle1', firstWeet.rows[0].id]);
        expect(check.rows).toEqual([]);
    });

    test('it should throw an error if the handle and/or weet id are invalid', async () => {
        const firstWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle1'`);
        await User.tab('handle2', firstWeet.rows[0].id, 'handle2');
        expect(async () => {
            await User.unTab('not_a_handle', firstWeet.rows[0].id, 'not_a_handle')
        }).rejects.toThrow();
        expect(async () => {
            await User.unTab('handle2', 'not_a_weet', 'handle2')
        }).rejects.toThrow();
        expect(async () => {
            await User.unTab('not_a_handle', 'not_a_weet', 'not_a_handle')
        }).rejects.toThrow();
    });

    test('it should throw an error if the account has not tabbed the weet', async () => {
        const firstWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle1'`);
        expect(async () => {
            await User.unTab('handle2', firstWeet.rows[0].id, 'handle2')
        }).rejects.toThrow();
    });
}); 

describe('getTabs', () => {
    test('it should return an array of weets the user has tabbed', async () => {
        const firstWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle1'`);
        const secondWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle2'`);
        await User.tab('handle1', firstWeet.rows[0].id, 'handle1');
        await User.tab('handle1', secondWeet.rows[0].id, 'handle1');
        const result = await User.getTabs('handle1', 'handle1');
        expect(result[0].weet).toEqual('Just enjoying my day');
        expect(result[0].time).toBeDefined();
        expect(result[0].date).toBeDefined();
        expect(result[0].checks).toBeDefined();
        expect(result[0].checks.tabbed).toEqual(true);
        expect(result[1].weet).toEqual('Just an example weet');
        expect(result[1].time).toBeDefined();
        expect(result[1].date).toBeDefined();
        expect(result[1].checks).toBeDefined();
        expect(result[1].checks.tabbed).toEqual(true);
    });

    test('it should return an empty array (assuming the user has not tabbed any weets)', async () => {
        const result = await User.getTabs('handle1', 'handle1');
        expect(result).toEqual([]);
    });

    test('it should throw an error if the handle provided is not valid', async () => {
        expect(async () => {
            await User.getTabs('not_a_handle', 'not_a_handle')
        }).rejects.toThrow();
    });
});

describe('getFeed', () => {
    test('it should return a sorted array of weets from the user and accounts they follow (follows some accounts)', async () => {
        await User.follow('handle1', 'handle2');
        const result = await User.getFeed('handle1');
        expect(result[0].weet).toEqual('Just enjoying my day');
        expect(result[0].checks).toBeDefined();
        expect(result[1].weet).toEqual('Just an example weet');
        expect(result[1].checks).toBeDefined();
    });

    test('it should return a sorted array of weets from the user and accounts they follow (follows all accounts)', async () => {
        await User.follow('handle1', 'handle2');
        await User.follow('handle1', 'handle3');
        const result = await User.getFeed('handle1');
        expect(result[0].weet).toEqual('Good morning New York');
        expect(result[0].checks).toBeDefined();
        expect(result[1].weet).toEqual('Just enjoying my day');
        expect(result[1].checks).toBeDefined();
        expect(result[2].weet).toEqual('Just an example weet');
        expect(result[2].checks).toBeDefined();
    });

    test('it should return a sorted array of weets the user has written (assuming they are not following any accounts)', async () => {
        await Weet.create('A test weet', 'handle1');
        const result = await User.getFeed('handle1');
        expect(result[0].weet).toEqual('A test weet');
        expect(result[0].checks).toBeDefined();
        expect(result[1].weet).toEqual('Just an example weet');
        expect(result[1].checks).toBeDefined();
    });

    test('it should return an empty array assuming the user does not follow any accounts and has not written any weets', async () => {
        const newUser = await User.register('newhandle', 'newuser', 'anewpassword', 'someemail@email.com');
        const result = await User.getFeed(newUser.handle);
        expect(result).toEqual([]);
    });
    
    test('it should throw an error if the handle provided is not valid', async () => {
        expect(async () => {
            await User.getFeed('not_a_handle')
        }).rejects.toThrow();
    });
});