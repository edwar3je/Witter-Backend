process.env.NODE_ENV = 'test';

const jwt = require('jsonwebtoken');

const createToken = require('../helpers/createToken');

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