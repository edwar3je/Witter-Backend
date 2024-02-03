const db = require('../db');

/** A helper function that determines whether a given account has tabbed a weet.
 *  Returns true if yes, false if no.
 * 
 *     hasTabbed(483, 'handle1') => true
 * 
 */

const hasTabbed = async (weetId, handle) => {
    const result = await db.query(
        `SELECT * FROM tabs WHERE weet_id = $1 AND user_id = $2;`,
        [weetId, handle]
    );

    return result.rows[0] !== undefined
}

module.exports = hasTabbed;