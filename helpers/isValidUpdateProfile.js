const checkUsername = require('../helpers/checkUsername');
const checkOldPassword = require('../helpers/checkOldPassword');
const checkNewPassword = require('../helpers/checkNewPassword');
const checkEmailUpdate = require('../helpers/checkEmailUpdate');
const checkUserDescription = require('../helpers/checkUserDescription');
const checkPicture = require('../helpers/checkPicture');

/** A helper function that returns an object containing keys that indicate whether the data
 *  submitted passes each individual check. Each key has at least two keys: a boolean that
 *  determines if the data is valid and an array of messages containing any possible errors. 
 *  This helper function checks 4 different pieces of data submitted:
 *     1.) username: must be between 8 - 20 characters long and match regular expression (can't consist of just empty space or start with an empty space)
 *     2.) oldPassword: must pass authentication (i.e. must be the same password that is stored on the backend)
 *     3.) newPassword: must be between 8 - 20 characters long, not be the same as the current password stored on the backend and match regular expression (can't consist of just empty space or start with an empty space)
 *     4.) email: must be unique (if not changing, must be the same email registered to the handle) and match regular expression (must contain an @ symbol and end with either .com, .edu or .net)
 *     5.) userDescription: must be less than or equal to 250 characters in length and match regular expression (does not start with a blank space, nor consist of just blank spaces)
 *     6.) profilePicture: must match regular expression (the picture contains 'http' or 'https' as a protocol and contains a valid image file extension (e.g. jpg, jpeg, png, etc.))
 *     7.) bannerPicture: must match regular expression (the picture contains 'http' or 'https' as a protocol and contains a valid image file extension (e.g. jpg, jpeg, png, etc.))
 * 
 *        await isValidUpdateProfile('edwar3je', 'james edwards', 'K0kof!nsz', 'St3phen!z', 'jameserikedwards@gmail.com', 'https://i.pinimg.com/736x/fb/1d/d6/fb1dd695cf985379da1909b2ceea3257.jpg', 'https://cdn.pixabay.com/photo/2017/08/30/01/05/milky-way-2695569_640.jpg') => {
 *                                                                                                                                                                                                                                                                                    username: {
 *                                                                                                                                                                                                                                                                                                isValid: true,
 *                                                                                                                                                                                                                                                                                                messages: []
 *                                                                                                                                                                                                                                                                                                               },
 *                                                                                                                                                                                                                                                                                    oldPassword: {
 *                                                                                                                                                                                                                                                                                                   isValid: true,
 *                                                                                                                                                                                                                                                                                                   messages: []
 *                                                                                                                                                                                                                                                                                                                 },
 *                                                                                                                                                                                                                                                                                    newPassword: {
 *                                                                                                                                                                                                                                                                                                   isValid: true,
 *                                                                                                                                                                                                                                                                                                   messages: []
 *                                                                                                                                                                                                                                                                                                                 },
 *                                                                                                                                                                                                                                                                                    email: {
 *                                                                                                                                                                                                                                                                                             isValid: true,
 *                                                                                                                                                                                                                                                                                             messages: []
 *                                                                                                                                                                                                                                                                                                           },
 *                                                                                                                                                                                                                                                                                    userDescription: {
 *                                                                                                                                                                                                                                                                                                       isValid: true,
 *                                                                                                                                                                                                                                                                                                       messages: []   
 *                                                                                                                                                                                                                                                                                                                      },
 *                                                                                                                                                                                                                                                                                    profilePicture: {
 *                                                                                                                                                                                                                                                                                                      isValid: true,
 *                                                                                                                                                                                                                                                                                                      messages: []
 *                                                                                                                                                                                                                                                                                                                     },
 *                                                                                                                                                                                                                                                                                    bannerPicture: {
 *                                                                                                                                                                                                                                                                                                      isValid: true,
 *                                                                                                                                                                                                                                                                                                      messages: []
 *                                                                                                                                                                                                                                                                                                                     }
 *                                                                                                                                                                                                                                                                                                                        }
 */

const isValidUpdateProfile = async (handle, username, oldPassword, newPassword, email, userDescription, profilePicture, bannerPicture) => {
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