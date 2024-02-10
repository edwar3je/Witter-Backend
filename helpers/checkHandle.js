const db = require('../db');

/** A helper function that returns an object containing keys indicating if a handle is valid.
 *  The object contains two main keys: a boolean that determines if the handle is valid and a corresponding
 *  array of messages containing any possible errors. For a handle to be valid, it must pass at least three checks:
 *    1.) The handle is between 8 - 20 characters long
 *    2.) The handle is unique
 *    3.) The handle matches the regular expression (can only contain lowercase letters, uppercase letters and numbers)
 * 
 *        await checkHandle('edwar3je') => {isValid: true, messages: []}
 * 
 */

const checkHandle = async (handle) => {
    const handleObj = {};
    handleObj.messages = [];

    if(handle.length < 8 || handle.length > 20){
        handleObj.messages.push('Handle must be between 8 - 20 characters long.');
    }

    const handleCheck = await db.query(
        `SELECT * FROM users WHERE handle = $1`,
        [handle]
    );

    if(handleCheck.rows[0] !== undefined){
        handleObj.messages.push(`Please select another handle. ${handle} is already taken.`);
    }

    const handleRegex = new RegExp(/^\w+$/);
    const regexCheck = handleRegex.test(handle);

    if(!regexCheck){
        handleObj.messages.push('Handle must contain only lowercase letters, uppercase letters and numbers with no spaces.');
    }

    if(handleObj.messages.length >= 1){
        handleObj.isValid = false;
    } else {
        handleObj.isValid = true;
    }

    return handleObj;
}

module.exports = checkHandle;