/** A helper function that returns an object containing keys indicating if a picture is valid.
 *  The object contains two keys: a boolean that determines if the picture is valid and an array of
 *  messages containing any possible errors. For a picture to be valid, it must pass one check:
 *     
 *     1.) The picture matches the regular expression (the picture contains 'http' or 'https' as a protocol and contains a valid image file extension (e.g. jpg, jpeg, png, etc.))
 * 
 *         checkPicture('https://i.pinimg.com/736x/fb/1d/d6/fb1dd695cf985379da1909b2ceea3257.jpg') => {isValid: true, messages: true}
 * 
 */

const checkPicture = (picture) => {
    const pictureObj = {};
    pictureObj.messages = [];

    const pictureRegex1 = new RegExp(/^(https|http)(\S+)(jpg|jpeg|png)$/);
    const regexCheck1 = pictureRegex1.test(picture);

    // This will match any string that contains a blank space (will be inverted)
    const pictureRegex2 = new RegExp(/[\s]/);
    const regexCheck2 = pictureRegex2.test(picture);
    
    // regexCheck2 will be inverted to ensure that any blank spaces detected (matched) will result in a fail
    if(!regexCheck1 || regexCheck2){
        pictureObj.messages.push('Invalid url. Please provide a valid url with proper image file extension (e.g. jpg, jpeg, png, etc.).')
    }

    if(pictureObj.messages.length === 1){
        pictureObj.isValid = false
    } else {
        pictureObj.isValid = true
    }

    return pictureObj;
};

module.exports = checkPicture;