const db = require('../db');

/** A helper function that returns an object containing keys indicating if an email is valid.
 *  The object contains two main keys: a boolean that determines if the email is valid and an
 *  array of messages containing any possible errors. For an email to pass, it must meet one
 *  check if mode is set to 'update' and two checks if mode is set to 'sign-up':
 *     
 *     1.) The email is unique ()
 *     2.) The email matches the regular expression (the email contains an @ symbol and ends with either .com, .edu or .net; 'sign-up' and 'update')
 * 
 *         await checkEmailSignUp('jameserikedwards@gmail.com', 'sign-up') => {isValid: true, messages: []}
 * 
 */

const checkEmailSignUp = async (email) => {
    const emailObj = {};
    emailObj.messages = [];

    const query = await db.query(
        `SELECT * FROM users WHERE email = $1`,
        [email]
    );

    if(query.rows[0] !== undefined){
        emailObj.messages.push(`Please select another email. ${email} is already taken.`);
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
}

module.exports = checkEmailSignUp;