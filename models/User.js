const bcrypt = require('bcrypt');
const db = require('../db');
const ExpressError = require('../helpers/expressError');
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

        const hashedPassword = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);

        const result = await db.query(
            `INSERT INTO users
                (handle, username, password, email)
            VALUES ($1, $2, $3, $4)
            RETURNING handle, username, password, email`,
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
     *      User.follow(handle1, handle2) => 'handle1 is now following handle 2'
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
     *      User.unfollow(handle1, handle2) => 'handle1 is no longer following handle2'
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
            console.log('---------------------');
            console.log('You failed the check');
            console.log('---------------------');
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
     *      User.getFollowers(handle1) => [handle2, handle3, handle4, ...]
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
     *      User.getFollowing(handle2) => [handle1]
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
     *      User.getWeets(handle1) => [{id: 1, weet: 'a sample weet', author: 'edwar3je', time_date: timestamp, date: 'February 7, 2019', time: '6:04 PM'}, {id: 1, weet: 'another sample weet', author: 'edwar3je', time_date: timestamp, date: 'January 25, 2019', time: '7:50 AM'}]
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
            ORDER BY time_date`,
            [handle]
        );

        const finalArr = [];

        for(let row of result.rows){
            const weet = row;
            weet.date = weet.time_date.toLocaleDateString('en-US', {month: 'long', year: 'numeric', day: 'numeric', timeZone: 'EST'});
            weet.time = weet.time_date.toLocaleTimeString('en-US', {hour: 'numeric', minute: 'numeric', hour12: true, timeZone: 'EST'});
            finalArr.push(weet);
        }

        return finalArr;
    }

    /** Allows an account to reweet an existing weet. Throws an error if the weet id provided is invalid or if the weet has already been reweeted by the same account.
     * 
     *      User.reweet(handle1, weet1) => 'weet succesfully reweeted'
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
     *      User.unReweet(handle1, weet1) => 'succesfully removed the reweet'
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
     *      User.getReweets(handle1) => [{id: 3, weet: 'a sample weet', author: 'z0rt4sh', time_date: timestamp, date: 'May 7, 2020', time: '3:14 PM'}, {id: 4, weet: 'another sample weet', author: 'z0rt4sh', time_date: timestamp, date: 'July 10, 2020', time: '4:44 PM'}]
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
            ORDER BY time_date`,
            [handle]
        );

        for(let row of result.rows){
            const search = await db.query(
                `SELECT *
                FROM weets
                WHERE id = $1`,
                [row.weet_id]
            );
            const weet = search.rows[0];
            weet.date = weet.time_date.toLocaleDateString('en-US', {month: 'long', year: 'numeric', day: 'numeric', timeZone: 'EST'});
            weet.time = weet.time_date.toLocaleTimeString('en-US', {hour: 'numeric', minute: 'numeric', hour12: true, timeZone: 'EST'});
            finalArr.push(weet);
        };

        return finalArr;
    }

    /** Allows an account to favorite an existing weet. Throws an error if the weet id provided is invalid.
     * 
     *      User.favorite('handle1', 'weet1') => 'weet succesfully favorited'
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
            throw new ExpressError(`${handle} has already favorited the weet.`, 403)
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
     *      User.unFavorite('handle1', 'weet1') => 'succesfully removed the favorite'
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
     *      User.getFavorites('handle1') => [{id: 3, weet: 'a sample weet', author: 'z0rt4sh', time_date: timestamp, date: 'May 7, 2020', time: '3:14 PM'}, {id: 4, weet: 'another sample weet', author: 'z0rt4sh', time_date: timestamp, date: 'July 10, 2020', time: '4:44 PM'}, {id: 1, weet: 'a sample weet', author: 'edwar3je', time_date: timestamp, date: 'February 7, 2019', time: '6:04 PM'}]
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
            ORDER BY time_date`,
            [handle]
        );

        for(let row of result.rows){
            const search = await db.query(
                `SELECT *
                FROM weets
                WHERE id = $1`,
                [row.weet_id]
            );

            const weet = search.rows[0];
            weet.date = weet.time_date.toLocaleDateString('en-US', {month: 'long', year: 'numeric', day: 'numeric', timeZone: 'EST'});
            weet.time = weet.time_date.toLocaleTimeString('en-US', {hour: 'numeric', minute: 'numeric', hour12: true, timeZone: 'EST'});
            finalArr.push(weet);
        }

        return finalArr
    }

    /** Allows an account to tab an existing weet. Throws an error if the weet id provided is invalid. 
     * 
     *      User.tab('handle1', 'weet1') => 'weet succesfully tabbed'
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
     *      User.unTab('handle1', 'weet1') => 'succesfully removed the tab'
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
     *      User.getTabs('handle1') => [{id: 3, weet: 'a sample weet', author: 'z0rt4sh', time_date: timestamp, date: 'May 7, 2020', time: '3:14 PM'}, {id: 4, weet: 'another sample weet', author: 'z0rt4sh', time_date: timestamp, date: 'July 10, 2020', time: '4:44 PM'}, {id: 1, weet: 'a sample weet', author: 'edwar3je', time_date: timestamp, date: 'February 7, 2019', time: '6:04 PM'}]
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
            ORDER BY time_date`,
            [handle]
        );

        for(let row of result.rows){
            const search = await db.query(
                `SELECT *
                FROM weets
                WHERE id = $1`,
                [row.weet_id]
            );

            const weet = search.rows[0];
            weet.date = weet.time_date.toLocaleDateString('en-US', {month: 'long', year: 'numeric', day: 'numeric', timeZone: 'EST'});
            weet.time = weet.time_date.toLocaleTimeString('en-US', {hour: 'numeric', minute: 'numeric', hour12: true, timeZone: 'EST'});
            finalArr.push(weet);
        }

        return finalArr
    }
}

module.exports = User;