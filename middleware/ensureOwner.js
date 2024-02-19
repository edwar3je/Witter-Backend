/** A middleware function that ensures the user performing the action is the owner of the account.
 *  Throws an error if no token is provided, no owner is provided or an invalid json web token is provided.
 * 
 *      ensureOwner('sampletoken', 'edwar3je') => true
 * 
 */

const jwt = require('jsonwebtoken');
const ExpressError = require('../helpers/expressError');

const ensureOwner = (req, res, next) => {
    try {
        const token = req.body._token;
        const author = req.params.handle;

        if(!token){
            throw new ExpressError(`Missing information needed to perform action`, 401);
        }

        const decode = jwt.decode(token);

        if(decode.handle !== author){
            throw new ExpressError(`User is not authorized to perform this action`, 401);
        }

        return next();
    } catch (err) {
        err.status = 401;
        return next(err);
    }
}

module.exports = ensureOwner;