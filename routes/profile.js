const express = require('express');
const router = express.Router();

const jwt = require('jsonwebtoken');

const ensureSignedIn = require('../middleware/ensureSignedIn');
const ensureTokenOrigin = require('../middleware/ensureTokenOrigin');
const ensureAuthor = require('../middleware/ensureAuthor');
const ensureOwner = require('../middleware/ensureOwner');

const createToken = require('../helpers/createToken');

const User = require('../models/User');

/** POST
 * 
 * Returns information needed to access a user's profile page (must be a post request to ensure data is sent on body).
 * Throws an error if an invalid handle is provided.
 * 
 */

router.post('/:handle', ensureSignedIn, ensureTokenOrigin, async (req, res, next) => {
    try {
        const { handle } = req.params;
        const token = req.body._token;
        const decode = jwt.decode(token);
        const user = await User.get(handle, decode.handle);
        return res.status(201).json({ user });
    } catch (err) {
        return next(err)
    }
});

/** PUT
 * 
 * Allows a user to update their profile information.
 * Throws an error if invalid data is provided, no token is provided or an invalid json web token is provided.
 * 
 */

router.put('/:handle/edit', ensureSignedIn, ensureTokenOrigin, ensureOwner, async (req, res, next) => {
    try {
        const { handle } = req.params;
        const { username, oldPassword, newPassword, email, userDescription, profilePicture, bannerPicture } = req.body;
        const result = await User.update(handle, username, oldPassword, newPassword, email, userDescription, profilePicture, bannerPicture);
        const newToken = createToken(result);
        return res.status(201).json({ token: newToken });
    } catch (err) {
        return next(err)
    }
});

/** DELETE
 * 
 * Allows a user to delete their account.
 * Throws an error if either no token is provided or an invalid json web token is provided.
 * 
 */

router.delete('/:handle/edit', ensureSignedIn, ensureTokenOrigin, ensureOwner, async (req, res, next) => {
    try {
        const { handle } = req.params;
        await User.delete(handle);
        return res.status(201).json({ message: 'account successfully deleted' });
    } catch (err) {
        return next(err)
    }
});

/** POST
 * 
 * Returns an array of weets the account has written/published.
 * Throws an error if no token is provided, an invalid json web token is provided or the account does not exist.
 * 
 */

router.post('/:handle/weets', ensureSignedIn, ensureTokenOrigin, async (req, res, next) => {
    try {
        const { handle } = req.params;
        const { _token } = req.body;
        const decode = jwt.decode(_token);
        const result = await User.getWeets(handle, decode.handle);
        return res.status(201).json({ result });
    } catch (err) {
        return next(err)
    }
});

/** POST
 * 
 * Returns an array of weets the account has reweeted.
 * Throws an error if no token is provided, an invalid json web token is provided or the account does not exist.
 * 
 */

router.post('/:handle/reweets', ensureSignedIn, ensureTokenOrigin, async (req, res, next) => {
    try {
        const { handle } = req.params;
        const { _token } = req.body;
        const decode = jwt.decode(_token);
        const result = await User.getReweets(handle, decode.handle);
        return res.status(201).json({ result });
    } catch (err) {
        return next(err)
    }
});

/** POST
 * 
 * Returns an array of weets the account has favorited.
 * Throws an error if no token is provided, an invalid json web token is provided or the account does not exist.
 * 
 */

router.post('/:handle/favorites', ensureSignedIn, ensureTokenOrigin, async (req, res, next) => {
    try {
        const { handle } = req.params;
        const { _token } = req.body;
        const decode = jwt.decode(_token);
        const result = await User.getFavorites(handle, decode.handle);
        return res.status(201).json({ result });
    } catch (err) {
        return next(err)
    }
});

/** POST
 * 
 * Returns an array of weets the account has tabbed (only accessible to the account owner).
 * Throws an error if no token is provided, an invalid json web token is provided, the user is separate from the account owner or the account does not exist.
 * 
 */

router.post('/:handle/tabs', ensureSignedIn, ensureTokenOrigin, ensureOwner, async (req, res, next) => {
    try {
        const { handle } = req.params;
        const { _token } = req.body;
        const decode = jwt.decode(_token);
        const result = await User.getTabs(handle, decode.handle);
        return res.status(201).json({ result });
    } catch (err) {
        return next(err)
    }
});

/** POST
 * 
 * Returns an array of accounts the account is currently following.
 * Throws an error if no token is provided, an invalid json web token is provided or the account does not exist.
 * 
 */

router.post('/:handle/following', ensureSignedIn, ensureTokenOrigin, async (req, res, next) => {
    try {
        const { handle } = req.params;
        const token = req.body._token;
        const decode = jwt.decode(token);
        const result = await User.getFollowing(handle, decode.handle);
        return res.status(201).json({ result });
    } catch (err) {
        return next(err)
    }
});

/** POST
 * 
 * Returns an array of accounts that are currently following the account.
 * Throws an error if no token is provided, an invalid json web token is provided or the account does not exist.
 * 
 */

router.post('/:handle/followers', ensureSignedIn, ensureTokenOrigin, async (req, res, next) => {
    try {
        const { handle } = req.params;
        const token = req.body._token;
        const decode = jwt.decode(token);
        const result = await User.getFollowers(handle, decode.handle);
        return res.status(201).json({ result });
    } catch (err) {
        return next(err)
    }
});

module.exports = router;