const jwt = require('jsonwebtoken');
const { SECRET_KEY } = require('../config');

/** A helper function designed to create JSON web tokens (JWTs) that stores a user's account information.
 * 
 *      createToken({handle: 'handle1', username: 'user1', ...}, 'a secret key') => 'asdlkfusaweoasidfjsvdlkxcjv'
 * 
 */

const createToken = (userInfo) => {
    const token = jwt.sign(userInfo, SECRET_KEY);
    return token
}

module.exports = createToken;