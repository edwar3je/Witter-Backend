/** A middleware function that ensures the user performing the action is the same as the author.
 *  Returns false if no token is provided, no weet is provided, an invalid json web token is provided, an invalid weet is provided, or the user listed in the token is different from the author.
 * 
 *      ensureAuthor(token, )
 */

const jwt = require('jsonwebtoken');
const ExpressError = require('../helpers/expressError');

const ensureAuthor = (req, res, next) => {
    try {
        const token = req.body._token;
        const weet = req.body._weet;

        if(!token || !weet){
            throw new ExpressError(`Missing information needed to perform action`, 401);
        }

        const decode = jwt.decode(token);

        if(decode.handle !== weet.author){
            throw new ExpressError(`User is not authorized to perform this action`, 401);
        }

        return next();
    } catch (err) {
        err.status = 401;
        return next(err);
    }
};

module.exports = ensureAuthor;