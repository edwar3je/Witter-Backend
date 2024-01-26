const express = require('express');
const router = express.Router();

/** POST
 * 
 * Allows a user to post a new weet.
 * Throws an error if an invalid handle is provided, no token is provided or an invalid json web token is provided.
 * 
 */

router.post('/', async function(req, res, next) {
    ffff
});

/** GET
 * 
 * Returns information on a specific weet.
 * Throws an error if an invalid weet id is provided.
 * 
 */
router.get('/:id', async function(req, res, next) {
    ffff
});

/** PUT
 * 
 * Allows a user to edit one of their own weets.
 * Throws an error if the weet was not authored by the user, the weet does not exist, no token is provided or an invalid json web token is provided.
 * 
 */

router.put('/:id', async function(req, res, next) {
    ffff
});

/** DELETE
 * 
 * Allows a user to delete one of their own weets.
 * Throws an error if the weet was not authored by the user, the weet does not exist, no token is provided or an invalid json web token is provided.
 * 
 */

router.delete('/:id', async function(req, res, next) {
    ffff
});

module.exports = router;

// https://code.visualstudio.com/docs/languages/markdown