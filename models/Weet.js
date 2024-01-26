const db = require('../db');
const ExpressError = require('../helpers/expressError');
const convertTime = require('../helpers/convertTime');
const getStats = require('../helpers/getStats');
const getAuthor = require('../helpers/getAuthor');
const User = require('./User');

/** A class that contain weet specific methods. */

class Weet {

    /** Returns information on a given weet based on the weet id provided. Throws an error if an invalid weet is provided.
     * 
     *      Weet.get(1) => {id: 1, weet: 'a sample weet', author: 'handle1', time_date: timestamp, date: 'January 19, 2017', time: '1:45 PM', stats: {reweets: 0, favorites: 0, tabs: 0}, userInfo: {username: 'user1', user_description: 'a user description', profile_image: 'a profile image', banner_image: 'a banner image'}}
     * 
     */
    
    static async get(id) {
        const result = await db.query(
            `SELECT *
             FROM weets
             WHERE id = $1`,
            [id]
        );

        const weet = result.rows[0];

        if(!weet){
            throw new ExpressError(
                `The weet does not appear to exist`, 404
            )
        }

        const finalWeet = convertTime(weet);
        finalWeet.stats = await getStats(finalWeet.id);
        finalWeet.userInfo = await getAuthor(finalWeet.author);
        return finalWeet;

        //return convertTime(weet);
    }

    /** Creates a new weet in the backend and returns the new weet. Throws an error if an invalid author is provided.
     * 
     *      Weet.create('Another sample weet', 'handle2') => {id: 2, weet: 'Another sample weet', author: 'handle2', time_date: timestamp, date: 'January 20, 2017', time: '3:01 PM', stats: {reweets: 0, favorites: 0, tabs: 0}, userInfo: {username: 'user2', user_description: 'a user description', profile_image: 'a profile image', banner_image: 'a banner image'}}
     * 
     */

    static async create(weet, author) {
        const search = await db.query(
            `SELECT *
            FROM users
            WHERE handle = $1`,
            [author]
        );

        if(!search.rows){
            throw new ExpressError(
                `Invalid author (${author}) provided`, 401
            )
        }
        
        const result = await db.query(
            `INSERT INTO weets
                (weet, author, time_date)
             VALUES ($1, $2, NOW())
             RETURNING id, weet, author, time_date`,
            [
                weet,
                author
            ]
        );

        const initWeet = result.rows[0];
        const finalWeet = convertTime(initWeet);
        finalWeet.stats = await getStats(finalWeet.id);
        finalWeet.userInfo = await getAuthor(finalWeet.author);
        return finalWeet;
        

        /*const finalWeet = result.rows[0];
        
        return convertTime(finalWeet);*/
    }

    /** Edits an existing weet and returns the edited weet. Throws an error if an invalid weet id is provided. 
     * 
     *      Weet.edit(1, 'An edited weet') => {id: 1, weet: 'An edited weet', author: 'handle1', time_date: timestamp, date: 'January 21, 2017', time: '5:32 AM', stats: {reweets: 0, favorites: 0, tabs: 0}, userInfo: {username: 'user1', user_description: 'a user description', profile_image: 'a profile image', banner_image: 'a banner image'}}
     * 
    */

    static async edit(id, weet) {
        const search = await Weet.get(id);

        if(!search){
            throw new ExpressError(
                `Weet cannot be found.`, 404
            )
        }

        const result = await db.query(
            `UPDATE weets
            SET weet = $1
            RETURNING *`,
            [weet]
        );

        const initWeet = result.rows[0];
        const finalWeet = convertTime(initWeet);
        finalWeet.stats = await getStats(finalWeet.id);
        finalWeet.userInfo = await getAuthor(finalWeet.author);
        return finalWeet;

        /*const finalWeet = result.rows[0];
        
        return convertTime(finalWeet);*/
    }

    /** Deletes an existing weet and returns a message indicating deletion. Throws an error if an invalid weet id is provided. 
     * 
     *      Weet.delete(1) => 'Weet succesfully deleted'
     * 
    */

    static async delete(id) {
        const search = await Weet.get(id);

        if(!search){
            throw new ExpressError(
                `Weet cannot be found.`, 404
            )
        }

        await db.query(
            `DELETE FROM weets
            WHERE id = $1`,
            [id]
        );
        return 'Weet succesfully deleted.'
    }
}

module.exports = Weet;