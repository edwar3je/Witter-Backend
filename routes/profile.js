const express = require('express');
const router = express.Router();

/** GET
 * 
 * Returns information needed to access a user's profile page. Includes profile information, weets, reweets and favorites.
 * Throws an error if an invalid handle is provided. 
 * 
 */

router.get('/:user', async function(req, res, next) {
    fff
});

/** PUT
 * 
 * Allows a user to update their profile information.
 * Throws an error if invalid data is provided, no token is provided or an invalid json web token is provided.
 * 
 */

router.put('/:user', async function(req, res, next) {
    fff
});

/** DELETE
 * 
 * Allows a user to delete their account.
 * Throws an error if either no token is provided or an invalid json web token is provided.
 * 
 */

router.delete('/:user', async function(req, res, next) {
    fff
});

module.exports = router;