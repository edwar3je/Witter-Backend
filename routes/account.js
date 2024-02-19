const express = require('express');
const router = express.Router();

const createToken = require('../helpers/createToken');

const User = require('../models/User');

/** POST 
 * 
 * Allows a user to create an account. Returns a valid json web token (JWT) that contains the user's account information.
 * Throws an error if any invalid data is provided (e.g. non-unique handle, non-unique email, missing data, etc.
 * 
*/

router.post('/sign-up', async (req, res, next) => {
    try {
        const { handle, username, password, email } = req.body;
        let user = await User.register(handle, username, password, email);
        const token = createToken(user);
        return res.status(201).json({ token });
    } catch (err) {
        return next(err)
    }
});

/** POST
 * 
 * Allows a user to sign into an existing account. Returns a valid json web token (JWT) that contains the user's account information.
 * Throws an error if authentication fails.
 * 
 */

router.post('/log-in', async (req, res, next) => {
    try {
        const { handle, password } = req.body;
        let user = await User.authenticate(handle, password);
        const token = createToken(user);
        return res.status(201).json({ token });
    } catch (err) {
        return next(err)
    }
});

module.exports = router;