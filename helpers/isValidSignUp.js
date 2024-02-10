const checkHandle = require('../helpers/checkHandle.js');
const checkUsername = require('../helpers/checkUsername.js');
const checkPassword = require('../helpers/checkPassword.js');
const checkEmailSignUp = require('./checkEmailSignUp.js');

/** A helper function that returns an object containing keys that indicate whether
 *  the data submitted passes each individual check. Each key has at least two keys:
 *  a boolean that determines if the data is valid and a string containing a message.
 *  This helper function checks 4 different pieces of data submitted:
 *     1.) handle: must be between 8 - 20 characters long, unique and match regular expression (can only contain lowercase letters, uppercase letters and numbers)
 *     2.) username: must be between 8 - 20 characters long and match regular expression (can't consist of just empty space or start with an empty space)
 *     3.) password: must be between 8 - 20 characters long and match regular expression (must have 1 capital letter, 1 lowercase letter, 1 number and 1 special character with no blank spaces)
 *     4.) email: must be unique and match regular expression (must contain an @ symbol and end with either .com, .edu or .net)
 * 
 *        await isValidSignUp('edwar3je', 'james edwards', 'K0kof!nsz', 'jameserikedwards@gmail.com') => {
 *                                                                                                   handle: {
 *                                                                                                             isValid: true,
 *                                                                                                             messages: []
 *                                                                                                                            },
 *                                                                                                   username: {
 *                                                                                                               isValid: true,
 *                                                                                                               messages: []
 *                                                                                                                              },
 *                                                                                                   password: {
 *                                                                                                               isValid: true,
 *                                                                                                               messages: []
 *                                                                                                                               },
 *                                                                                                   email: {    
 *                                                                                                               isValid: true,
 *                                                                                                               messages: []
 *                                                                                                                                }
 *                                                                                                                                  } 
 */

const isValidSignUp = async (handle, username, password, email) => {
    const finalObj = {};
    finalObj.handle = await checkHandle(handle);
    finalObj.username = checkUsername(username);
    finalObj.password = checkPassword(password);
    finalObj.email = await checkEmailSignUp(email);
    return finalObj;
}

module.exports = isValidSignUp;