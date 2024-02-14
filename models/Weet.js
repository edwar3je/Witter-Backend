const db = require('../db');
const ExpressError = require('../helpers/expressError');
const convertTime = require('../helpers/convertTime');
const getStats = require('../helpers/getStats');
const getAuthor = require('../helpers/getAuthor');
const hasReweeted = require('../helpers/hasReweeted');
const hasFavorited = require('../helpers/hasFavorited');
const hasTabbed = require('../helpers/hasTabbed');
const User = require('./User');

/** A class that contain weet specific methods. */

class Weet {

    /** Returns information on a given weet based on the weet id provided. Throws an error if an invalid weet is provided.
     * 
     *      Weet.get(1) => {id: 1, weet: 'a sample weet', author: 'handle1', time_date: timestamp, date: 'January 19, 2017', time: '1:45 PM', stats: {reweets: 0, favorites: 0, tabs: 0}, userInfo: {username: 'user1', user_description: 'a user description', profile_image: 'a profile image', banner_image: 'a banner image'}}
     * 
     */
    
    static async get(id, userHandle) {
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
        finalWeet.checks = {
            reweeted: await hasReweeted(id, userHandle),
            favorited: await hasFavorited(id, userHandle),
            tabbed: await hasTabbed(id, userHandle)
        }
        return finalWeet;
    }

    /** Creates a new weet in the backend and returns the new weet. Throws an error if an invalid author is provided.
     * 
     *      Weet.create('Another sample weet', 'handle2') => {id: 2, weet: 'Another sample weet', author: 'handle2', time_date: timestamp, date: 'January 20, 2017', time: '3:01 PM', stats: {reweets: 0, favorites: 0, tabs: 0}, userInfo: {username: 'user2', user_description: 'a user description', profile_image: 'a profile image', banner_image: 'a banner image'}}
     * 
     */

    static async create(weet, author, userHandle) {
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
        finalWeet.checks = {
            reweeted: await hasReweeted(finalWeet.id, userHandle),
            favorited: await hasFavorited(finalWeet.id, userHandle),
            tabbed: await hasTabbed(finalWeet.id, userHandle)
        }
        return finalWeet;
    }

    /** Edits an existing weet and returns the edited weet. Throws an error if an invalid weet id is provided. 
     * 
     *      Weet.edit(1, 'An edited weet') => {id: 1, weet: 'An edited weet', author: 'handle1', time_date: timestamp, date: 'January 21, 2017', time: '5:32 AM', stats: {reweets: 0, favorites: 0, tabs: 0}, userInfo: {username: 'user1', user_description: 'a user description', profile_image: 'a profile image', banner_image: 'a banner image'}}
     * 
    */

    static async edit(id, weet, userHandle) {
        const search = await Weet.get(id);

        if(!search){
            throw new ExpressError(
                `Weet cannot be found.`, 404
            )
        }

        const result = await db.query(
            `UPDATE weets
            SET weet = $1
            WHERE id = $2
            RETURNING *`,
            [weet, id]
        );

        const initWeet = result.rows[0];
        const finalWeet = convertTime(initWeet);
        finalWeet.stats = await getStats(finalWeet.id);
        finalWeet.userInfo = await getAuthor(finalWeet.author);
        finalWeet.checks = {
            reweeted: await hasReweeted(id, userHandle),
            favorited: await hasFavorited(id, userHandle),
            tabbed: await hasTabbed(id, userHandle)
        }
        return finalWeet;
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