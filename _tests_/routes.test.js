process.env.NODE_ENV = 'test';

const app = require('../app');
const request = require('supertest');
const db = require('../db');
const bcrypt = require('bcrypt');
const createToken = require('../helpers/createToken');
const jwt = require('jsonwebtoken');
const { SECRET_KEY, BCRYPT_WORK_FACTOR } = require('../config');
const User = require('../models/User');
const Weet = require('../models/Weet');

const tokens = {};

beforeEach(async () => {
    let sampleUsers = [
        ['handle1', 'user1', await bcrypt.hash('password1', BCRYPT_WORK_FACTOR), 'email1'],
        ['handle2', 'user2', await bcrypt.hash('password2', BCRYPT_WORK_FACTOR), 'email2'],
        ['handle3', 'user3', await bcrypt.hash('password3', BCRYPT_WORK_FACTOR), 'email3']
    ];

    for (let user of sampleUsers){
        const result = await db.query(
            `INSERT INTO users (handle, username, password, email) VALUES ($1, $2, $3, $4) RETURNING *`,
            [...user]
        );
        tokens[result.rows[0].handle] = createToken(result.rows[0]);
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
    };
});

describe('POST /account/sign-up', () => {
    test('it should return a valid json web token', async () => {
        const response = await request(app)
           .post('/account/sign-up')
           .send({ handle: 'handle4', username: 'user4', password: 'password4', email: 'email4' });
        expect(response.statusCode).toEqual(201);
        const decode = jwt.decode(response.body.token);
        expect(decode.handle).toEqual('handle4');
        expect(decode.password).not.toEqual('password4');
    });

    test('it should throw an error if a non-unique handle is provided', async () => {
        const response = await request(app)
           .post('/account/sign-up')
           .send({ handle: 'handle1', username: 'user4', password: 'password4', email: 'email4' });
        expect(response.statusCode).toEqual(400);
    });

    test('it should throw an error if a non-unique email is provided', async () => {
        const response = await request(app)
           .post('/account/sign-up')
           .send({ handle: 'handle4', username: 'user4', password: 'password4', email: 'email1' });
        expect(response.statusCode).toEqual(400);
    });

    test('it should throw an error if any information is missing', async () => {
        const response = await request(app)
           .post('/account/sign-up');
        expect(response.statusCode).toEqual(400);
    });
});

describe('POST /account/log-in', () => {
    test('it should return a valid json web token if valid credentials are provided', async () => {
        const response = await request(app)
           .post('/account/log-in')
           .send({ handle: 'handle1', password: 'password1' });
        expect(response.statusCode).toEqual(201);
        const decode = jwt.decode(response.body.token);
        expect(decode.handle).toEqual('handle1');
        expect(decode.password).not.toEqual('password1');
    });

    test('it should throw an error if invalid credentials are provided', async () => {
        const response1 = await request(app)
           .post('/account/log-in')
           .send({ handle: 'handle2', password: 'password1' });
        expect(response1.statusCode).toEqual(401);

        const response2 = await request(app)
           .post('/account/log-in')
           .send({ handle: 'handle1', password: 'password2' });
        expect(response2.statusCode).toEqual(401);

        const response3 = await request(app)
           .post('/account/log-in')
           .send({ handle: 'not a handle', password: 'password1' });
        expect(response3.statusCode).toEqual(401);

        const response4 = await request(app)
           .post('/account/log-in')
           .send({ handle: 'handle1', password: 'not a password' });
        expect(response4.statusCode).toEqual(401);
    });

    test('it should throw an error if no information is provided', async () => {
        const response = await request(app)
           .post('/account/log-in');
        expect(response.statusCode).toEqual(401);
    });
});

describe('POST /profile/:handle', () => {
    test('it should return valid json if a valid handle is provided, alongside a valid json web token (userHandle neither following nor being followed)', async () => {
        const token = tokens['handle1'];
        const response = await request(app)
            .post('/profile/handle2')
            .send({_token: token});
        expect(response.statusCode).toEqual(201);
        expect(response.body.user.handle).toEqual('handle2');
        expect(response.body.user.password).not.toEqual('password2');
        expect(response.body.user.user_description).toEqual('A default user description');
        expect(response.body.user.profile_image).toEqual('A default profile image');
        expect(response.body.user.banner_image).toEqual('A default banner image');
        expect(response.body.user.followStatus.isFollower).toEqual(false);
        expect(response.body.user.followStatus.isFollowee).toEqual(false);
    });

    test('it should return valid json if a valid handle is provided, alongside a valid json web token (userHandle following, but not being followed)', async () => {
        await User.follow('handle1', 'handle2');
        const token = tokens['handle1'];
        const response = await request(app)
           .post('/profile/handle2')
           .send({_token: token});
        expect(response.statusCode).toEqual(201);
        expect(response.body.user.followStatus.isFollower).toEqual(true);
        expect(response.body.user.followStatus.isFollowee).toEqual(false);
    });

    test('it should return valid json if a valid handle is provided, alongside a valid json web token (userHandle not following, but being followed)', async () => {
        await User.follow('handle2', 'handle1');
        const token = tokens['handle1'];
        const response = await request(app)
           .post('/profile/handle2')
           .send({_token: token});
        expect(response.statusCode).toEqual(201);
        expect(response.body.user.followStatus.isFollower).toEqual(false);
        expect(response.body.user.followStatus.isFollowee).toEqual(true);
    });

    test('it should return valid json if a valid handle is provided, alongside a valid json web token (userHandle both following and being followed)', async () => {
        await User.follow('handle1', 'handle2');
        await User.follow('handle2', 'handle1');
        const token = tokens['handle1'];
        const response = await request(app)
           .post('/profile/handle2')
           .send({_token: token});
        expect(response.statusCode).toEqual(201);
        expect(response.body.user.followStatus.isFollower).toEqual(true);
        expect(response.body.user.followStatus.isFollowee).toEqual(true);
    });

    test('it should return valid json if a valid handle is provided, alongside a valid json web token (userHandle and handle are same)', async () => {
        const token = tokens['handle2'];
        const response = await request(app)
           .post('/profile/handle2')
           .send({_token: token});
        expect(response.statusCode).toEqual(201);
        expect(response.body.user.followStatus.isFollower).toEqual(false);
        expect(response.body.user.followStatus.isFollowee).toEqual(false);
    });

    test('it should throw an error if an invalid handle is provided', async () => {
        const token = tokens['handle1'];
        const response = await request(app)
           .post('/profile/handle7')
           .send({_token: token});
        expect(response.statusCode).toEqual(404);
    });

    test('it should throw an error if a json web token from a separate source is provided', async () => {
        const invalidToken = jwt.sign({handle: 'handle1'}, 'other secret key');
        const response = await request(app)
           .post('/profile/handle2')
           .send({_token: invalidToken})
        expect(response.statusCode).toEqual(401);
    });

    test('it should throw an error if an invalid json web token is provided', async () => {
        const invalidToken1 = createToken({notHandle: 'not a handle'});
        const response1 = await request(app)
           .post('/profile/handle2')
           .send({_token: invalidToken1});
        expect(response1.statusCode).toEqual(401);

        const invalidToken2 = createToken({handle: 'not a handle'});
        const response2 = await request(app)
           .post('/profile/handle2')
           .send({_token: invalidToken2});
        expect(response2.statusCode).toEqual(401);
    });

    test('it should throw an error if no json web token is provided', async () => {
        const response = await request(app)
           .post('/profile/handle2');
        expect(response.statusCode).toEqual(401);
    });
});

describe('PUT /profile/:handle/edit', () => {
    test('it should return a valid json web token if valid credentials are provided (old password, old email)', async () => {
        const token = tokens['handle1'];
        const response = await request(app)
           .put('/profile/handle1/edit')
           .send({_token: token, username: 'user1', oldPassword: 'password1', newPassword: '', email: 'email1', userDescription: 'A new user description', profilePicture: 'A new profile picture', bannerPicture: 'A new banner picture'});
        expect(response.statusCode).toEqual(201);
        const decode = jwt.decode(response.body.token);
        expect(decode.handle).toEqual('handle1');
        expect(decode.user_description).toEqual('A new user description');
    });

    test('it should return a valid json web token if valid credentials are provided (new password, new email)', async () => {
        const token = tokens['handle1'];
        const response = await request(app)
           .put('/profile/handle1/edit')
           .send({_token: token, username: 'user1', oldPassword: 'password1', newPassword: 'newpassword1', email: 'newemail1', userDescription: 'A new user description', profilePicture: 'A new profile picture', bannerPicture: 'A new banner picture'});
        expect(response.statusCode).toEqual(201);
        const decode = jwt.decode(response.body.token);
        expect(decode.handle).toEqual('handle1');
        expect(async () => {
            await User.authenticate('handle1', 'password1')
        }).rejects.toThrow();
    });

    test('it should throw an error if the wrong password is provided', async () => {
        const token = tokens['handle1'];
        const response = await request(app)
           .put('/profile/handle1/edit')
           .send({_token: token, username: 'user1', oldPassword: 'not a password', newPassword: '', email: 'email1', userDescription: 'A new user description', profilePicture: 'A new profile picture', bannerPicture: 'A new banner picture'});
        expect(response.statusCode).toEqual(401);
    });

    test('it should throw an error if a non-unique email is provided that is from another account', async () => {
        const token = tokens['handle1'];
        const response = await request(app)
           .put('/profile/handle1/edit')
           .send({_token: token, username: 'user1', oldPassword: 'password1', newPassword: '', email: 'email2', userDescription: 'A new user description', profilePicture: 'A new profile picture', bannerPicture: 'A new banner picture'});
        expect(response.statusCode).toEqual(403);
    });

    test('it should throw an error if the new password provided violates the minimum or maximum length constraint, or is the same as the old password', async () => {
        const token = tokens['handle1'];
        const response1 = await request(app)
           .put('/profile/handle1/edit')
           .send({_token: token, username: 'user1', oldPassword: 'password1', newPassword: 'short', email: 'email1', userDescription: 'A new user description', profilePicture: 'A new profile picture', bannerPicture: 'A new banner picture'});
        expect(response1.statusCode).toEqual(403);

        const response2 = await request(app)
           .put('/profile/handle1/edit')
           .send({_token: token, username: 'user1', oldPassword: 'password1', newPassword: 'this password greatly exceeds the character limit', email: 'email1', userDescription: 'A new user description', profilePicture: 'A new profile picture', bannerPicture: 'A new banner picture'});
        expect(response2.statusCode).toEqual(403);

        const response3 = await request(app)
           .put('/profile/handle1/edit')
           .send({_token: token, username: 'user1', oldPassword: 'password1', newPassword: 'password1', email: 'email1', userDescription: 'A new user description', profilePicture: 'A new profile picture', bannerPicture: 'A new banner picture'});
        expect(response3.statusCode).toEqual(403);
    });

    test('it should throw an error if no information is sent', async () => {
        const token = tokens['handle1'];
        const response = await request(app)
           .put('/profile/handle1/edit')
           .send({_token: token});
        expect(response.statusCode).toEqual(400);
    });

    test('it should throw an error if another user attempts to alter a seperate account', async () => {
        const token = tokens['handle2'];
        const response = await request(app)
           .put('/profile/handle1/edit')
           .send({_token: token, username: 'user1', oldPassword: 'password1', newPassword: '', email: 'email1', userDescription: 'A new user description', profilePicture: 'A new profile picture', bannerPicture: 'A new banner picture'});
        expect(response.statusCode).toEqual(401);
    });

    test('it should throw an error if a json web token originating outside the app is provided', async () => {
        const invalidToken = jwt.sign({handle: 'handle1'}, 'other secret key');
        const response = await request(app)
           .put('/profile/handle1/edit')
           .send({_token: invalidToken, username: 'user1', oldPassword: 'password1', newPassword: '', email: 'email1', userDescription: 'A new user description', profilePicture: 'A new profile picture', bannerPicture: 'A new banner picture'});
        expect(response.statusCode).toEqual(401);
    });

    test('it should throw an error if an invalid json web token is provided', async () => {
        const invalidToken1 = createToken({handle: 'not a handle'});
        const response1 = await request(app)
           .put('/profile/handle1/edit')
           .send({_token: invalidToken1, username: 'user1', oldPassword: 'password1', newPassword: '', email: 'email1', userDescription: 'A new user description', profilePicture: 'A new profile picture', bannerPicture: 'A new banner picture'});
        expect(response1.statusCode).toEqual(401);

        const invalidToken2 = createToken({notHandle: 'not a handle'});
        const response2 = await request(app)
           .put('/profile/handle1/edit')
           .send({_token: invalidToken2, username: 'user1', oldPassword: 'password1', newPassword: '', email: 'email1', userDescription: 'A new user description', profilePicture: 'A new profile picture', bannerPicture: 'A new banner picture'});
        expect(response2.statusCode).toEqual(401);
    });

    test('it should throw an error if no json web token is provided', async () => {
        const response = await request(app)
           .put('/profile/handle1/edit')
           .send({username: 'user1', oldPassword: 'password1', newPassword: '', email: 'email1', userDescription: 'A new user description', profilePicture: 'A new profile picture', bannerPicture: 'A new banner picture'});
        expect(response.statusCode).toEqual(401);
    });
});

describe('DELETE /profile/:handle/edit', () => {
    test('it should delete an account if a proper handle is provided and the json web token contains the handle (same user)', async () => {
        const token = tokens['handle1'];
        const response = await request(app)
           .delete('/profile/handle1/edit')
           .send({_token: token});
        expect(response.statusCode).toEqual(201);
    });

    test('it should throw an error if another user attempts to delete a separate account', async () => {
        const token = tokens['handle1'];
        const response = await request(app)
            .delete('/profile/handle2/edit')
            .send({_token: token});
        expect(response.statusCode).toEqual(401);
    });

    test('it should throw an error if a json web token originating outside the app is provided', async () => {
        const invalidToken = jwt.sign({handle: 'handle1'}, 'other secret key');
        const response = await request(app)
           .delete('/profile/handle1/edit')
           .send({_token: invalidToken});
        expect(response.statusCode).toEqual(401);
    });

    test('it should throw an error if an invalid json web token is provided', async () => {
        const invalidToken1 = createToken({handle: 'not a handle'});
        const response1 = await request(app)
           .delete('/profile/handle1/edit')
           .send({_token: invalidToken1});
        expect(response1.statusCode).toEqual(401);

        const invalidToken2 = createToken({notHandle: 'not a handle'});
        const response2 = await request(app)
           .delete('/profile/handle1/edit')
           .send({_token: invalidToken2});
        expect(response2.statusCode).toEqual(401);
    });

    test('it should throw an error if no json web token is provided', async () => {
        const response = await request(app)
           .delete('/profile/handle1/edit');
        expect(response.statusCode).toEqual(401);
    });
});

describe('POST /profile/:handle/weets', () => {
    test('it should return an array of weets (account has written one or more weets)', async () => {
        await Weet.create('A brand new weet', 'handle1');
        const token = tokens['handle1'];
        const response = await request(app)
           .post('/profile/handle1/weets')
           .send({ _token: token });
        expect(response.statusCode).toEqual(201);
        const results = response.body.result;
        expect(results[0].weet).toEqual('A brand new weet');
        expect(results[1].weet).toEqual('Just an example weet');
    });

    test('it should return an empty array of weets (account has written no weets)', async () => {
        await db.query(`DELETE FROM weets WHERE author = 'handle1'`);
        const token = tokens['handle1'];
        const response = await request(app)
           .post('/profile/handle1/weets')
           .send({ _token: token });
        expect(response.statusCode).toEqual(201);
        expect(response.body.result).toEqual([]);
    });

    test('it should throw an error if the account does not exist', async () => {
        const token = tokens['handle1'];
        const response = await request(app)
           .post('/profile/notahandle/weets')
           .send({ _token: token });
        expect(response.statusCode).toEqual(404);
    });

    test('it should throw an error if a json token from another source is provided', async () => {
        const invalidToken = jwt.sign({handle: 'handle1'}, 'other secret key');
        const response = await request(app)
           .post('/profile/handle1/weets')
           .send({ _token: invalidToken });
        expect(response.statusCode).toEqual(401);
    });

    test('it should throw an error if a non-valid json token is provided', async () => {
        const invalidToken1 = createToken({handle: 'notahandle'});
        const response1 = await request(app)
           .post('/profile/handle1/weets')
           .send({ _token: invalidToken1 })
        expect(response1.statusCode).toEqual(401);

        const invalidToken2 = createToken({notHandle: 'notahandle'});
        const response2 = await request(app)
           .post('/profile/handle1/weets')
           .send({ _token: invalidToken2 })
        expect(response2.statusCode).toEqual(401);
    });

    test('it should throw an error if no token is provided', async () => {
        const response = await request(app)
           .post('/profile/handle1/weets')
        expect(response.statusCode).toEqual(401);
    });
});

describe('POST /profile/:handle/reweets', () => {
    test('it should return an array of reweeted weets (account has a few reweeted weets)', async () => {
        const allWeets = await db.query(`SELECT * FROM weets ORDER BY time_date DESC`);
        await User.reweet('handle1', allWeets.rows[2].id);
        await User.reweet('handle1', allWeets.rows[0].id);
        const token = tokens['handle1'];
        const response = await request(app)
           .post('/profile/handle1/reweets')
           .send({ _token: token });
        expect(response.statusCode).toEqual(201); 
        const results = response.body.result;
        expect(results[0].weet).toEqual('Good morning New York');
        expect(results[1].weet).toEqual('Just an example weet');
    });

    test('it should return an empty array (account does not have any reweeted weets)', async () => {
        const token = tokens['handle1'];
        const response = await request(app)
           .post('/profile/handle1/reweets')
           .send({ _token: token });
        expect(response.statusCode).toEqual(201);
        expect(response.body.result).toEqual([]);
    });

    test('it should throw an error if the account does not exist', async () => {
        const token = tokens['handle1'];
        const response = await request(app)
           .post('/profile/notahandle/reweets')
           .send({ _token: token });
        expect(response.statusCode).toEqual(404)
    });

    test('it should throw an error if a json token from another source is provided', async () => {
        const invalidToken = jwt.sign({handle: 'handle1'}, 'other secret key');
        const response = await request(app)
           .post('/profile/handle1/reweets')
           .send({ _token: invalidToken });
        expect(response.statusCode).toEqual(401)
    });

    test('it should throw an error if a non-valid json token is provided', async () => {
        const invalidToken1 = createToken({notHandle: 'handle1'});
        const response1 = await request(app)
           .post('/profile/handle1/reweets')
           .send({ _token: invalidToken1 });
        expect(response1.statusCode).toEqual(401)

        const invalidToken2 = createToken({handle: 'notahandle'});
        const response2 = await request(app)
           .post('/profile/handle1/reweets')
           .send({ _token: invalidToken2 });
        expect(response2.statusCode).toEqual(401)
    });

    test('it should throw an error if no json token is provided', async () => {
        const response = await request(app)
           .post('/profile/handle1/reweets');
        expect(response.statusCode).toEqual(401)
    });
});

describe('POST /profile/:handle/favorites', () => {
    test('it should return an array of favorited weets (account has a few favorited weets)', async () => {
        const allWeets = await db.query(`SELECT * FROM weets ORDER BY time_date DESC`);
        await User.favorite('handle1', allWeets.rows[0].id);
        await User.favorite('handle1', allWeets.rows[2].id)
        const token = tokens['handle1'];
        const response = await request(app)
           .post('/profile/handle1/favorites')
           .send({ _token: token });
        expect(response.statusCode).toEqual(201);
        const results = response.body.result;
        expect(results[0].weet).toEqual('Just an example weet');
        expect(results[1].weet).toEqual('Good morning New York');
    });

    test('it should return an empty array (account does not have any reweeted weets)', async () => {
        const token = tokens['handle1'];
        const response = await request(app)
           .post('/profile/handle1/favorites')
           .send({ _token: token });
        expect(response.statusCode).toEqual(201);
        expect(response.body.result).toEqual([]);
    });

    test('it should throw an error if the account does not exist', async () => {
        const token = tokens['handle1'];
        const response = await request(app)
           .post('/profile/notahandle/favorites')
           .send({ _token: token });
        expect(response.statusCode).toEqual(404);
    });

    test('it should throw an error if a json token from another source is provided', async () => {
        const token = jwt.sign({handle: 'handle1'}, 'other secret key');
        const response = await request(app)
           .post('/profile/handle1/favorites')
           .send({ _token: token });
        expect(response.statusCode).toEqual(401);
    });

    test('it should throw an error if a non-valid json token is provided', async () => {
        const invalidToken1 = createToken({notHandle: 'handle1'});
        const response1 = await request(app)
           .post('/profile/handle1/favorites')
           .send({ _token: invalidToken1 });
        expect(response1.statusCode).toEqual(401);

        const invalidToken2 = createToken({handle: 'notahandle'});
        const response2 = await request(app)
           .post('/profile/handle1/favorites')
           .send({ _token: invalidToken2 });
        expect(response2.statusCode).toEqual(401);
    });

    test('it should throw an error if no json token is provided', async () => {
        const response = await request(app)
           .post('/profile/handle1/favorites');
        expect(response.statusCode).toEqual(401)
    });
});

describe('POST /profile/:handle/tabs', () => {
    test('it should return an array of tabbed weets (account has a few tabbed weets)', async () => {
        const allWeets = await db.query(`SELECT * FROM weets ORDER BY time_date DESC`);
        await User.tab('handle1', allWeets.rows[0].id);
        await User.tab('handle1', allWeets.rows[2].id);
        const token = tokens['handle1'];
        const response = await request(app)
           .post('/profile/handle1/tabs')
           .send({ _token: token });
        expect(response.statusCode).toEqual(201);
        const results = response.body.result;
        expect(results[0].weet).toEqual('Just an example weet');
        expect(results[1].weet).toEqual('Good morning New York');
    });

    test('it should return an empty array (account does not have any tabbed weets)', async () => {
        const token = tokens['handle1'];
        const response = await request(app)
           .post('/profile/handle1/tabs')
           .send({ _token: token });
        expect(response.statusCode).toEqual(201);
        expect(response.body.result).toEqual([]);
    });
    
    test('it should throw an error if the user is not the owner of the account', async () => {
        const token = tokens['handle1'];
        const response = await request(app)
           .post('/profile/handle2/tabs')
           .send({ _token: token });
        expect(response.statusCode).toEqual(401);
    });

    test('it should throw an error if a json token from another source is provided', async () => {
        const token = jwt.sign({handle: 'handle1'}, 'other secret key');
        const response = await request(app)
           .post('/profile/handle1/tabs')
           .send({ _token: token });
        expect(response.statusCode).toEqual(401);
    });

    test('it should throw an error if a non-valid json token is provided', async () => {
        const invalidToken1 = createToken({notHandle: 'handle1'});
        const response1 = await request(app)
           .post('/profile/handle1/tabs')
           .send({ _token: invalidToken1 });
        expect(response1.statusCode).toEqual(401);
        
        const invalidToken2 = createToken({handle: 'notahandle'});
        const response2 = await request(app)
           .post('/profile/handle1/tabs')
           .send({ _token: invalidToken2 });
        expect(response2.statusCode).toEqual(401);
    });

    test('it should throw an error if no json token is provided', async () => {
        const response = await request(app)
           .post('/profile/handle1/tabs');
        expect(response.statusCode).toEqual(401);
    });
});

describe('POST /profile/:handle/following', () => {
    test('it should return an array of accounts the handle is following (userHandle is neither following nor being followed)', async () => {
        await User.follow('handle3', 'handle2');
        const token = tokens['handle1'];
        const response = await request(app)
           .post('/profile/handle3/following')
           .send({ _token: token });
        expect(response.statusCode).toEqual(201);
        const results = response.body.result;
        expect(results[0].handle).toEqual('handle2');
        expect(results[0].followStatus.isFollower).toEqual(false);
        expect(results[0].followStatus.isFollowee).toEqual(false);
    });

    test('it should return an array of accounts the handle is following (userHandle is following but not being followed)', async () => {
        await User.follow('handle3', 'handle2');
        await User.follow('handle1', 'handle2');
        const token = tokens['handle1'];
        const response = await request(app)
           .post('/profile/handle3/following')
           .send({ _token: token });
        expect(response.statusCode).toEqual(201);
        const results = response.body.result;
        expect(results[0].handle).toEqual('handle2');
        expect(results[0].followStatus.isFollower).toEqual(true);
        expect(results[0].followStatus.isFollowee).toEqual(false);
    });

    test('it should return an array of accounts the handle is following (userHandle is not following, but being followed)', async () => {
        await User.follow('handle3', 'handle2');
        await User.follow('handle2', 'handle1');
        const token = tokens['handle1'];
        const response = await request(app)
           .post('/profile/handle3/following')
           .send({ _token: token });
        expect(response.statusCode).toEqual(201);
        const results = response.body.result;
        expect(results[0].handle).toEqual('handle2');
        expect(results[0].followStatus.isFollower).toEqual(false);
        expect(results[0].followStatus.isFollowee).toEqual(true);
    });

    test('it should return an array of accounts the handle is following (userHandle is both following and being followed)', async () => {
        await User.follow('handle3', 'handle2');
        await User.follow('handle1', 'handle2');
        await User.follow('handle2', 'handle1');
        const token = tokens['handle1'];
        const response = await request(app)
           .post('/profile/handle3/following')
           .send({ _token: token });
        expect(response.statusCode).toEqual(201);
        const results = response.body.result;
        expect(results[0].handle).toEqual('handle2');
        expect(results[0].followStatus.isFollower).toEqual(true);
        expect(results[0].followStatus.isFollowee).toEqual(true);
    });

    test('it should return an array of accounts the handle is following (should display false on each followStatus key if userHandle is in array)', async () => {
        await User.follow('handle3', 'handle2');
        await User.follow('handle3', 'handle1');
        const token = tokens['handle1'];
        const response = await request(app)
           .post('/profile/handle3/following')
           .send({ _token: token });
        expect(response.statusCode).toEqual(201);
        const results = response.body.result;
        expect(results[0].handle).toEqual('handle2');
        expect(results[0].followStatus.isFollower).toEqual(false);
        expect(results[0].followStatus.isFollowee).toEqual(false);
        expect(results[1].handle).toEqual('handle1');
        expect(results[1].followStatus.isFollower).toEqual(false);
        expect(results[1].followStatus.isFollowee).toEqual(false);
    });

    test('it should return an array of accounts the handle is following (userHandle and handle are the same)', async () => {
        await User.follow('handle1', 'handle3');
        await User.follow('handle1', 'handle2');
        const token = tokens['handle1'];
        const response = await request(app)
           .post('/profile/handle1/following')
           .send({ _token: token });
        expect(response.statusCode).toEqual(201);
        const results = response.body.result;
        expect(results[0].handle).toEqual('handle3');
        expect(results[0].followStatus.isFollower).toEqual(true);
        expect(results[0].followStatus.isFollowee).toEqual(false);
        expect(results[1].handle).toEqual('handle2');
        expect(results[1].followStatus.isFollower).toEqual(true);
        expect(results[1].followStatus.isFollowee).toEqual(false);
    });

    test('it should return an empty array (handle does not follow any accounts)', async () => {
        const token = tokens['handle1'];
        const response = await request(app)
           .post('/profile/handle1/following')
           .send({ _token: token });
        expect(response.statusCode).toEqual(201);
        expect(response.body.result).toEqual([]);
    });

    test('it should throw an error if the account does not exist', async () => {
        const token = tokens['handle1'];
        const response = await request(app)
           .post('/profile/notahandle/following')
           .send({ _token: token });
        expect(response.statusCode).toEqual(404);
    });

    test('it should throw an error if a json token from another source is provided', async () => {
        const token = jwt.sign({handle: 'handle1'}, 'other secret key');
        const response = await request(app)
           .post('/profile/handle1/following')
           .send({ _token: token });
        expect(response.statusCode).toEqual(401);
    });

    test('it should throw an error if a non-valid json token is provided', async () => {
        const invalidToken1 = createToken({notHandle: 'handle1'});
        const response1 = await request(app)
           .post('/profile/handle1/following')
           .send({ _token: invalidToken1 });
        expect(response1.statusCode).toEqual(401);

        const invalidToken2 = createToken({handle: 'notahandle'});
        const response2 = await request(app)
           .post('/profile/handle1/following')
           .send({ _token: invalidToken2 });
        expect(response2.statusCode).toEqual(401);
    });

    test('it should throw an error if no json token is provided', async () => {
        const response = await request(app)
           .post('/profile/handle1/following');
        expect(response.statusCode).toEqual(401);
    });
});

describe('POST /profile/:handle/followers', () => {
    test('it should return an array of accounts that follow the handle (userHandle is neither following nor being followed)', async () => {
        await User.follow('handle2', 'handle3');
        const token = tokens['handle1'];
        const response = await request(app)
           .post('/profile/handle3/followers')
           .send({ _token: token });
        expect(response.statusCode).toEqual(201);
        const results = response.body.result;
        expect(results[0].handle).toEqual('handle2');
        expect(results[0].followStatus.isFollower).toEqual(false);
        expect(results[0].followStatus.isFollowee).toEqual(false);
    });

    test('it should return an array of accounts that follow the handle (userHandle is following but not being followed)', async () => {
        await User.follow('handle2', 'handle3');
        await User.follow('handle1', 'handle2');
        const token = tokens['handle1'];
        const response = await request(app)
           .post('/profile/handle3/followers')
           .send({ _token: token });
        expect(response.statusCode).toEqual(201);
        const results = response.body.result;
        expect(results[0].handle).toEqual('handle2');
        expect(results[0].followStatus.isFollower).toEqual(true);
        expect(results[0].followStatus.isFollowee).toEqual(false);
    });

    test('it should return an array of accounts that follow the handle (userHandle is not following, but being followed)', async () => {
        await User.follow('handle2', 'handle3');
        await User.follow('handle2', 'handle1');
        const token = tokens['handle1'];
        const response = await request(app)
           .post('/profile/handle3/followers')
           .send({ _token: token });
        expect(response.statusCode).toEqual(201);
        const results = response.body.result;
        expect(results[0].handle).toEqual('handle2');
        expect(results[0].followStatus.isFollower).toEqual(false);
        expect(results[0].followStatus.isFollowee).toEqual(true);
    });

    test('it should return an array of accounts that follow the handle (userHandle is both following and being followed)', async () => {
        await User.follow('handle2', 'handle3');
        await User.follow('handle2', 'handle1');
        await User.follow('handle1', 'handle2');
        const token = tokens['handle1'];
        const response = await request(app)
           .post('/profile/handle3/followers')
           .send({ _token: token });
        expect(response.statusCode).toEqual(201);
        const results = response.body.result;
        expect(results[0].handle).toEqual('handle2');
        expect(results[0].followStatus.isFollower).toEqual(true);
        expect(results[0].followStatus.isFollowee).toEqual(true);
    });

    test('it should return an array of accounts that follow the handle (should display false on each followStatus key if userHandle is in array)', async () => {
        await User.follow('handle1', 'handle3');
        const token = tokens['handle1'];
        const response = await request(app)
           .post('/profile/handle3/followers')
           .send({ _token: token });
        expect(response.statusCode).toEqual(201);
        const results = response.body.result;
        expect(results[0].handle).toEqual('handle1');
        expect(results[0].followStatus.isFollower).toEqual(false);
        expect(results[0].followStatus.isFollowee).toEqual(false);
    })

    test('it should return an array of accounts that follow the handle (userHandle and handle are the same)', async () => {
        await User.follow('handle3', 'handle1');
        await User.follow('handle2', 'handle1');
        const token = tokens['handle1'];
        const response = await request(app)
           .post('/profile/handle1/followers')
           .send({ _token: token });
        expect(response.statusCode).toEqual(201);
        const results = response.body.result;
        expect(results[0].handle).toEqual('handle3');
        expect(results[0].followStatus.isFollower).toEqual(false);
        expect(results[0].followStatus.isFollowee).toEqual(true);
        expect(results[1].handle).toEqual('handle2');
        expect(results[1].followStatus.isFollower).toEqual(false);
        expect(results[1].followStatus.isFollowee).toEqual(true);
    });

    test('it should return an empty array (no accounts follow the handle)', async () => {
        const token = tokens['handle1'];
        const response = await request(app)
           .post('/profile/handle1/followers')
           .send({ _token: token });
        expect(response.statusCode).toEqual(201);
        expect(response.body.result).toEqual([]);
    });

    test('it should throw an error if the account does not exist', async () => {
        const token = tokens['handle1'];
        const response = await request(app)
           .post('/profile/notahandle/followers')
           .send({ _token: token });
        expect(response.statusCode).toEqual(404);
    });

    test('it should throw an error if a json token from another source is provided', async () => {
        const token = jwt.sign({handle: 'handle1'}, 'other secret key');
        const response = await request(app)
           .post('/profile/handle1/followers')
           .send({ _token: token });
        expect(response.statusCode).toEqual(401);
    });

    test('it should throw an error if a non-valid json token is provided', async () => {
        const invalidToken1 = createToken({notHandle: 'handle1'});
        const response1 = await request(app)
           .post('/profile/handle1/followers')
           .send({ _token: invalidToken1 });
        expect(response1.statusCode).toEqual(401);

        const invalidToken2 = createToken({handle: 'notahandle'});
        const response2 = await request(app)
           .post('/profile/handle1/followers')
           .send({ _token: invalidToken2 });
        expect(response2.statusCode).toEqual(401);
    });

    test('it should throw an error if no json token is provided', async () => {
        const response = await request(app)
           .post('/profile/handle1/followers');
        expect(response.statusCode).toEqual(401);
    });
});

describe('POST /users/:search', () => {
    test('it should return an array of users that match the string (all uppercase; followStatus keys are accurate)', async () => {
        await User.follow('handle1', 'handle2');
        const token = tokens['handle1'];
        const response = await request(app)
           .post('/users/USER')
           .send({ _token: token });
        expect(response.statusCode).toEqual(201);
        const results = response.body.result;
        expect(results[0].username).toEqual('user1');
        expect(results[0].followStatus.isFollower).toEqual(false);
        expect(results[0].followStatus.isFollowee).toEqual(false);
        expect(results[1].username).toEqual('user2');
        expect(results[1].followStatus.isFollower).toEqual(true);
        expect(results[1].followStatus.isFollowee).toEqual(false);
    });

    test('it should return an array of users that match the string (all lowercase; followStatus keys are accurate)', async () => {
        await User.follow('handle2', 'handle1');
        const token = tokens['handle1'];
        const response = await request(app)
           .post('/users/user')
           .send({ _token: token });
        expect(response.statusCode).toEqual(201);
        const results = response.body.result;
        expect(results[0].username).toEqual('user1');
        expect(results[0].followStatus.isFollower).toEqual(false);
        expect(results[0].followStatus.isFollowee).toEqual(false);
        expect(results[1].username).toEqual('user2');
        expect(results[1].followStatus.isFollower).toEqual(false);
        expect(results[1].followStatus.isFollowee).toEqual(true);
    });

    test('it should return an array of users that match the string (mixed case; followStatus keys are accurate)', async () => {
        await User.follow('handle1', 'handle2');
        await User.follow('handle2', 'handle1');
        const token = tokens['handle1'];
        const response = await request(app)
           .post('/users/UseR')
           .send({ _token: token });
        expect(response.statusCode).toEqual(201);
        const results = response.body.result;
        expect(results[0].username).toEqual('user1');
        expect(results[0].followStatus.isFollower).toEqual(false);
        expect(results[0].followStatus.isFollowee).toEqual(false);
        expect(results[1].username).toEqual('user2');
        expect(results[1].followStatus.isFollower).toEqual(true);
        expect(results[1].followStatus.isFollowee).toEqual(true);
    });

    test('it should return an empty array (string does not match any users)', async () => {
        const token = tokens['handle1'];
        const response = await request(app)
           .post('/users/something')
           .send({ _token: token });
        expect(response.statusCode).toEqual(201);
        expect(response.body.result).toEqual([]);
    });

    test('it should throw an error if a json token from another source is provided', async () => {
        const token = jwt.sign({handle: 'handle1'}, 'other secret key');
        const response = await request(app)
           .post('/users/user')
           .send({ _token: token });
        expect(response.statusCode).toEqual(401);
    });

    test('it should throw an error if a non-valid json token is provided', async () => {
        const invalidToken1 = createToken({notHandle: 'handle1'});
        const response1 = await request(app)
           .post('/users/user')
           .send({ _token: invalidToken1 });
        expect(response1.statusCode).toEqual(401);

        const invalidToken2 = createToken({handle: 'notahandle'});
        const response2 = await request(app)
           .post('/users/user')
           .send({ _token: invalidToken2 });
        expect(response2.statusCode).toEqual(401);
    });

    test('it should throw an error if no json token is provided', async () => {
        const response = await request(app)
           .post('/users/user')
        expect(response.statusCode).toEqual(401);
    });
});

describe('POST /users/:handle/follow', () => {
    test('it should succesfully allow the current user to follow another account', async () => {
        const token = tokens['handle1'];
        const response = await request(app)
           .post('/users/handle2/follow')
           .send({ _token: token });
        expect(response.statusCode).toEqual(201);
        expect(response.body.message).toEqual('You are now following handle2');
    });

    test('it should throw an error if the current user is already following the account', async () => {
        const token = tokens['handle1'];
        await User.follow('handle1', 'handle2');
        const response = await request(app)
           .post('/users/handle2/follow')
           .send({ _token: token });
        expect(response.statusCode).toEqual(403);
    });

    test('it should throw an error if the user attempts to follow their own account', async () => {
        const token = tokens['handle1'];
        const response = await request(app)
           .post('/users/handle1/follow')
           .send({ _token: token });
        expect(response.statusCode).toEqual(401);
    });

    test('it should throw an error if the account the user is attempting to follow does not exist', async () => {
        const token = tokens['handle1'];
        const response = await request(app)
           .post('/users/notahandle/follow')
           .send({ _token: token });
        expect(response.statusCode).toEqual(404);
    });

    test('it should throw an error if a json token from another source is provided', async () => {
        const token = jwt.sign({handle: 'handle1'}, 'other secret key');
        const response = await request(app)
           .post('/users/handle2/follow')
           .send({ _token: token });
        expect(response.statusCode).toEqual(401);
    });

    test('it should throw an error if a non-valid json token is provided', async () => {
        const invalidToken1 = createToken({notHandle: 'handle1'});
        const response1 = await request(app)
           .post('/users/handle2/follow')
           .send({ _token: invalidToken1 });
        expect(response1.statusCode).toEqual(401);

        const invalidToken2 = createToken({handle: 'notahandle'});
        const response2 = await request(app)
           .post('/users/handle2/follow')
           .send({ _token: invalidToken2 });
        expect(response2.statusCode).toEqual(401);
    });

    test('it should throw an error if no json token is provided', async () => {
        const response = await request(app)
           .post('/users/handle2/follow');
        expect(response.statusCode).toEqual(401);
    });
});

describe('POST /users/:handle/unfollow', () => {
    test('it should succesfully allow the current user to unfollow another account', async () => {
        await User.follow('handle1', 'handle2');
        const token = tokens['handle1'];
        const response = await request(app)
           .post('/users/handle2/unfollow')
           .send({ _token: token });
        expect(response.statusCode).toEqual(201);
        expect(response.body.message).toEqual('You are no longer following handle2');
    });

    test('it should throw an error if the current user is not currently following the account', async () => {
        const token = tokens['handle1'];
        const response = await request(app)
           .post('/users/handle2/unfollow')
           .send({ _token: token });
        expect(response.statusCode).toEqual(403);
    });

    test('it should throw an error if the user attempts to unfollow their own account', async () => {
        const token = tokens['handle1'];
        const response = await request(app)
           .post('/users/handle1/unfollow')
           .send({ _token: token });
        expect(response.statusCode).toEqual(401)
    });

    test('it should throw an error if the account the user is attempting to unfollow does not exist', async () => {
        const token = tokens['handle1'];
        const response = await request(app)
           .post('/users/notahandle/unfollow')
           .send({ _token: token });
        expect(response.statusCode).toEqual(404)
    });

    test('it should throw an error if a json token from another source is provided', async () => {
        await User.follow('handle1', 'handle2');
        const token = jwt.sign({handle: 'handle1'}, 'other secret key');
        const response = await request(app)
           .post('/users/handle2/unfollow')
           .send({ _token: token });
        expect(response.statusCode).toEqual(401);
    });

    test('it should throw an error if a non-valid json token is provided', async () => {
        await User.follow('handle1', 'handle2');
        const invalidToken1 = createToken({notHandle: 'handle1'});
        const response1 = await request(app)
           .post('/users/handle2/unfollow')
           .send({ _token: invalidToken1 });
        expect(response1.statusCode).toEqual(401);

        const invalidToken2 = createToken({handle: 'notahandle'});
        const response2 = await request(app)
           .post('/users/handle2/unfollow')
           .send({ _token: invalidToken2 });
        expect(response2.statusCode).toEqual(401);
    });

    test('it should throw an error if no json token is provided', async () => {
        const response = await request(app)
           .post('/users/handle2/unfollow')
        expect(response.statusCode).toEqual(401);
    });
});

describe('POST /weets/', () => {
    test('it should succesfully create a weet', async () => {
        const token = tokens['handle1'];
        const response = await request(app)
           .post('/weets')
           .send({ _token: token, weet: 'Making a brand new weet' });
        expect(response.statusCode).toEqual(201);
        expect(response.body.message).toEqual('Weet succesfully created');
    });

    test('it should throw an error if a json token from another source is provided', async () => {
        const token = jwt.sign({handle: 'handle1'}, 'other secret key');
        const response = await request(app)
           .post('/weets')
           .send({ _token: token, weet: 'Making a brand new weet' });
        expect(response.statusCode).toEqual(401);
    });

    test('it should throw an error if a non-valid json token is provided', async () => {
        const invalidToken1 = createToken({handle: 'notahandle'});
        const response1 = await request(app)
           .post('/weets')
           .send({ _token: invalidToken1, weet: 'Making a brand new weet' });
        expect(response1.statusCode).toEqual(401);

        const invalidToken2 = createToken({notHandle: 'notahandle'});
        const response2 = await request(app)
           .post('/weets')
           .send({ _token: invalidToken2, weet: 'Making a brand new weet' });
        expect(response2.statusCode).toEqual(401);
    });

    test('it should throw an error if no json token is provided', async () => {
        const response = await request(app)
           .post('/weets')
           .send({ weet: 'Making a brand new weet' });
        expect(response.statusCode).toEqual(401);
    });
});

describe('POST /weets/feed', () => {
    test('it should return an array of weets from the user and accounts the user follows sorted from newest to oldest', async () => {
        await User.follow('handle1', 'handle2');
        const token = tokens['handle1'];
        const response = await request(app)
           .post('/weets/feed')
           .send({ _token: token });
        expect(response.statusCode).toEqual(201);
        const results = response.body.result;
        expect(results[0].weet).toEqual('Just enjoying my day');
        expect(results[1].weet).toEqual('Just an example weet');
    });

    test('it should return an empty array (user has no weets and does not follow any accounts)', async () => {
        await db.query(`DELETE FROM weets`);
        const token = tokens['handle1'];
        const response = await request(app)
           .post('/weets/feed')
           .send({ _token: token });
        expect(response.statusCode).toEqual(201);
        expect(response.body.result).toEqual([]);
    });

    test('it should throw an error if a json token from another source is provided', async () => {
        const token = jwt.sign({handle: 'handle1'}, 'other secret key');
        const response = await request(app)
           .post('/weets/feed')
           .send({ _token: token });
        expect(response.statusCode).toEqual(401);
    });

    test('it should throw an error if a non-valid json token is provided', async () => {
        const invalidToken1 = createToken({handle: 'notahandle'});
        const response1 = await request(app)
           .post('/weets/feed')
           .send({ _token: invalidToken1 });
        expect(response1.statusCode).toEqual(401);

        const invalidToken2 = createToken({notHandle: 'notahandle'});
        const response2 = await request(app)
           .post('/weets/feed')
           .send({ _token: invalidToken2 });
        expect(response2.statusCode).toEqual(401);
    });

    test('it should throw an error if no json token is provided', async () => {
        const response = await request(app)
           .post('/weets/feed');
        expect(response.statusCode).toEqual(401);
    });
});

describe('POST /weets/:id', () => {
    test('it should return a weet if a valid weet id is provided', async () => {
        const ownWeet = await db.query(`SELECT * FROM weets WHERE author = $1`, ['handle1']);
        const token = tokens['handle1'];
        const response = await request(app)
           .post(`/weets/${ownWeet.rows[0].id}`)
           .send({ _token: token });
        expect(response.statusCode).toEqual(201);
        expect(response.body.result.weet).toEqual('Just an example weet');
    });

    test('it should throw an error if a non-valid weet id is provided', async () => {
        const token = tokens['handle1'];
        const response = await request(app)
           .post('/weets/-1')
           .send({ _token: token });
        expect(response.statusCode).toEqual(404);
    });

    test('it should throw an error if a json token from another source is provided', async () => {
        const ownWeet = await db.query(`SELECT * FROM weets WHERE author = $1`, ['handle1']);
        const token = jwt.sign({handle: 'handle1'}, 'other secret key');
        const response = await request(app)
           .post(`/weets/${ownWeet.rows[0].id}`)
           .send({ _token: token });
        expect(response.statusCode).toEqual(401);
    });

    test('it should throw an error if a non-valid json token is provided', async () => {
        const ownWeet = await db.query(`SELECT * FROM weets WHERE author = $1`, ['handle1']);
        const invalidToken1 = createToken({handle: 'notahandle'});
        const response1 = await request(app)
           .post(`/weets/${ownWeet.rows[0].id}`)
           .send({ _token: invalidToken1 });
        expect(response1.statusCode).toEqual(401);

        const invalidToken2 = createToken({notHandle: 'notahandle'});
        const response2 = await request(app)
           .post(`/weets/${ownWeet.rows[0].id}`)
           .send({ _token: invalidToken2 });
        expect(response2.statusCode).toEqual(401);
    });

    test('it should throw an error if no json token is provided', async () => {
        const ownWeet = await db.query(`SELECT * FROM weets WHERE author = $1`, ['handle1']);
        const response = await request(app)
           .post(`/weets/${ownWeet.rows[0].id}`);
        expect(response.statusCode).toEqual(401);
    });
});

describe('PUT /weets/:id', () => {
    test('it should succesfully edit a weet if a valid weet id is provided and the user is the author of the weet', async () => {
        const ownWeet = await db.query(`SELECT * FROM weets WHERE author = $1`, ['handle1']);
        const token = tokens['handle1'];
        const response = await request(app)
           .put(`/weets/${ownWeet.rows[0].id}`)
           .send({ _token: token, weet: 'A new edited weet' });
        expect(response.statusCode).toEqual(201);
        expect(response.body.message).toEqual('Weet succesfully edited');
    });

    test('it should throw an error if the user is not the author of the weet', async () => {
        const otherWeet = await db.query(`SELECT * FROM weets WHERE author = $1`, ['handle2']);
        const token = tokens['handle1'];
        const response = await request(app)
           .put(`/weets/${otherWeet.rows[0].id}`)
           .send({ _token: token, weet: 'A new edited weet' });
        expect(response.statusCode).toEqual(401);
    });

    test('it should throw an error if a non valid weet id is provided', async () => {
        const token = tokens['handle1'];
        const response = await request(app)
           .put(`/weets/-1`)
           .send({ _token: token, weet: 'A new edited weet' });
        expect(response.statusCode).toEqual(401);
    });

    test('it should throw an error if a json token from another source is provided', async () => {
        const ownWeet = await db.query(`SELECT * FROM weets WHERE author = $1`, ['handle1']);
        const token = jwt.sign({handle: 'handle1'}, 'other secret key');
        const response = await request(app)
           .put(`/weets/${ownWeet.rows[0].id}`)
           .send({ _token: token, weet: 'A new edited weet' });
        expect(response.statusCode).toEqual(401);
    });
    
    test('it should throw an error if a non-valid json token is provided', async () => {
        const ownWeet = await db.query(`SELECT * FROM weets WHERE author = $1`, ['handle1']);
        const invalidToken1 = createToken({notHandle: 'handle1'});
        const response1 = await request(app)
           .put(`/weets/${ownWeet.rows[0].id}`)
           .send({ _token: invalidToken1, weet: 'A new edited weet' });
        expect(response1.statusCode).toEqual(401);

        const invalidToken2 = createToken({handle: 'notahandle'});
        const response2 = await request(app)
           .put(`/weets/${ownWeet.rows[0].id}`)
           .send({ _token: invalidToken2, weet: 'A new edited weet' });
        expect(response2.statusCode).toEqual(401);
    });

    test('it should throw an error if no json token is provided', async () => {
        const ownWeet = await db.query(`SELECT * FROM weets WHERE author = $1`, ['handle1']);
        const response = await request(app)
           .put(`/weets/${ownWeet.rows[0].id}`)
           .send({ weet: 'A new edited weet' });
        expect(response.statusCode).toEqual(401);
    });
});

describe('DELETE /weets/:id', () => {
    test('it should succesfully delete a weet if a valid weet id is provided and the user is the author of the weet', async () => {
        const ownWeet = await db.query(`SELECT * FROM weets WHERE author = $1`, ['handle1']);
        const token = tokens['handle1'];
        const response = await request(app)
           .delete(`/weets/${ownWeet.rows[0].id}`)
           .send({ _token: token });
        expect(response.statusCode).toEqual(201);
        expect(response.body.result).toEqual('Weet succesfully deleted.');
    });

    test('it should throw an error if the user is not the author of the weet', async () => {
        const otherWeet = await db.query(`SELECT * FROM weets WHERE author = $1`, ['handle2']);
        const token = tokens['handle1'];
        const response = await request(app)
           .delete(`/weets/${otherWeet.rows[0].id}`)
           .send({ _token: token });
        expect(response.statusCode).toEqual(401);
    });

    test('it should throw an error if a non valid weet id is provided', async () => {
        const token = tokens['handle1'];
        const response = await request(app)
           .delete(`/weets/-1`)
           .send({ _token: token });
        expect(response.statusCode).toEqual(401);
    });

    test('it should throw an error if a json token from another source is provided', async () => {
        const ownWeet = await db.query(`SELECT * FROM weets WHERE author = $1`, ['handle1']);
        const token = jwt.sign({handle: 'handle1'}, 'other secret key');
        const response = await request(app)
           .delete(`/weets/${ownWeet.rows[0].id}`)
           .send({ _token: token });
        expect(response.statusCode).toEqual(401);
    });

    test('it should throw an error if a non-valid json token is provided', async () => {
        const ownWeet = await db.query(`SELECT * FROM weets WHERE author = $1`, ['handle1']);
        const invalidToken1 = createToken({notHandle: 'handle1'});
        const response1 = await request(app)
           .delete(`/weets/${ownWeet.rows[0].id}`)
           .send({ _token: invalidToken1 });
        expect(response1.statusCode).toEqual(401);

        const invalidToken2 = createToken({handle: 'notahandle'});
        const response2 = await request(app)
           .delete(`/weets/${ownWeet.rows[0].id}`)
           .send({ _token: invalidToken2 });
        expect(response2.statusCode).toEqual(401);
    });

    test('it should throw an error if no json token is provided', async () => {
        const ownWeet = await db.query(`SELECT * FROM weets WHERE author = $1`, ['handle1']);
        const response = await request(app)
           .delete(`/weets/${ownWeet.rows[0].id}`);
        expect(response.statusCode).toEqual(401);
    });
});

describe('POST /weets/:id/reweet', () => {
    test('it should succesfully reweet a weet', async () => {
        const ownWeet = await db.query(`SELECT * FROM weets WHERE author = $1`, ['handle1']);
        const token = tokens['handle1'];
        const response = await request(app)
           .post(`/weets/${ownWeet.rows[0].id}/reweet`)
           .send({ _token: token });
        expect(response.statusCode).toEqual(201);
        expect(response.body.message).toEqual('Weet succesfully reweeted');
    });

    test('it should throw an error if the user has already reweeted the weet', async () => {
        const ownWeet = await db.query(`SELECT * FROM weets WHERE author = $1`, ['handle1']);
        await User.reweet('handle1', ownWeet.rows[0].id);
        const token = tokens['handle1'];
        const response = await request(app)
           .post(`/weets/${ownWeet.rows[0].id}/reweet`)
           .send({ _token: token });
        expect(response.statusCode).toEqual(403);
    });

    test('it should throw an error if a non valid weet id is provided', async () => {
        const token = tokens['handle1'];
        const response = await request(app)
           .post(`/weets/-1/reweet`)
           .send({ _token: token });
        expect(response.statusCode).toEqual(404);
    });

    test('it should throw an error if a json token from another source is provided', async () => {
        const ownWeet = await db.query(`SELECT * FROM weets WHERE author = $1`, ['handle1']);
        const token = jwt.sign({handle: 'handle1'}, 'other secret key');
        const response = await request(app)
           .post(`/weets/${ownWeet.rows[0].id}/reweet`)
           .send({ _token: token });
        expect(response.statusCode).toEqual(401);
    });

    test('it should throw an error if a non-valid json token is provided', async () => {
        const ownWeet = await db.query(`SELECT * FROM weets WHERE author = $1`, ['handle1']);
        const invalidToken1 = createToken({notHandle: 'not a handle'});
        const response1 = await request(app)
           .post(`/weets/${ownWeet.rows[0].id}/reweet`)
           .send({ _token: invalidToken1 });
        expect(response1.statusCode).toEqual(401);

        const invalidToken2 = createToken({handle: 'not a handle'});
        const response2 = await request(app)
           .post(`/weets/${ownWeet.rows[0].id}/reweet`)
           .send({ _token: invalidToken2 });
        expect(response2.statusCode).toEqual(401);
    });

    test('it should throw an error if no json token is provided', async () => {
        const ownWeet = await db.query(`SELECT * FROM weets WHERE author = $1`, ['handle1']);
        const response = await request(app)
           .post(`/weets/${ownWeet.rows[0].id}/reweet`);
        expect(response.statusCode).toEqual(401);
    });
});

describe('POST /weets/:id/unreweet', () => {
    test('it should succesfully remove a reweet', async () => {
        const ownWeet = await db.query(`SELECT * FROM weets WHERE author = $1`, ['handle1']);
        await User.reweet('handle1', ownWeet.rows[0].id);
        const token = tokens['handle1'];
        const response = await request(app)
           .post(`/weets/${ownWeet.rows[0].id}/unreweet`)
           .send({ _token: token });
        expect(response.statusCode).toEqual(201);
        expect(response.body.message).toEqual('Reweet succesfully removed');
    });

    test('it should throw an error if the user has not reweeted the weet', async () => {
        const ownWeet = await db.query(`SELECT * FROM weets WHERE author = $1`, ['handle1']);
        const token = tokens['handle1'];
        const response = await request(app)
           .post(`/weets/${ownWeet.rows[0].id}/unreweet`)
           .send({ _token: token });
        expect(response.statusCode).toEqual(403);
    });

    test('it should throw an error if a non valid weet id is provided', async () => {
        const token = tokens['handle1'];
        const response = await request(app)
           .post(`/weets/-1/unreweet`)
           .send({ _token: token });
        expect(response.statusCode).toEqual(404);
    });

    test('it should throw an error if a json token from another source is provided', async () => {
        const ownWeet = await db.query(`SELECT * FROM weets WHERE author = $1`, ['handle1']);
        const token = jwt.sign({handle: 'handle1'}, 'other secret key');
        const response = await request(app)
           .post(`/weets/${ownWeet.rows[0].id}/unreweet`)
           .send({ _token: token });
        expect(response.statusCode).toEqual(401);
    });

    test('it should throw an error if a non-valid json token is provided', async () => {
        const ownWeet = await db.query(`SELECT * FROM weets WHERE author = $1`, ['handle1']);
        const invalidToken1 = createToken({notHandle: 'not a handle'});
        const response1 = await request(app)
           .post(`/weets/${ownWeet.rows[0].id}/unreweet`)
           .send({ _token: invalidToken1 });
        expect(response1.statusCode).toEqual(401);

        const invalidToken2 = createToken({handle: 'not a handle'});
        const response2 = await request(app)
           .post(`/weets/${ownWeet.rows[0].id}/unreweet`)
           .send({ _token: invalidToken2 });
        expect(response2.statusCode).toEqual(401);
    });

    test('it should throw an error if no json token is provided', async () => {
        const ownWeet = await db.query(`SELECT * FROM weets WHERE author = $1`, ['handle1']);
        const response = await request(app)
            .post(`/weets/${ownWeet.rows[0].id}/unreweet`);
        expect(response.statusCode).toEqual(401);
    });
});

describe('POST /weets/:id/favorite', () => {
    test('it should succesfully favorite a weet', async () => {
        const ownWeet = await db.query(`SELECT * FROM weets WHERE author = $1`, ['handle1']);
        const token = tokens['handle1'];
        const response = await request(app)
           .post(`/weets/${ownWeet.rows[0].id}/favorite`)
           .send({ _token: token });
        expect(response.statusCode).toEqual(201);
        expect(response.body.message).toEqual('Weet succesfully favorited');
    });

    test('it should throw an error if the user has already favorited the weet', async () => {
        const ownWeet = await db.query(`SELECT * FROM weets WHERE author = $1`, ['handle1']);
        await User.favorite('handle1', ownWeet.rows[0].id);
        const token = tokens['handle1'];
        const response = await request(app)
           .post(`/weets/${ownWeet.rows[0].id}/favorite`)
           .send({ _token: token });
        expect(response.statusCode).toEqual(403);
    });

    test('it should throw an error if a non valid weet id is provided', async () => {
        const token = tokens['handle1'];
        const response = await request(app)
           .post(`/weets/-1/favorite`)
           .send({ _token: token });
        expect(response.statusCode).toEqual(404);
    });

    test('it should throw an error if a json token from another source is provided', async () => {
        const ownWeet = await db.query(`SELECT * FROM weets WHERE author = $1`, ['handle1']);
        const token = jwt.sign({handle: 'handle1'}, 'other secret key');
        const response = await request(app)
           .post(`/weets/${ownWeet.rows[0].id}/favorite`)
           .send({ _token: token });
        expect(response.statusCode).toEqual(401);
    });

    test('it should throw an error if a non-valid json token is provided', async () => {
        const ownWeet = await db.query(`SELECT * FROM weets WHERE author = $1`, ['handle1']);
        const invalidToken1 = createToken({notHandle: 'not a handle'});
        const response1 = await request(app)
           .post(`/weets/${ownWeet.rows[0].id}/favorite`)
           .send({ _token: invalidToken1 });
        expect(response1.statusCode).toEqual(401);

        const invalidToken2 = createToken({handle: 'not a handle'});
        const response2 = await request(app)
           .post(`/weets/${ownWeet.rows[0].id}/favorite`)
           .send({ _token: invalidToken2 });
        expect(response2.statusCode).toEqual(401);
    });

    test('it should throw an error if no json token is provided', async () => {
        const ownWeet = await db.query(`SELECT * FROM weets WHERE author = $1`, ['handle1']);
        const response = await request(app)
           .post(`/weets/${ownWeet.rows[0].id}/favorite`);
        expect(response.statusCode).toEqual(401);
    });
});

describe('POST /weets/:id/unfavorite', () => {
    test('it should succesfully unfavorite a weet', async () => {
        const ownWeet = await db.query(`SELECT * FROM weets WHERE author = $1`, ['handle1']);
        await User.favorite('handle1', ownWeet.rows[0].id);
        const token = tokens['handle1'];
        const response = await request(app)
           .post(`/weets/${ownWeet.rows[0].id}/unfavorite`)
           .send({ _token: token });
        expect(response.statusCode).toEqual(201);
        expect(response.body.message).toEqual('Favorite succesfully removed');
    });

    test('it should throw an error if the user has not favorited the weet', async () => {
        const ownWeet = await db.query(`SELECT * FROM weets WHERE author = $1`, ['handle1']);
        const token = tokens['handle1'];
        const response = await request(app)
           .post(`/weets/${ownWeet.rows[0].id}/unfavorite`)
           .send({ _token: token });
        expect(response.statusCode).toEqual(403);
    });

    test('it should throw an error if a non valid weet id is provided', async () => {
        const token = tokens['handle1'];
        const response = await request(app)
           .post(`/weets/-1/unfavorite`)
           .send({ _token: token });
        expect(response.statusCode).toEqual(404);
    });

    test('it should throw an error if a json token from another source is provided', async () => {
        const ownWeet = await db.query(`SELECT * FROM weets WHERE author = $1`, ['handle1']);
        const token = jwt.sign({handle: 'handle1'}, 'other secret key');
        const response = await request(app)
           .post(`/weets/${ownWeet.rows[0].id}/unfavorite`)
           .send({ _token: token });
        expect(response.statusCode).toEqual(401);
    });

    test('it should throw an error if a non-valid json token is provided', async () => {
        const ownWeet = await db.query(`SELECT * FROM weets WHERE author = $1`, ['handle1']);
        const invalidToken1 = createToken({notHandle: 'not a handle'});
        const response1 = await request(app)
           .post(`/weets/${ownWeet.rows[0].id}/unfavorite`)
           .send({ _token: invalidToken1 });
        expect(response1.statusCode).toEqual(401);

        const invalidToken2 = createToken({handle: 'not a handle'});
        const response2 = await request(app)
           .post(`/weets/${ownWeet.rows[0].id}/unfavorite`)
           .send({ _token: invalidToken2 });
        expect(response2.statusCode).toEqual(401);
    });

    test('it should throw an error if no json token is provided', async () => {
        const ownWeet = await db.query(`SELECT * FROM weets WHERE author = $1`, ['handle1']);
        const response = await request(app)
           .post(`/weets/${ownWeet.rows[0].id}/unfavorite`);
        expect(response.statusCode).toEqual(401);
    });
});

describe('POST /weets/:id/tab', () => {
    test('it should succesfully tab a weet', async () => {
        const ownWeet = await db.query(`SELECT * FROM weets WHERE author = $1`, ['handle1']);
        const token = tokens['handle1'];
        const response = await request(app)
           .post(`/weets/${ownWeet.rows[0].id}/tab`)
           .send({ _token: token });
        expect(response.statusCode).toEqual(201);
        expect(response.body.message).toEqual(`Weet succesfully tabbed`);
    });

    test('it should throw an error if the user has already tabbed the weet', async () => {
        const ownWeet = await db.query(`SELECT * FROM weets WHERE author = $1`, ['handle1']);
        const token = tokens['handle1'];
        await User.tab('handle1', ownWeet.rows[0].id);
        const response = await request(app)
           .post(`/weets/${ownWeet.rows[0].id}/tab`)
           .send({ _token: token });
        expect(response.statusCode).toEqual(403);
    });

    test('it should throw an error if a non valid weet id is provided', async () => {
        const token = tokens['handle1'];
        const response = await request(app)
           .post(`/weets/-1/tab`)
           .send({ _token: token });
        expect(response.statusCode).toEqual(404);
    });

    test('it should throw an error if a json token from another source is provided', async () => {
        const ownWeet = await db.query(`SELECT * FROM weets WHERE author = $1`, ['handle1']);
        const token = jwt.sign({handle: 'handle1'}, 'other secret key');
        const response = await request(app)
           .post(`/weets/${ownWeet.rows[0].id}/tab`)
           .send({ _token: token });
        expect(response.statusCode).toEqual(401);
    });

    test('it should throw an error if a non-valid json token is provided', async () => {
        const ownWeet = await db.query(`SELECT * FROM weets WHERE author = $1`, ['handle1']);
        const invalidToken1 = createToken({notHandle: 'not a handle'});
        const response1 = await request(app)
           .post(`/weets/${ownWeet.rows[0].id}/tab`)
           .send({ _token: invalidToken1 });
        expect(response1.statusCode).toEqual(401);

        const invalidToken2 = createToken({handle: 'not a handle'});
        const response2 = await request(app)
           .post(`/weets/${ownWeet.rows[0].id}/tab`)
           .send({ _token: invalidToken2 });
        expect(response2.statusCode).toEqual(401);
    });
    
    test('it should throw an error if no json token is provided', async () => {
        const ownWeet = await db.query(`SELECT * FROM weets WHERE author = $1`, ['handle1']);
        const response = await request(app)
           .post(`/weets/${ownWeet.rows[0].id}/tab`);
        expect(response.statusCode).toEqual(401);
    });
});

describe('POST /weets/:id/untab', () => {
    test('it should succesfully untab a weet', async () => {
        const ownWeet = await db.query(`SELECT * FROM weets WHERE author = $1`, ['handle1']);
        const token = tokens['handle1'];
        await User.tab('handle1', ownWeet.rows[0].id);
        const response = await request(app)
           .post(`/weets/${ownWeet.rows[0].id}/untab`)
           .send({ _token: token });
        expect(response.statusCode).toEqual(201);
        expect(response.body.message).toEqual('Tab succesfully removed')
    });

    test('it should throw an error if the user has not tabbed the weet', async () => {
        const ownWeet = await db.query(`SELECT * FROM weets WHERE author = $1`, ['handle1']);
        const token = tokens['handle1'];
        const response = await request(app)
           .post(`/weets/${ownWeet.rows[0].id}/untab`)
           .send({ _token: token });
        expect(response.statusCode).toEqual(403);
    });

    test('it should throw an error if a non valid weet id is provided', async () => {
        const token = tokens['handle1'];
        const response = await request(app)
           .post(`/weets/-1/untab`)
           .send({ _token: token });
        expect(response.statusCode).toEqual(404);
    });

    test('it should throw an error if a json token from another source is provided', async () => {
        const ownWeet = await db.query(`SELECT * FROM weets WHERE author = $1`, ['handle1']);
        const token = jwt.sign({handle: 'handle1'}, 'other secret key');
        const response = await request(app)
           .post(`/weets/${ownWeet.rows[0].id}/untab`)
           .send({ _token: token });
        expect(response.statusCode).toEqual(401);
    });

    test('it should throw an error if a non-valid json token is provided', async () => {
        const ownWeet = await db.query(`SELECT * FROM weets WHERE author = $1`, ['handle1']);
        const invalidToken1 = createToken({notHandle: 'not a handle'});
        const response1 = await request(app)
           .post(`/weets/${ownWeet.rows[0].id}/untab`)
           .send({ _token: invalidToken1 });
        expect(response1.statusCode).toEqual(401);

        const invalidToken2 = createToken({handle: 'not a handle'});
        const response2 = await request(app)
           .post(`/weets/${ownWeet.rows[0].id}/untab`)
           .send({ _token: invalidToken2 });
        expect(response2.statusCode).toEqual(401);
    });

    test('it should throw an error if no json token is provided', async () => {
        const ownWeet = await db.query(`SELECT * FROM weets WHERE author = $1`, ['handle1']);
        const response = await request(app)
           .post(`/weets/${ownWeet.rows[0].id}/untab`);
        expect(response.statusCode).toEqual(401);
    });
});

afterEach(async () => {
    await db.query(`DELETE FROM tabs`);
    await db.query(`DELETE FROM reweets`);
    await db.query(`DELETE FROM favorites`);
    await db.query(`DELETE FROM followers`);
    await db.query(`DELETE FROM weets`);
    await db.query(`DELETE FROM users`);
});

afterAll(async () => {
    db.end();
});