const express = require('express');
const router = express.Router();

const ensureSignedIn = require('../middleware/ensureSignedIn');
const ensureTokenOrigin = require('../middleware/ensureTokenOrigin');
const ensureAuthor = require('../middleware/ensureAuthor');

const jwt = require('jsonwebtoken');
const User = require('../models/User');

/** POST
 * 
 * Returns an array of accounts that contain usernames that match the provided string.
 * 
 */

router.post('/:search', ensureSignedIn, ensureTokenOrigin, async function(req, res, next) {
    try {
        const { search } = req.params;
        const token = req.body._token;
        const decode = jwt.decode(token);
        const result = await User.search(search, decode.handle);
        return res.status(201).json({ result });
    } catch (err) {
        return next(err)
    }
});

/** POST
 * 
 * Allows the current user to follow another account.
 * Throws an error if the user is already following the account, or the account does not exist.
 * 
 */

router.post('/:handle/follow', ensureSignedIn, ensureTokenOrigin, async function(req, res, next) {
    try {
        const { handle } = req.params;
        const token = req.body._token;
        const decode = jwt.decode(token);
        const user = decode.handle;
        await User.follow(user, handle);
        return res.status(201).json({ message: `You are now following ${handle}` });
    } catch (err) {
        return next(err)
    }
});

/** POST
 * 
 * Allows the current user to unfollow another account.
 * Throws an error if the user is not currently following the account, or the account does not exist.
 * 
 */

router.post('/:handle/unfollow', ensureSignedIn, ensureTokenOrigin, async function(req, res, next) {
    try {
        const { handle } = req.params;
        const token = req.body._token;
        const decode = jwt.decode(token);
        const user = decode.handle;
        await User.unfollow(user, handle);
        return res.status(201).json({ message: `You are no longer following ${handle}` });
    } catch (err) {
        return next(err)
    }
});

module.exports = router;