const express = require('express');
const router = express.Router();

const ensureSignedIn = require('../middleware/ensureSignedIn');
const ensureTokenOrigin = require('../middleware/ensureTokenOrigin');
const ensureAuthor = require('../middleware/ensureAuthor');

/** POST
 * 
 * Returns an array of accounts that contain usernames that match the provided string.
 * 
 */

router.post('/:search', ensureSignedIn, ensureTokenOrigin, async function(req, res, next) {
    try {
        ffff
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
        ffff
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
        ffff
    } catch (err) {
        return next(err)
    }
});

module.exports = router;