/** A helper function that returns an object containing keys indicating if a user description is valid.
 *  The object contains two keys: a boolean that determines if the user description is valid and an array
 *  of messages containing any possible errors. For a user description to be valid, it must pass two checks:
 *     1.) The user description is less than or equal to 250 characters in length
 *     2.) The user description matches the regular expression (does not start with a blank space, nor consist of just blank spaces)
 * 
 *         checkUserDescription('A generic user description') => {isValid: true, messages: []}
 * 
 */

const checkUserDescription = (userDescription) => {
    const userDescriptionObj = {};
    userDescriptionObj.messages = [];

    if(userDescription.length > 250){
        userDescriptionObj.messages.push('User description cannot be greater than 250 characters in length.')
    }

    const userDescriptionRegex1 = new RegExp(/^(?=.*\S).+$/);
    const regexCheck1 = userDescriptionRegex1.test(userDescription);

    const userDescriptionRegex2 = new RegExp(/^[^\s]/);
    const regexCheck2 = userDescriptionRegex2.test(userDescription);

    if(!regexCheck1 || !regexCheck2){
        userDescriptionObj.messages.push('User description cannot consist of just blank spaces, nor start with a blank space.')
    }

    if(userDescriptionObj.messages.length >= 1){
        userDescriptionObj.isValid = false
    } else {
        userDescriptionObj.isValid = true
    }

    return userDescriptionObj;
}

module.exports = checkUserDescription;