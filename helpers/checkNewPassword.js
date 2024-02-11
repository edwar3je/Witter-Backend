/** A helper function that returns an object containing keys indicating if a (new) password is valid.
 *  The object contains two keys: a boolean that determines if the (new) password is valid and an array of
 *  messages containing any possible errors. For a (new) password to be valid, it must pass three checks:
 *     1.) The new password is between 8 - 20 characters long.
 *     2.) The new password is not the same as the old password.
 *     3.) The new password matches the regular expression (must have 1 capital letter, 1 lowercase letter, 1 number, 1 special character and no blank spaces)
 * 
 *         checkNewPassword('K0kof!nsz', 'St3ph3n!') => {isValid: true, messages: []}
 * 
 */

const checkNewPassword = (oldPassword, newPassword) => {
    const newPasswordObj = {};
    newPasswordObj.messages = [];

    if(newPassword.length < 8 || newPassword.length > 20){
        newPasswordObj.messages.push('New password must be between 8 - 20 characters long.');
    }

    if(newPassword === oldPassword){
        newPasswordObj.messages.push('New password cannot be the same as the old password.');
    }

    const regexNewPassword1 = new RegExp(/(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])/);
    const regexCheck1 = regexNewPassword1.test(newPassword);

    // For simplicity sake, this regular expression will be inverted (false if no whitespace is present)
    const regexNewPassword2 = new RegExp(/\s/);
    const regexCheck2 = regexNewPassword2.test(newPassword);

    // Note the lack of inversion on regexCheck2
    if(!regexCheck1 || regexCheck2){
        newPasswordObj.messages.push('New password must contain at least 1 capital letter, 1 lowercase letter, 1 number, 1 special character and no blank spaces.')
    }

    if(newPasswordObj.messages.length >= 1){
        newPasswordObj.isValid = false;
    } else {
        newPasswordObj.isValid = true;
    }

    return newPasswordObj;
};

module.exports = checkNewPassword;