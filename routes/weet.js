const express = require('express');
const router = express.Router();

const ensureSignedIn = require('../middleware/ensureSignedIn');
const ensureTokenOrigin = require('../middleware/ensureTokenOrigin');
const ensureAuthor = require('../middleware/ensureAuthor');

const jwt = require('jsonwebtoken');

const User = require('../models/User');
const Weet = require('../models/Weet');

/** GET
 * 
 * Returns an array containing all the weets that appear on the current user's feed.
 * The array contains weets published by the current user and accounts the user follows, sorted from newest to oldest.
 * 
 */

router.get('/', ensureSignedIn, ensureTokenOrigin, async function(req, res, next) {
    try {
        const { _token } = req.body;
        const decode = jwt.decode(_token);
        const result = await User.getFeed(decode.handle);
        return res.status(201).json({ result });
    } catch (err) {
        return next(err)
    }
});

/** POST
 * 
 * Allows a user to post a new weet.
 * Throws an error if an invalid handle is provided, no token is provided or an invalid json web token is provided.
 * 
 */

router.post('/', ensureSignedIn, ensureTokenOrigin, async function(req, res, next) {
    try {
        const { _token, weet } = req.body;
        const decode = jwt.decode(_token);
        await Weet.create(weet, decode.handle, decode.handle);
        return res.status(201).json({ message: 'Weet succesfully created' });
    } catch (err) {
        return next(err)
    }
});

/** GET
 * 
 * Returns information on a specific weet.
 * Throws an error if an invalid weet id is provided.
 * 
 */
router.get('/:id', ensureSignedIn, ensureTokenOrigin, async function(req, res, next) {
    try {
        const { _token } = req.body;
        const { id } = req.params;
        const decode = jwt.decode(_token);
        const result = await Weet.get(id, decode.handle);
        return res.status(201).json({ result });
    } catch (err) {
        return next(err)
    }
});

/** PUT
 * 
 * Allows a user to edit one of their own weets.
 * Throws an error if the weet was not authored by the user, the weet does not exist, no token is provided or an invalid json web token is provided.
 * 
 */

router.put('/:id', ensureSignedIn, ensureTokenOrigin, ensureAuthor, async function(req, res, next) {
    try {
        const { weet, _token } = req.body;
        const { id } = req.params;
        const decode = jwt.decode(_token);
        await Weet.edit(id, weet, decode.handle);
        return res.status(201).json({ message: 'Weet succesfully edited' });
    } catch (err) {
        return next(err)
    }
});

/** DELETE
 * 
 * Allows a user to delete one of their own weets.
 * Throws an error if the weet was not authored by the user, the weet does not exist, no token is provided or an invalid json web token is provided.
 * 
 */

router.delete('/:id', ensureSignedIn, ensureTokenOrigin, ensureAuthor, async function(req, res, next) {
    try {
        const { id } = req.params;
        const result = await Weet.delete(id);
        return res.status(201).json({ result });
    } catch (err) {
        return next(err)
    }
});

/** POST
 * 
 * Allows the current user to reweet a weet.
 * Throws an error if current user has already reweeted the weet, or if the weet does not exist.
 * 
 */

router.post('/:id/reweet', ensureSignedIn, ensureTokenOrigin, async function(req, res, next) {
    try {
        const { _token } = req.body;
        const { id } = req.params;
        const decode = jwt.decode(_token);
        await User.reweet(decode.handle, id, decode.handle);
        return res.status(201).json({ message: 'Weet succesfully reweeted' });
    } catch (err) {
        return next(err)
    }
});

/** POST
 * 
 * Allows the current user to unreweet an existing reweet.
 * Throws an error if the current user has not reweeted the weet, or if the weet does not exist.
 * 
*/

router.post('/:id/unreweet', ensureSignedIn, ensureTokenOrigin, async function(req, res, next) {
    try {
        const { _token } = req.body;
        const { id } = req.params;
        const decode = jwt.decode(_token);
        await User.unReweet(decode.handle, id, decode.handle);
        return res.status(201).json({ message: 'Reweet succesfully removed' });
    } catch (err) {
        return next(err)
    }
});

/** POST
 * 
 * Allows the current user to favorite a weet.
 * Throws an error if the current user has already favorited the weet, or if the weet does not exist.
 * 
 */

router.post('/:id/favorite', ensureSignedIn, ensureTokenOrigin, async function(req, res, next) {
    try {
        const { _token } = req.body;
        const { id } = req.params;
        const decode = jwt.decode(_token);
        await User.favorite(decode.handle, id, decode.handle);
        return res.status(201).json({ message: 'Weet succesfully favorited' });
    } catch (err) {
        return next(err)
    }
});

/** POST
 * 
 * Allows the current user to unfavorite a favorited weet.
 * Throws an error if the current user has not favorited the weet, or if the weet does not exist.
 * 
 */

router.post('/:id/unfavorite', ensureSignedIn, ensureTokenOrigin, async function(req, res, next) {
    try {
        const { _token } = req.body;
        const { id } = req.params;
        const decode = jwt.decode(_token);
        await User.unFavorite(decode.handle, id, decode.handle);
        return res.status(201).json({ message: 'Favorite succesfully removed' });
    } catch (err) {
        return next(err)
    }
});

/** POST
 * 
 * Allows the current user to tab a weet.
 * Throws an error if the current user has already tabbed the weet, or if the weet does not exist.
 * 
 */

router.post('/:id/tab', ensureSignedIn, ensureTokenOrigin, async function(req, res, next) {
    try {
        const { _token } = req.body;
        const { id } = req.params;
        const decode = jwt.decode(_token);
        await User.tab(decode.handle, id, decode.handle);
        return res.status(201).json({ message: 'Weet succesfully tabbed' });
    } catch (err) {
        return next(err)
    }
});

/** POST
 * 
 * Allows the current user to untab a tabbed weet.
 * Throws an error if the current user has not tabbed the weet, or if the weet does not exist.
 * 
 */

router.post('/:id/untab', ensureSignedIn, ensureTokenOrigin, async function(req, res, next) {
    try {
        const { _token } = req.body;
        const { id } = req.params;
        const decode = jwt.decode(_token);
        await User.unTab(decode.handle, id, decode.handle);
        return res.status(201).json({ message: 'Tab succesfully removed' });
    } catch (err) {
        return next(err)
    }
});

module.exports = router;

// https://code.visualstudio.com/docs/languages/markdown