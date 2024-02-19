/** A middleware function that ensures the user performing the action is the same as the author.
 *  Returns false if no token is provided, no weet id is provided, a non-valid weet id is provided, an invalid json web token is provided, an invalid weet is provided, or the user listed in the token is different from the author.
 * 
 *      ensureAuthor('sampletoken', 17) => true
 * 
 */

const db = require('../db');

const jwt = require('jsonwebtoken');
const ExpressError = require('../helpers/expressError');

const ensureAuthor = async (req, res, next) => {
    try {
        const token = req.body._token;
        const weetId = req.params.id;

        if(!token || !weetId){
            throw new ExpressError(`Missing information needed to perform action`, 401);
        }

        const decode = jwt.decode(token);

        const weet = await db.query(
            `SELECT * FROM weets WHERE id = $1`,
            [weetId]
        );

        if(weet.rows[0] === undefined){
            throw new ExpressError(`Weet does not exist`, 401);
        }

        if(decode.handle !== weet.rows[0].author){
            throw new ExpressError(`User is not authorized to perform this action`, 401);
        }

        return next();
    } catch (err) {
        err.status = 401;
        return next(err);
    }
};

module.exports = ensureAuthor;