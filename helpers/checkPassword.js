/** A helper function that returns an object containing keys indicating if a password is valid. 
 *  The object contains two main keys: a boolean that determines if the password is valid and an
 *  array of messages containing any possible errors. For a password to be valid, it must pass
 *  two checks:
 *     1.) The password is between 8 - 20 characters long.
 *     2.) The password matches the regular expression (must have 1 capital letter, 1 lowercase letter, 1 number and 1 special character and no blank spaces)
 * 
 *         checkPassword('K0kof!nsz') => {isValid: true, messages: []}
 * 
*/

const checkPassword = (password) => {
    const passwordObj = {};
    passwordObj.messages = [];

    if(password.length < 8 || password.length > 20){
        passwordObj.messages.push('Password must be between 8 - 20 characters long.')
    }

    const passwordRegex1 = new RegExp(/(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])/);
    const regexCheck1 = passwordRegex1.test(password);

    // For simplicity sake, this regular expression will be inverted (false if no whitespace is present)
    const passwordRegex2 = new RegExp(/\s/);
    const regexCheck2 = passwordRegex2.test(password);

    // Note the lack of inversion on regexCheck2
    if(!regexCheck1 || regexCheck2){
        passwordObj.messages.push('Password must contain at least 1 capital letter, 1 lowercase letter, 1 number and 1 special character (e.g. !, #, *, etc.) and no blank spaces.');
    }

    if(passwordObj.messages.length >= 1){
        passwordObj.isValid = false;
    } else {
        passwordObj.isValid = true;
    }

    return passwordObj;
}

module.exports = checkPassword;