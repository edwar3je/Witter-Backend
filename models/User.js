const bcrypt = require('bcrypt');
const db = require('../db');
const ExpressError = require('../helpers/expressError');
const convertTime = require('../helpers/convertTime');
const getStats = require('../helpers/getStats');
const getAuthor = require('../helpers/getAuthor');
const Weet = require('./Weet');
const { BCRYPT_WORK_FACTOR } = require('../config');

/** A class that contains account/profile specific methods. */

class User {

    /** Registers a new user to the 'users' database and returns the new user's account information
     * 
     *      User.register('handle1', 'username1', 'password1', 'email1') => {handle: 'handle1', username: 'username1', password: bcryptpassword, email: 'email1', ...}
     * 
     */

    static async register(handle, username, password, email) {
        if(!handle || !username || !password || !email){
            throw new ExpressError(`Missing information`, 400)
        }
        
        const duplicateCheck = await db.query(
            `SELECT username
            FROM users
            WHERE handle = $1`,
            [handle]
        );

        if (duplicateCheck.rows[0]) {
            throw new ExpressError(
                `Please use a different handle. ${handle} is already taken`, 400
            );
        }

        const checkEmail = await db.query(
            `SELECT *
            FROM users
            WHERE email = $1`,
            [email]
        );

        if (checkEmail.rows[0] !== undefined){
            throw new ExpressError(
                `Please provide a unique email. ${email} is already taken`, 400
            );
        }

        const hashedPassword = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);

        const result = await db.query(
            `INSERT INTO users
                (handle, username, password, email)
            VALUES ($1, $2, $3, $4)
            RETURNING *`,
            [
                handle,
                username,
                hashedPassword,
                email
            ]
        );

        return result.rows[0];
    }

    /** Verifies a user's credentials and returns account information if valid credentials are provided.
     * 
     *      User.authenticate('handle1', 'password1') => {handle: 'handle1', username: 'username1', password: bcryptpassword, email: 'email1', ...}
     * 
     */

    static async authenticate(handle, password) {
        
        const result = await db.query(
            `SELECT * 
            FROM users
            WHERE handle = $1`,
            [handle]
        );

        const user = result.rows[0];

        if (user && (await bcrypt.compare(password, user.password))) {
            return user;
        } else {
            throw new ExpressError('Cannot authenticate', 401);
        }
    }

    /** Returns account information based on handle provided. Throws an error if an invalid handle is provided.
     * 
     *      User.get('handle1') => {handle: 'handle1', username: 'username1', password: bcryptpassword, email: 'email1', ...}
     * 
     */

    static async get(handle) {
        const result = await db.query(
            `SELECT *
            FROM users
            WHERE handle = $1`,
            [handle]
        );

        if(result.rows[0] === undefined){
            throw new ExpressError(`${handle} does not exist`, 404);
        }

        return result.rows[0];
    }

    /** Updates an existing account's profile information. Throws an error if authentication fails, and/or if any information is missing.
     * 
     *      User.update('handle1', 'new username', 'oldpassword', 'newpassword', 'newemail@email.com', 'new user description', 'new profile picture', 'new banner picture') => {handle: 'handle1', username: 'new username', password: newencrypted, email: 'newemail@email.com', user_description: 'new user description', profile_image: 'new profile image', banner_image: 'new banner image'}
     * 
     */

    static async update(handle, username, oldPassword, newPassword, email, userDescription, profilePicture, bannerPicture) {

        if(!handle || !username || !oldPassword || !email || !userDescription || !profilePicture || !bannerPicture) {
            throw new ExpressError(`Missing information`, 400);
        }
        
        const verify = await User.authenticate(handle, oldPassword);

        if(!verify){
            throw new ExpressError(`Cannot authenticate`, 401)
        }

        const checkEmail = await db.query(
            `SELECT * FROM users WHERE email = $1`,
            [email]
        );

        if(checkEmail.rows[0] !== undefined){
            if(checkEmail.rows[0].handle !== handle){
                throw new ExpressError(`Email must be unique`, 403)
            }
        }
        
        if(newPassword){
            if(newPassword === oldPassword){
                throw new ExpressError(`New password must be different from the old password`, 403)
            }
            else if(newPassword.length < 8 || newPassword.length > 20){
                throw new ExpressError(`New password must be between 8 - 20 characters long`, 403)
            }
            const result = await db.query(
                `UPDATE users
                SET username = $1, password = $2, email = $3, user_description = $4, profile_image = $5, banner_image = $6
                WHERE handle = $7
                RETURNING *`,
                [username, await bcrypt.hash(newPassword, BCRYPT_WORK_FACTOR), email, userDescription, profilePicture, bannerPicture, handle]
            );
            return result.rows[0]
        } else {
            const result = await db.query(
                `UPDATE users
                SET username = $1, email = $2, user_description = $3, profile_image = $4, banner_image = $5
                WHERE handle = $6
                RETURNING *`,
                [username, email, userDescription, profilePicture, bannerPicture, handle]
            );
            return result.rows[0]
        }
    };

    /** Deletes an account from the backend based on the handle provided. Throws an error if an invalid handle is provided.
     * 
     *      User.delete('handle1') => true
     * 
     */

    static async delete(handle) {
        const result = await db.query(
            `DELETE FROM users where handle = $1 RETURNING username`,
            [handle]
        );
        const user = result.rows[0];
        
        if(!user){
            throw new ExpressError('No such user', 404);
        }

        return true;
    }

    /** Allows one account to follow another account. Throws an error if one or more of the accounts are invalid.
     * 
     *      User.follow('handle1', 'handle2') => 'handle1 is now following handle2'
     * 
    */
    
    static async follow(follower, followee) {
        const search1 = await User.get(follower);
        const search2 = await User.get(followee);

        if(!search1 && !search2){
            throw new ExpressError(`Neither ${follower} nor ${followee} are valid accounts`, 404)
        }
        else if(!search1 || !search2){
            if(!search1){
                throw new ExpressError(`${follower} is not a valid account`, 404)
            } else {
                throw new ExpressError(`${followee} is not a valid account`, 404)
            }
        }

        const checkFollowerStatus = await db.query(
            `SELECT *
            FROM followers
            WHERE follower_id = $1 AND followee_id = $2`,
            [follower, followee]
        );

        if(checkFollowerStatus.rows[0] !== undefined){
            /*console.log('---------------------');
            console.log('You failed the check');
            console.log('---------------------');*/
            //throw new ExpressError(`${follower} is already following ${followee}`, 403)
            throw new ExpressError('You are already following this user', 403);
        }

        await db.query(
            `INSERT INTO followers
            (follower_id, followee_id)
            VALUES ($1, $2)`,
            [follower, followee]
        );

        return `${follower} is now following ${followee}`   
    }

    /** Allows one account to unfollow another account. Throws an error if one or more of the handles are invalid, or if the handle is not following the other handle
     * 
     *      User.unfollow('handle1', 'handle2') => 'handle1 is no longer following handle2'
     * 
     */

    static async unfollow(follower, followee) {
        const search1 = await User.get(follower);
        const search2 = await User.get(followee);

        if(!search1 && !search2){
            throw new ExpressError(`Neither ${follower} nor ${followee} are valid accounts`, 404)
        }
        else if(!search1 || !search2){
            if(!search1){
                throw new ExpressError(`${follower} is not a valid account`, 404)
            } else {
                throw new ExpressError(`${followee} is not a valid account`, 404)
            }
        }

        const checkFollowerStatus = await db.query(
            `SELECT *
            FROM followers
            WHERE follower_id = $1 AND followee_id = $2`,
            [follower, followee]
        );
        
        if(checkFollowerStatus.rows[0] === undefined){
            /*console.log('---------------------');
            console.log('You failed the check');
            console.log('---------------------');*/
            throw new ExpressError(`${follower} is already following ${followee}`, 403)
        }

        await db.query(
            `DELETE FROM followers
            WHERE follower_id = $1 AND followee_id = $2`,
            [follower, followee]
        );

        return `${follower} is no longer following ${followee}`
    }

    /** Retrieves an array of accounts that follow a given user. Throws an error if the handle provided is invalid.
     * 
     *      User.getFollowers('handle1') => ['handle2', 'handle3', 'handle4', ...]
     * 
     */

    static async getFollowers(handle) {
        const check = await User.get(handle);

        if(!check){
            throw new ExpressError(`${handle} does not exist`, 404);
        }
        
        const finalArr = [];
        
        const result = await db.query(
            `SELECT follower_id 
            FROM followers
            WHERE followee_id = $1`,
            [handle]
        );

        for(let row of result.rows){
            finalArr.push(row.follower_id)
        }

        return finalArr;
    }

    /** Retrieves an array of accounts that a given user is following. Throws an error if the handle provided is invalid. 
     * 
     *      User.getFollowing('handle2') => ['handle1']
     * 
    */
    
    static async getFollowing(handle) {
        const check = await User.get(handle);

        if(!check){
            throw new ExpressError(`${handle} does not exist`, 404);
        }

        const finalArr = [];

        const result = await db.query(
            `SELECT followee_id
            FROM followers
            WHERE follower_id = $1`,
            [handle]
        );

        for(let row of result.rows){
            finalArr.push(row.followee_id)
        }

        return finalArr;
    }

    /** Retrieves all weets a user has created. Throws an error if the handle provided is invalid.
     * 
     *      User.getWeets('handle1') => [
     *                                   {id: 1, weet: 'a sample weet', author: 'edwar3je', time_date: timestamp, date: 'February 7, 2019', time: '6:04 PM'}, 
     *                                   {id: 1, weet: 'another sample weet', author: 'edwar3je', time_date: timestamp, date: 'January 25, 2019', time: '7:50 AM'}
     *                                                                                                                                                            ]
     * 
     */
    
    static async getWeets(handle) {
        const check = await User.get(handle);

        if(!check){
            throw new ExpressError(`${handle} does not exist`, 404);
        }
        
        const result = await db.query(
            `SELECT *
            FROM weets
            WHERE author = $1
            ORDER BY time_date DESC`,
            [handle]
        );

        const finalArr = [];

        for(let row of result.rows){
            const weet = convertTime(row);
            weet.stats = await getStats(weet.id);
            weet.userInfo = await getAuthor(weet.author);
            finalArr.push(weet);
        }

        return finalArr;
    }

    /** Allows an account to reweet an existing weet. Throws an error if the weet id provided is invalid or if the weet has already been reweeted by the same account.
     * 
     *      User.reweet('handle1', weet1) => 'weet succesfully reweeted'
     *  
     */

    static async reweet(handle, weetId) {
        const checkWeet = await Weet.get(weetId);
        const checkAccount = await User.get(handle);
        
        if(!checkWeet){
            throw new ExpressError(`The weet does not appear to exist`, 404)
        }

        if(!checkAccount){
            throw new ExpressError(`${handle} does not exist`, 404);
        }

        const checkReweet = await db.query(
            `SELECT *
            FROM reweets
            WHERE weet_id = $1 AND user_id = $2`,
            [weetId, handle]
        );

        if(checkReweet.rows[0] !== undefined){
            throw new ExpressError(`${handle} has already reweeted the weet.`, 403)
        }

        await db.query(
            `INSERT INTO reweets
            (weet_id, user_id, time_date)
            VALUES ($1, $2, NOW())`,
            [weetId, handle]
        );

        return 'weet succesfully reweeted'
    }

    /** Allows an account to remove an existing reweet. Throws an error if either the weet id or handle provided are invalid, or if the account has not reweeted the weet.
     * 
     *      User.unReweet('handle1', weet1) => 'succesfully removed the reweet'
     * 
     */

    static async unReweet(handle, weetId) {
        const checkWeet = await Weet.get(weetId);
        const checkAccount = await User.get(handle);
        
        if(!checkWeet){
            throw new ExpressError(`The weet does not appear to exist`, 404)
        }

        if(!checkAccount){
            throw new ExpressError(`${handle} does not exist`, 404);
        }

        const checkReweet = await db.query(
            `SELECT *
            FROM reweets
            WHERE weet_id = $1 AND user_id = $2`,
            [weetId, handle]
        );

        if(checkReweet.rows[0] === undefined){
            throw new ExpressError(`${handle} has not reweeted the weet.`, 403)
        }

        await db.query(
            `DELETE FROM reweets
            WHERE weet_id = $1 AND user_id = $2`,
            [weetId, handle]
        );

        return 'succesfully removed the reweet'
    }

    /** Retrieves all of a user's reweets. Throws an error if the handle provided is invalid. 
     * 
     *      User.getReweets('handle1') => [
     *                                     {id: 3, weet: 'a sample weet', author: 'z0rt4sh', time_date: timestamp, date: 'May 7, 2020', time: '3:14 PM'}, 
     *                                     {id: 4, weet: 'another sample weet', author: 'z0rt4sh', time_date: timestamp, date: 'July 10, 2020', time: '4:44 PM'}
     *                                                                                                                                                          ]
     * 
    */

    static async getReweets(handle) {
        const check = await User.get(handle);

        if(!check){
            throw new ExpressError(`${handle} does not exist`, 404);
        }

        const finalArr = [];

        const result = await db.query(
            `SELECT weet_id
            FROM reweets
            WHERE user_id = $1
            ORDER BY time_date DESC`,
            [handle]
        );

        for(let row of result.rows){
            const weet = await Weet.get(row.weet_id);
            finalArr.push(weet);
        };

        return finalArr;
    }

    /** Allows an account to favorite an existing weet. Throws an error if the weet id provided is invalid.
     * 
     *      User.favorite('handle1', weet1) => 'weet succesfully favorited'
     * 
     */

    static async favorite(handle, weetId){
        const checkWeet = await Weet.get(weetId);
        const checkAccount = await User.get(handle);
        
        if(!checkWeet){
            throw new ExpressError(`The weet does not appear to exist`, 404);
        }

        if(!checkAccount){
            throw new ExpressError(`${handle} does not exist`, 404);
        }

        const checkFavorite = await db.query(
            `SELECT *
            FROM favorites
            WHERE weet_id = $1 AND user_id = $2`,
            [weetId, handle]
        );

        if(checkFavorite.rows[0] !== undefined){
            throw new ExpressError(`${handle} has already favorited the weet`, 403);
        }

        await db.query(
            `INSERT INTO favorites
            (user_id, weet_id, time_date)
            VALUES ($1, $2, NOW())`,
            [handle, weetId]
        );

        return 'weet succesfully favorited'
    }

    /** Allows an account to remove an existing favorited weet. Throws an error if the handle and/or weet id provided is/are invalid, or if the account has not favorited the weet.
     * 
     *      User.unFavorite('handle1', weet1) => 'succesfully removed the favorite'
     * 
     */

    static async unFavorite(handle, weetId){
        const checkWeet = await Weet.get(weetId);
        const checkAccount = await User.get(handle);
        
        if(!checkWeet){
            throw new ExpressError(`The weet does not appear to exist`, 404);
        }

        if(!checkAccount){
            throw new ExpressError(`${handle} does not exist`, 404);
        }

        const checkFavorite = await db.query(
            `SELECT *
            FROM favorites
            WHERE weet_id = $1 AND user_id = $2`,
            [weetId, handle]
        );

        if(checkFavorite.rows[0] === undefined){
            throw new ExpressError(`${handle} has not favorited the weet.`, 403)
        }

        await db.query(
            `DELETE FROM favorites
            WHERE user_id = $1 AND weet_id = $2`,
            [handle, weetId]
        );

        return 'succesfully removed the favorite'
    }

    /** Retrieves all of a user's favorites. Throws an error if the handle provided is invalid.
     * 
     *      User.getFavorites('handle1') => [
     *                                       {id: 3, weet: 'a sample weet', author: 'z0rt4sh', time_date: timestamp, date: 'May 7, 2020', time: '3:14 PM'}, 
     *                                       {id: 4, weet: 'another sample weet', author: 'z0rt4sh', time_date: timestamp, date: 'July 10, 2020', time: '4:44 PM'}, 
     *                                       {id: 1, weet: 'a sample weet', author: 'edwar3je', time_date: timestamp, date: 'February 7, 2019', time: '6:04 PM'}
     *                                                                                                                                                          ]
     * 
     */

    static async getFavorites(handle) {
        const check = await User.get(handle);

        if(!check){
            throw new ExpressError(`${handle} does not exist`, 404);
        }

        const finalArr = [];

        const result = await db.query(
            `SELECT *
            FROM favorites
            WHERE user_id = $1
            ORDER BY time_date DESC`,
            [handle]
        );

        for(let row of result.rows){
            const weet = await Weet.get(row.weet_id);
            finalArr.push(weet);
        }

        return finalArr
    }

    /** Allows an account to tab an existing weet. Throws an error if the weet id provided is invalid. 
     * 
     *      User.tab('handle1', weet1) => 'weet succesfully tabbed'
     * 
    */

    static async tab(handle, weetId){
        const checkWeet = await Weet.get(weetId);
        const checkAccount = await User.get(handle);
        
        if(!checkWeet){
            throw new ExpressError(`The weet does not appear to exist`, 404);
        }

        if(!checkAccount){
            throw new ExpressError(`${handle} does not exist`, 404);
        }

        const checkTab = await db.query(
            `SELECT *
            FROM tabs
            WHERE weet_id = $1 AND user_id = $2`,
            [weetId, handle]
        );

        if(checkTab.rows[0] !== undefined){
            throw new ExpressError(`${handle} has already tabbed the weet.`, 403)
        }

        await db.query(
            `INSERT INTO tabs
            (user_id, weet_id, time_date)
            VALUES ($1, $2, NOW())`,
            [handle, weetId]
        );

        return 'weet succesfully tabbed'
    }

    /** Allows an account to remove an existing tabbed weet. Throws an error if the handle and/or weet id provided is/are invalid, or if the account has not tabbed the weet.
     * 
     *      User.unTab('handle1', weet1) => 'succesfully removed the tab'
     * 
    */

    static async unTab(handle, weetId){
        const checkWeet = await Weet.get(weetId);
        const checkAccount = await User.get(handle);
        
        if(!checkWeet){
            throw new ExpressError(`The weet does not appear to exist`, 404);
        }

        if(!checkAccount){
            throw new ExpressError(`${handle} does not exist`, 404);
        }

        const checkTab = await db.query(
            `SELECT *
            FROM tabs
            WHERE weet_id = $1 AND user_id = $2`,
            [weetId, handle]
        );

        if(checkTab.rows[0] === undefined){
            throw new ExpressError(`${handle} has not tabbed the weet.`, 403)
        }

        await db.query(
            `DELETE FROM tabs
            WHERE user_id = $1 AND weet_id = $2`,
            [handle, weetId]
        );

        return 'succesfully removed the tab'
    }

    /** Retrieves all of a user's tabs. Throws an error if the handle provided is invalid. 
     * 
     *      User.getTabs('handle1') => [
     *                                  {id: 3, weet: 'a sample weet', author: 'z0rt4sh', time_date: timestamp, date: 'May 7, 2020', time: '3:14 PM'}, 
     *                                  {id: 4, weet: 'another sample weet', author: 'z0rt4sh', time_date: timestamp, date: 'July 10, 2020', time: '4:44 PM'}, 
     *                                  {id: 1, weet: 'a sample weet', author: 'edwar3je', time_date: timestamp, date: 'February 7, 2019', time: '6:04 PM'}
     *                                                                                                                                                     ]
     * 
    */

    static async getTabs(handle) {
        const check = await User.get(handle);

        if(!check){
            throw new ExpressError(`${handle} does not exist`, 404);
        }

        const finalArr = [];

        const result = await db.query(
            `SELECT *
            FROM tabs
            WHERE user_id = $1
            ORDER BY time_date DESC`,
            [handle]
        );

        for(let row of result.rows){
            const weet = await Weet.get(row.weet_id);
            finalArr.push(weet);
        }

        return finalArr
    }

    /** Retrieves weets from every account the current user is following from newest to oldest.
     *  
     *      User.getFeed('handle1') => [
     *                                  {id: 3, weet: 'a sample weet', author: 'z0rt4sh', time_date: timestamp, date: 'May 7, 2020', time: '3:14 PM'}, 
     *                                  {id: 4, weet: 'another sample weet', author: 'z0rt4sh', time_date: timestamp, date: 'July 10, 2020', time: '4:44 PM'}, 
     *                                  {id: 1, weet: 'a sample weet', author: 'edwar3je', time_date: timestamp, date: 'February 7, 2019', time: '6:04 PM'}
     *                                                                                                                                                     ]
     *  
    */ 

    static async getFeed(handle) {
        const check = await User.get(handle);

        if(!check){
            throw new ExpressError(`${handle} does not exist`, 404);
        }

        const following = await User.getFollowing(handle);

        if(following.length > 0){
            let count = 1;
            const countArr = [];
            for(let followee of following){
                count++;
                countArr.push(`$${count}`);
            }
            let countString = countArr.join(', ')
            const result = await db.query(
                `SELECT *
                 FROM weets
                 WHERE author IN ($1, ${countString})
                 ORDER BY time_date DESC`,
                 [handle, ...following]
            );
            const finalArr = [];
            for(let res of result.rows){
                const finalWeet = convertTime(res);
                finalWeet.stats = await getStats(finalWeet.id);
                finalWeet.userInfo = await getAuthor(finalWeet.author);
                finalArr.push(finalWeet);
            }
            return finalArr
        } else {
            const result = await User.getWeets(handle);
            return result
        }
    }
}

module.exports = User;