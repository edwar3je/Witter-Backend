/** A middleware function designed to ensure the current user is logged in (has a token).
 *  Returns false if either no token is provided, or the token provided does not have information corresponding to a user in the database (invalid handle).
 * 
 *      ensureSignedIn('sampletoken') => true
 * 
 */

const db = require('../db');
const jwt = require('jsonwebtoken');

const ensureSignedIn = async (req, res, next) => {
    try {
        const token = req.body._token;

        if(!token){
            throw new ExpressError(`Please provide a valid token`, 401)
        }
        else if(typeof(token) !== 'string'){
            throw new ExpressError(`Please provide a valid JSON web token string`, 401)
        }

        const decode = jwt.decode(token);
        if(!decode.handle){
            throw new ExpressError(`Invalid JSON web token provided`, 401)
        }

        const check = await db.query(`SELECT handle FROM users WHERE handle = $1`, [decode.handle]);
        if(check.rows[0] === undefined){
            throw new ExpressError(`${decode.handle} does not exist`, 401)
        };

        return next();
    } catch (err) {
        err.status = 401;
        return next(err);
    }
}

/*const ensureSignedIn = async (token) => {
    
    if(!token || typeof(token) !== 'string'){
        return false
    }

    try{
        const decode = jwt.decode(token);
        if(!decode.handle) return false;
        const check = await db.query(`SELECT handle FROM users WHERE handle = $1`, [decode.handle]);
        if(check.rows[0] === undefined) return false;
        return true;
    } catch(e){
        return false
    }
};*/

module.exports = ensureSignedIn;