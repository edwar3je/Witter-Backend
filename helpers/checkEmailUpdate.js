const db = require('../db');

/** A helper function that returns an object containing keys indicating if an email is valid.
 *  The object contains two keys: a boolean that determines if the email is valid and an array of
 *  messages containing any possible errors. For an email to be valid, it must pass two checks:
 *     
 *     1.) The email is either unique or the user's current email.
 *     2.) The email matches the regular expression (the email contains an @ symbol and ends with either .com, .edu or .net)
 *     
 *          await checkEmailUpdate('edwar3je', 'jedwards@gmail.com') => {isValid: true, messages: []}
 */

const checkEmailUpdate = async (handle, email) => {
    const emailObj = {};
    emailObj.messages = [];

    const query = await db.query(
        `SELECT * FROM users WHERE email = $1;`,
        [email]
    );

    if(query.rows[0] !== undefined){
        if(query.rows[0].handle !== handle){
            emailObj.messages.push(`Please select a different email. ${email} is already taken.`)
        }
    }

    const emailRegex = new RegExp(/^[a-zA-Z0-9]+@[a-zA-Z]+\.(com|edu|net)$/);
    const regexCheck = emailRegex.test(email);

    if(!regexCheck){
        emailObj.messages.push('Invalid email. Please provide a valid email.')
    }

    if(emailObj.messages.length >= 1){
        emailObj.isValid = false;
    } else {
        emailObj.isValid = true;
    }

    return emailObj;
};

module.exports = checkEmailUpdate;