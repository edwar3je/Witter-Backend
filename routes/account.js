const express = require('express');
const router = express.Router();

/** POST 
 * 
 * Allows a user to create an account. Returns a valid json web token (JWT) that contains the user's account information.
 * Throws an error if any invalid data is provided (e.g. non-unique handle, non-unique email, missing data, etc.
 * 
*/

router.post('/sign-up', async function(req, res, next) {
    ffff
});

/** POST
 * 
 * Allows a user to sign into an existing account. Returns a valid json web token (JWT) that contains the user's account information.
 * Throws an error if authentication fails.
 * 
 */

router.post('/log-in', async function(req, res, next) {
    ffff
});

module.exports = router;