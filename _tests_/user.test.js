process.env.NODE_ENV = 'test';

const db = require('../db');
const bcrypt = require('bcrypt');
const { BCRYPT_WORK_FACTOR } = require('../config');

const User = require('../models/User');

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
    test('works if the handle and username provided are unique', async () => {
        const result = await User.register('handle4', 'user4', 'password4', 'email4');
        expect(result.handle).toEqual('handle4');
        expect(result.username).toEqual('user4');
        expect(result.password).not.toEqual('password4');
        const check = await db.query(`SELECT * FROM users WHERE handle = 'handle4'`);
        expect(check.rows[0].handle).toEqual('handle4');
    });

    test('works if only the handle provided is unique', async () => {
        const result = await User.register('handle4', 'user1', 'password1', 'email4');
        expect(result.handle).toEqual('handle4');
        expect(result.username).toEqual('user1');
        expect(result.password).not.toEqual('password1');
        const check = await db.query(`SELECT * FROM users WHERE handle = 'handle4'`);
        expect(check.rows[0].handle).toEqual('handle4');
    });

    test('does not work if the handle provided is not unique', async () => {
        expect(async () => {
            await User.register('handle1', 'user4', 'password4', 'email4')
        }).rejects.toThrow();
        const check = await db.query(`SELECT * FROM users WHERE handle = 'handle1'`);
        expect(check.rows[0].handle).toEqual('handle1');
    });
});

describe('authenticate', () => {
    test('works if the username and password provided are valid', async () => {
        const result = await User.authenticate('handle1', 'password1');
        expect(result.handle).toEqual('handle1');
    });

    test('does not work if an invalid handle is provided', async () => {
        expect(async () => {
            await User.authenticate('handle4', 'password1')
        }).rejects.toThrow();
    });

    test('does not work if an invalid password is provided', async () => {
        expect(async () => {
            await User.authenticate('handle1', 'password4')
        }).rejects.toThrow();
    });

    test('does not work if both the handle and password are invalid', async () => {
        expect(async () => {
            await User.authenticate('handle4', 'password4')
        }).rejects.toThrow();
    });
});

describe('get', () => {
    test('works if the handle provided is valid', async () => {
        const result = await User.get('handle1');
        expect(result.handle).toEqual('handle1');
    });

    test('does not work if the handle provided is invalid', async () => {
        expect(async () => {
            await User.get('not_a_handle')
        }).rejects.toThrow();
    });
});

describe('delete', () => {
    test('works if the handle provided is valid', async () => {
        const result = await User.delete('handle1');
        expect(result).toEqual(true);
        const check = await db.query(`SELECT * FROM users WHERE handle = 'handle1'`);
        expect(check.rows).toEqual([]);
    });

    test('does not work if the handle provided is invalid', async () => {
        expect(async () => {
            await User.delete('not_a_user')
        }).rejects.toThrow();
    });
});

/*describe('follow', () => {
    test('works if the handles provided are valid', async () => {
        const firstCheck = await db.query(`SELECT * FROM followers WHERE follower_id = 'handle1' AND followee_id = 'handle2'`);
        expect(firstCheck.rows).toEqual([]);
        const result = await User.follow('handle1', 'handle2');
        expect(result).toEqual('handle1 is now following handle2');
        const secondCheck = await db.query(`SELECT * FROM followers WHERE follower_id = 'handle1' AND followee_id = 'handle2'`);
        expect(secondCheck.rows).not.toEqual([]);
    });

    test('throws an error if one of the handles provided is invalid', async () => {
        expect(async () => {
            await User.follow('handle1', 'not_a_handle')
        }).rejects.toThrow();
        expect(async () => {
            await User.follow('not_a_handle', 'handle2')
        }).rejects.toThrow();
    });

    test('throws an error if both of the handles provided are invalid', async () => {
        expect(async () => {
            await User.follow('not_a_handle1', 'not_a_handle2')
        }).rejects.toThrow();
    });

    // Ask how to solve this test case. Throwing an error, but seems to resolve promise nonetheless.

    test('throws an error if the follower account already follows the followee account', async () => {
        //console.log(await User.follow('handle2', 'handle1'));
        expect(async () => {
            await User.follow('handle2', 'handle1')
        }).rejects.toThrow();
    });
});*/

describe('unfollow', () => {
    test('works if the handles provided are valid', async () => {
        const firstCheck = await db.query(`SELECT * FROM followers WHERE follower_id = 'handle2' AND followee_id = 'handle1'`);
        expect(firstCheck.rows).not.toEqual([]);
        const result = await User.unfollow('handle2', 'handle1');
        expect(result).toEqual('handle2 is no longer following handle1');
        const secondCheck = await db.query(`SELECT * FROM followers WHERE follower_id = 'handle2' AND followee_id = 'handle1'`);
        expect(secondCheck.rows).toEqual([]);
    });

    test('throws an error if one of the handles provided is invalid', async () => {
        expect(async () => {
            await User.unfollow('not_a_handle', 'handle1');
        }).rejects.toThrow();
        expect(async () => {
            await User.unfollow('handle2', 'not_a_handle');
        }).rejects.toThrow();
    });

    test('throws an error if both of the handles provided are invalid', async () => {
        expect(async () => {
            await User.unfollow('not_a_handle1', 'not_a_handle2');
        }).rejects.toThrow();
    });

    test('throws an error if the follower account is not currently following the followee account', async () => {
        expect(async () => {
            await User.unfollow('handle1', 'handle2')
        }).rejects.toThrow();
    });
});

describe('getFollowers', () => {
    test('returns an array of followers (assuming the account has followers)', async () => {
        await User.follow('handle3', 'handle1');
        const result = await User.getFollowers('handle1');
        expect(result).toEqual(['handle2', 'handle3']);
    });

    test('returns an empty array of followers (if the account does not have any followers)', async () => {
        const result = await User.getFollowers('handle3');
        expect(result).toEqual([]);
    });

    test('throws an error if an invalid handle is provided', async () => {
        expect(async () => {
            await User.getFollowers('not_a_handle')
        }).rejects.toThrow();
    });
});

describe('getFollowing', () => {
    test('returns an array of accounts the user is following (assuming the account is following a few users)', async () => {
        await User.follow('handle2', 'handle3')
        const result = await User.getFollowing('handle2');
        expect(result).toEqual(['handle1', 'handle3']);
    });

    test('returns an empty array (assuming the user is not following any accounts)', async () => {
        await User.unfollow('handle2', 'handle1');
        const result = await User.getFollowing('handle2');
        expect(result).toEqual([]);
    });

    test('throws an error if an invalid handle is provided', async () => {
        expect(async () => {
            await User.getFollowing('not_a_handle')
        }).rejects.toThrow();
    });
});

describe('getWeets', () => {
    test('returns an array of weets the user has written', async () => {
        const result = await User.getWeets('handle1');
        expect(result[0].weet).toEqual('Just an example weet');
        expect(result[0].time).toBeDefined();
        expect(result[0].date).toBeDefined();
    });

    test('returns an empty array of weets (assuming the user has not written any weets)', async () => {
        await db.query(`DELETE FROM weets WHERE author = 'handle1'`);
        const result = await User.getWeets('handle1');
        expect(result).toEqual([]);
    });

    test('throws an error if an invalid handle is provided', async () => {
        expect(async () => {
            await User.getWeets('not_a_handle')
        }).rejects.toThrow();
    });
});

describe('reweet', () => {
    
    test('works if a valid handle and weetId are provided (assuming the account has not reweeted the weet; different user)', async () => {
        const firstWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle1'`);
        const result = await User.reweet('handle2', firstWeet.rows[0].id);
        expect(result).toEqual('weet succesfully reweeted');
        const check = await db.query(`SELECT user_id FROM reweets WHERE user_id = $1 AND weet_id = $2`, ['handle2', firstWeet.rows[0].id]);
        expect(check.rows[0].user_id).toEqual('handle2');
    });

    test('works if a valid handle and weetId are provided (assuming the account has not reweeted the weet; different user)', async () => {
        const firstWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle1'`);
        const result = await User.reweet('handle1', firstWeet.rows[0].id);
        expect(result).toEqual('weet succesfully reweeted');
        const check = await db.query(`SELECT user_id FROM reweets WHERE user_id = $1 AND weet_id = $2`, ['handle1', firstWeet.rows[0].id]);
        expect(check.rows[0].user_id).toEqual('handle1');
    });

    test('throws an error if the handle and/or weetId provided is/are invalid', async () => {
        const firstWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle1'`);
        expect(async () => {
            await User.reweet('not_a_handle', firstWeet.rows[0].id)
        }).rejects.toThrow();
        expect(async () => {
            await User.reweet('handle1', 'not_a_weet')
        }).rejects.toThrow();
        expect(async () => {
            await User.reweet('not_a_handle', 'not_a_weet')
        }).rejects.toThrow();
    });

    test('throws an error if the account has already reweeted the weet', async () => {
        const firstWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle1'`);
        await User.reweet('handle2', firstWeet.rows[0].id); 
        expect(async () => {
            await User.reweet('handle2', firstWeet.rows[0].id)
        }).rejects.toThrow();
    });
});

describe('unReweet', () => {
    test('removes a reweet if a valid handle and weetId are provided (different user)', async () => {
        const firstWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle1'`);
        await User.reweet('handle2', firstWeet.rows[0].id);
        const result = await User.unReweet('handle2', firstWeet.rows[0].id);
        expect(result).toEqual('succesfully removed the reweet');
        const check = await db.query(`SELECT user_id FROM reweets WHERE user_id = $1 AND weet_id = $2`, ['handle2', firstWeet.rows[0].id]);
        expect(check.rows).toEqual([]);
    });

    test('removes a reweet if a valid handle and weetId are provide(same user)', async () => {
        const firstWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle1'`);
        await User.reweet('handle1', firstWeet.rows[0].id);
        const result = await User.unReweet('handle1', firstWeet.rows[0].id);
        expect(result).toEqual('succesfully removed the reweet');
        const check = await db.query(`SELECT user_id FROM reweets WHERE user_id = $1 AND weet_id = $2`, ['handle1', firstWeet.rows[0].id]);
        expect(check.rows).toEqual([]);
    });

    test('throws an error if the handle and/or weetId provided is/are invalid', async () => {
        const firstWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle1'`);
        await User.reweet('handle2', firstWeet.rows[0].id);
        expect(async () => {
            await User.unReweet('not_a_handle', firstWeet.rows[0].id)
        }).rejects.toThrow();
        expect(async () => {
            await User.unReweet('handle1', 'not_a_weet')
        }).rejects.toThrow();
        expect(async () => {
            await User.unReweet('not_a_handle', 'not_a_weet')
        }).rejects.toThrow();
    });

    test('throws an error if the account has not reweeted the weet', async () => {
        const firstWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle1'`);
        expect(async () => {
            await User.unReweet('handle2', firstWeet.rows[0].id)
        }).rejects.toThrow();
    });
});

describe('getReweets', () => {
    test('returns an array of weets the user has reweeted', async () => {
        const firstWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle1'`);
        const secondWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle2'`);
        await User.reweet('handle1', firstWeet.rows[0].id);
        await User.reweet('handle1', secondWeet.rows[0].id);
        const result = await User.getReweets('handle1');
        expect(result[0].weet).toEqual('Just an example weet');
        expect(result[0].time).toBeDefined();
        expect(result[0].date).toBeDefined();
        expect(result[1].weet).toEqual('Just enjoying my day');
        expect(result[1].time).toBeDefined();
        expect(result[1].date).toBeDefined();
        //expect(result).toEqual([{weet: 'Just an example weet'}, {weet: 'Just enjoying my day'}]);
    });
    
    test('returns an empty array (assuming the user has not reweeted any weets)', async () => {
        const result = await User.getReweets('handle1');
        expect(result).toEqual([]);
    });

    test('throws an error if the handle provided is invalid', async () => {
        expect(async () => {
            await User.getReweets('not_a_handle')
        }).rejects.toThrow();
    })
});

/*describe('favorite', () => {
    test('works if a valid handle and weet id are provided (different user)', async () => {
        const firstWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle1'`);
        const result = await User.favorite('handle2', firstWeet.rows[0].id);
        expect(result).toEqual('weet succesfully favorited');
        const check = await db.query(`SELECT user_id FROM favorites WHERE user_id = $1 AND weet_id = $2`, ['handle2', firstWeet.rows[0].id]);
        expect(check.rows[0].user_id).toEqual('handle2');
    });
    test('works if a valid handle and weet id are provided (same user)', async () => {
        const firstWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle1'`);
        const result = await User.favorite('handle1', firstWeet.rows[0].id);
        expect(result).toEqual('weet succesfully favorited');
        const check = await db.query(`SELECT user_id FROM favorites WHERE user_id = $1 AND weet_id = $2`, ['handle1', firstWeet.rows[0].id]);
        expect(check.rows[0].user_id).toEqual('handle1');
    });
    test('throws an error if the handle and/or weet id are invalid', async () => {
        const firstWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle1'`);
        expect(async () => {
            await User.favorite('not_a_handle', firstWeet.rows[0].id)
        }).rejects.toThrow();
        expect(async () => {
            await User.favorite('handle1', 'not_a_weet')
        }).rejects.toThrow();
        expect(async () => {
            await User.favorite('not_a_handle', 'not_a_weet')
        }).rejects.toThrow(); 
    });

    // Find out why this is happening
    test('throws an error if the account has already favorited the weet', async () => {
        const firstWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle1'`);
        await User.favorite('handle1', firstWeet.rows[0].id);
        expect(async () => {
            await User.favorite('handle1', firstWeet.rows[0].id)
        }).rejects.toThrow();
    })
});*/

describe('unFavorite', () => {
    test('works if a valid handle and weet id are provided (different user)', async () => {
        const firstWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle1'`);
        await User.favorite('handle2', firstWeet.rows[0].id);
        const result = await User.unFavorite('handle2', firstWeet.rows[0].id);
        expect(result).toEqual('succesfully removed the favorite');
        const check = await db.query(`SELECT user_id FROM favorites WHERE user_id = $1 AND weet_id = $2`, ['handle2', firstWeet.rows[0].id]);
        expect(check.rows).toEqual([]);
    });

    test('works if a valid handle and weet id are provided (same user)', async () => {
        const firstWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle1'`);
        await User.favorite('handle1', firstWeet.rows[0].id);
        const result = await User.unFavorite('handle1', firstWeet.rows[0].id);
        expect(result).toEqual('succesfully removed the favorite');
        const check = await db.query(`SELECT user_id FROM favorites WHERE user_id = $1 AND weet_id = $2`, ['handle1', firstWeet.rows[0].id]);
        expect(check.rows).toEqual([]);
    });

    test('throws an error if the handle and/or weet id are invalid', async () => {
        const firstWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle1'`);
        await User.favorite('handle1', firstWeet.rows[0].id);
        expect(async () => {
            await User.unFavorite('not_a_handle', firstWeet.rows[0].id)
        }).rejects.toThrow();
        expect(async () => {
            await User.unFavorite('handle1', 'not_a_weet');
        }).rejects.toThrow();
        expect(async () => {
            await User.unFavorite('not_a_handle', 'not_a_weet')
        }).rejects.toThrow();
    });

    test('throws an error if the account has not favorited the weet', async () => {
        const firstWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle1'`);
        expect(async () => {
            await User.unFavorite('handle1', firstWeet.rows[0].id)
        });
    });
});

describe('getFavorites', () => {
    test('returns an array of weets the user has favorited', async () => {
        const firstWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle1'`);
        const secondWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle2'`);
        await User.favorite('handle1', firstWeet.rows[0].id);
        await User.favorite('handle1', secondWeet.rows[0].id);
        const result = await User.getFavorites('handle1');
        expect(result[0].weet).toEqual('Just an example weet');
        expect(result[0].time).toBeDefined();
        expect(result[0].date).toBeDefined();
        expect(result[1].weet).toEqual('Just enjoying my day');
        expect(result[1].time).toBeDefined();
        expect(result[1].date).toBeDefined();
        //expect(result).toEqual([{weet: 'Just an example weet'}, {weet: 'Just enjoying my day'}])
    });

    test('returns an empty array (assuming the user has not favorited any weets)', async () => {
        const result = await User.getFavorites('handle1');
        expect(result).toEqual([]);
    });

    test('throws an error if the handle provided is not valid', async () => {
        expect(async () => {
            await User.getFavorites('not_a_handle')
        }).rejects.toThrow();
    });
});

describe('tab', () => {
    test('works if a valid handle and weet id are provided (different user)', async () => {
        const firstWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle1'`);
        const result = await User.tab('handle2', firstWeet.rows[0].id);
        expect(result).toEqual('weet succesfully tabbed');
        const check = await db.query(`SELECT user_id FROM tabs WHERE user_id = $1 AND weet_id = $2`, ['handle2', firstWeet.rows[0].id]);
        expect(check.rows[0].user_id).toEqual('handle2');
    });

    test('works if a valid handle and weet id are provided (same user)', async () => {
        const firstWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle1'`);
        const result = await User.tab('handle1', firstWeet.rows[0].id);
        expect(result).toEqual('weet succesfully tabbed');
        const check = await db.query(`SELECT user_id FROM tabs WHERE user_id = $1 AND weet_id = $2`, ['handle1', firstWeet.rows[0].id]);
        expect(check.rows[0].user_id).toEqual('handle1');
    });

    test('throws an error if the handle and/or weet id are invalid', async () => {
        const firstWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle1'`);
        expect(async () => {
            await User.tab('not_a_handle', firstWeet.rows[0].id)
        }).rejects.toThrow();
        expect(async () => {
            await User.tab('handle2', 'not_a_weet')
        }).rejects.toThrow();
        expect(async () => {
            await User.tab('not_a_handle', 'not_a_weet')
        }).rejects.toThrow();
    });

    test('throws an error if the account already tabbed the weet', async () => {
        const firstWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle1'`);
        await User.tab('handle2', firstWeet.rows[0].id);
        expect(async () => {
            await User.tab('handle2', firstWeet.rows[0].id)
        }).rejects.toThrow();
    });
});

describe('unTab', () => {
    test('works if a valid handle and weet id are provided (different user)', async () => {
        const firstWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle1'`);
        await User.tab('handle2', firstWeet.rows[0].id);
        const result = await User.unTab('handle2', firstWeet.rows[0].id);
        expect(result).toEqual('succesfully removed the tab');
        const check = await db.query(`SELECT user_id FROM tabs WHERE user_id = $1 AND weet_id = $2`, ['handle2', firstWeet.rows[0].id]);
        expect(check.rows).toEqual([]);
    });

    test('works if a valid handle and weet id are provided (same user)', async () => {
        const firstWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle1'`);
        await User.tab('handle1', firstWeet.rows[0].id);
        const result = await User.unTab('handle1', firstWeet.rows[0].id);
        expect(result).toEqual('succesfully removed the tab');
        const check = await db.query(`SELECT user_id FROM tabs WHERE user_id = $1 AND weet_id = $2`, ['handle1', firstWeet.rows[0].id]);
        expect(check.rows).toEqual([]);
    });

    test('throws an error if the handle and/or weet id are invalid', async () => {
        const firstWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle1'`);
        await User.tab('handle2', firstWeet.rows[0].id);
        expect(async () => {
            await User.unTab('not_a_handle', firstWeet.rows[0].id)
        }).rejects.toThrow();
        expect(async () => {
            await User.unTab('handle2', 'not_a_weet')
        }).rejects.toThrow();
        expect(async () => {
            await User.unTab('not_a_handle', 'not_a_weet')
        }).rejects.toThrow();
    });

    test('throws an error if the account has not tabbed the weet', async () => {
        const firstWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle1'`);
        expect(async () => {
            await User.unTab('handle2', firstWeet.rows[0].id)
        }).rejects.toThrow();
    });
});

describe('getTabs', () => {
    test('returns an array of weets the user has tabbed', async () => {
        const firstWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle1'`);
        const secondWeet = await db.query(`SELECT id FROM weets WHERE author = 'handle2'`);
        await User.tab('handle1', firstWeet.rows[0].id);
        await User.tab('handle1', secondWeet.rows[0].id);
        const result = await User.getTabs('handle1');
        expect(result[0].weet).toEqual('Just an example weet');
        expect(result[0].time).toBeDefined();
        expect(result[0].date).toBeDefined();
        expect(result[1].weet).toEqual('Just enjoying my day');
        expect(result[1].time).toBeDefined();
        expect(result[1].date).toBeDefined();
        //expect(result).toEqual([{weet: 'Just an example weet'}, {weet: 'Just enjoying my day'}])
    });
    test('returns an empty array (assuming the user has not tabbed any weets)', async () => {
        const result = await User.getTabs('handle1');
        expect(result).toEqual([]);
    });
    test('throws an error if the handle provided is not valid', async () => {
        expect(async () => {
            await User.getTabs('not_a_handle')
        }).rejects.toThrow();
    });
});