const checkUsername = require('../helpers/checkUsername');
const checkOldPassword = require('../helpers/checkOldPassword');
const checkNewPassword = require('../helpers/checkNewPassword');
const checkEmailUpdate = require('../helpers/checkEmailUpdate');
const checkUserDescription = require('../helpers/checkUserDescription');
const checkPicture = require('../helpers/checkPicture');

const isValidUpdateProfile = async (handle, username, oldPassword, newPassword, email, userDescription, profilePicture, bannerPicture) => {
    // check username (standard), old password (authentication), new password (only if not null), email (either unique or current email), user description (must be less than 250 characters and not start with blank space), profile image (must be valid url), banner image (must be valid url)
    const finalObj = {};
    finalObj.username = checkUsername(username);
    finalObj.oldPassword = await checkOldPassword(handle, oldPassword);
    if(newPassword){
        finalObj.newPassword = await checkNewPassword(handle, newPassword);
    }
    finalObj.email = await checkEmailUpdate(handle, email);
    finalObj.userDescription = checkUserDescription(userDescription);
    finalObj.profilePicture = checkPicture(profilePicture);
    finalObj.bannerPicture = checkPicture(bannerPicture);
    return finalObj;
};

module.exports = isValidUpdateProfile;