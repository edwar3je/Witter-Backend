const express = require('express');
const router = express.Router();

const isValidSignUp = require('../helpers/isValidSignUp');
const isValidUpdateProfile = require('../helpers/isValidUpdateProfile');

const ensureSignedIn = require('../middleware/ensureSignedIn');
const ensureTokenOrigin = require('../middleware/ensureTokenOrigin');
const ensureOwner = require('../middleware/ensureOwner');

/** POST
 * 
 * Returns an object containing multiple keys corresponding to each data type on the object submitted. Each key contains
 * two keys that are used for validation: a boolean that determines if the data submitted for the given data type is valid
 * and an array of messages containing any possible errors. The object is used on the frontend to provide frontend error 
 * handling to ensure only valid data is sent to the official registration/sign-up route. For more information on how the 
 * route creates the object, see 'isValidSignUp.js' in the 'helpers' folder.
 * 
 */

router.post('/sign-up', async (req, res, next) => {
    try {
        const { handle, username, password, email } = req.body;
        const result = await isValidSignUp(handle, username, password, email);
        return res.status(201).json({ result });
    } catch (err) {
        return next(err)
    }
});

/** POST 
 * 
 * Returns an object containing multiple keys corresponding to each data type on the object submitted. Each key contains
 * two keys that are used for validation: a boolean that determines if the data submitted for the given data type is valid
 * and an array of messages containing any possible errors. The object is used on the frontend to provide frontend error 
 * handling to ensure only valid data is sent to the official edit profile route. For more information on how the route 
 * creates the object, see 'isValidUpdateProfile.js' in the 'helpers' folder.
 * 
*/

router.post('/update-profile/:handle', ensureSignedIn, ensureTokenOrigin, ensureOwner, async (req, res, next) => {
    try {
        const { username, oldPassword, newPassword, email, userDescription, profilePicture, bannerPicture } = req.body;
        const { handle } = req.params;
        const result = await isValidUpdateProfile(handle, username, oldPassword, newPassword, email, userDescription, profilePicture, bannerPicture);
        return res.status(201).json({ result });
    } catch (err) {
        return next(err)
    }
});

module.exports = router;