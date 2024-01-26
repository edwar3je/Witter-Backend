const db = require('../db');

const ExpressError = require('./expressError');

/** Returns an object containing information on an author. Information consists of the author's username and profile image.
 *  Throws an error if the handle provided is invalid.
 * 
 *      getAuthor('handle1') => {username: 'user1', user_description: 'a user description', profile_image: 'a profile image', banner_image: 'a banner image'}
 * 
 */

const getAuthor = async (handle) => {
    const check = await db.query(`SELECT * FROM users WHERE handle = $1`, [handle]);

    if(check.rows[0] === undefined){
        throw new ExpressError(`The account does not appear to exist`, 404)
    }

    const finalResult = {};

    finalResult.username = check.rows[0].username;
    finalResult.user_description = check.rows[0].user_description;
    finalResult.profile_image = check.rows[0].profile_image;
    finalResult.banner_image = check.rows[0].banner_image;

    return finalResult;
}

module.exports = getAuthor;