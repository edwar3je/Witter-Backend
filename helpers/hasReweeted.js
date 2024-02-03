const db = require('../db');

/** A helper function that determines whether a given account has reweeted a weet.
 *  Returns true if yes, false if no.
 * 
 *     hasReweeted(483, 'handle1') => true
 * 
 */

const hasReweeted = async (weetId, handle) => {
    const result = await db.query(
        `SELECT * FROM reweets WHERE weet_id = $1 AND user_id = $2;`,
        [weetId, handle]
    );

    return result.rows[0] !== undefined
}

module.exports = hasReweeted;