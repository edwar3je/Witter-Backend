const db = require('../db');

const ExpressError = require('./expressError');

/** Calculates the total number of reweets, favorites and tabs for a given weet.
 * 
 *      getStats(481) => {reweets: 0, favorites: 15, tabs: 7}
 * 
 */

const getStats = async (weetId) => {
    const check = await db.query(`SELECT * FROM weets WHERE id = $1`, [weetId]);

    if(check.rows[0] === undefined){
        throw new ExpressError(`The weet does not appear to exist`, 404)
    }

    const finalResult = {};

    const reweets = await db.query(`SELECT * FROM reweets WHERE weet_id = $1`, [weetId]);
    const favorites = await db.query(`SELECT * FROM favorites WHERE weet_id = $1`, [weetId]);
    const tabs = await db.query(`SELECT * FROM tabs WHERE weet_id = $1`, [weetId]);

    finalResult.reweets = reweets.rows.length;
    finalResult.favorites = favorites.rows.length;
    finalResult.tabs = tabs.rows.length;

    return finalResult;
}

module.exports = getStats;