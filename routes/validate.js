const express = require('express');
const router = express.Router();

const isValidSignUp = require('../helpers/isValidSignUp');
const isValidUpdateProfile = require('../helpers/isValidUpdateProfile');

const ensureSignedIn = require('../middleware/ensureSignedIn');
const ensureTokenOrigin = require('../middleware/ensureTokenOrigin');
const ensureOwner = require('../middleware/ensureOwner');

/** POST */

router.post('/sign-up', async (req, res, next) => {
    try {
        const { handle, username, password, email } = req.body;
        const result = await isValidSignUp(handle, username, password, email);
        return res.status(201).json({ result });
    } catch (err) {
        return next(err)
    }
});

/** POST */

router.post('/update-profile/:handle', ensureSignedIn, ensureTokenOrigin, ensureOwner, async (req, res, next) => {
    try {
        const { username, oldPassword, newPassword, email, userDescription, profilePicture, bannerPicture } = req.body;
        const { handle } = req.params;
        const result = await isValidUpdateProfile(handle, username, oldPassword, newPassword, email, userDescription, profilePicture, bannerPicture);
        return res.status(201).json({ result });
    } catch (err) {
        console.log('----------------------');
        console.log(err);
        console.log('----------------------');
        return next(err)
    }
});

module.exports = router;