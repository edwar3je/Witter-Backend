/** A helper function that returns an object containing keys indicating if a username is valid.
 *  The object contains two main keys: a boolean that determines if the username is valid and an
 *  array of messages containing any possible errors. For a username to be valid, it must pass
 *  two checks:
 *     1.) The username is between 8 - 20 characters long
 *     2.) The username matches the regular expressions (username can't just consist of empty spaces nor start with an empty space)
 *         
 *         checkUsername('james edwards') => {isValid: true, messages: []}
 * 
 */

const checkUsername = (username) => {
    const userObj = {};
    userObj.messages = [];

    if(username.length < 8 || username.length > 20){
        userObj.messages.push('Username must be between 8 - 20 characters long.');
    }

    const userRegex1 = new RegExp(/^(?=.*\S).+$/);
    const regexCheck1 = userRegex1.test(username);

    const userRegex2 = new RegExp(/^[^\s]/);
    const regexCheck2 = userRegex2.test(username);

    if(!regexCheck1 || !regexCheck2){
        userObj.messages.push('Username cannot contain only empty spaces nor start with an empty space.');
    }

    if(userObj.messages.length >= 1){
        userObj.isValid = false;
    } else {
        userObj.isValid = true;
    }

    return userObj;
}

module.exports = checkUsername;