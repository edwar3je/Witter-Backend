const db = require('../db');
const bcrypt = require('bcrypt');

/** A helper function that returns an object containing keys indicating if a (old) password is valid.
 *  The object contains two keys: a boolean that determines if the (old) password is valid and an array of
 *  messages containing any possible errors. For a (old) password to be valid, it must pass one check:
 *     1.) The handle and password match up with an account (proper credentials for authentication).
 * 
 *         checkOldPassword('edwar3je', 'K0kof1nsz!') => {isValid: true, messages: []}
 * 
 */

const checkOldPassword = async (handle, oldPassword) => {
    const oldPasswordObj = {};
    oldPasswordObj.messages = [];

    const query = await db.query(
        `SELECT * FROM users WHERE handle = $1`,
        [handle]
    );

    const user = query.rows[0];

    const check = await bcrypt.compare(oldPassword, user.password);

    if(!check){
        oldPasswordObj.messages.push('Invalid credentials. Please provide the proper password.')
    }

    if(oldPasswordObj.messages.length === 1){
        oldPasswordObj.isValid = false
    } else {
        oldPasswordObj.isValid = true
    }

    return oldPasswordObj;
}

module.exports = checkOldPassword;