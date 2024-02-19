const ExpressError = require('./expressError');

/** A helper function that examines a timestamp within an object and adds two keys with the following values:
 *     1.) A string representing the date of the timestamp (query.date)
 *     2.) A string representing the time of the timestamp (query.time)
 * 
 *         convertTime({ time_date: '2024-02-19 14:00:19.100926-05'}) => { time_date: '2024-02-19 14:00:19.100926-05', time: '2:00 PM', date: 'February 19, 2024'}
 * 
 */

const convertTime = (query) => {
    if(typeof(query) !== 'object' || !query || query.time_date === undefined || typeof(query.time_date) !== 'object'){
        throw new ExpressError('Invalid data provided', 403)
    }

    query.date = query.time_date.toLocaleDateString('en-US', {month: 'long', year: 'numeric', day: 'numeric', timeZone: 'EST'});
    query.time = query.time_date.toLocaleTimeString('en-US', {hour: 'numeric', minute: 'numeric', hour12: true, timeZone: 'EST'});;

    return query
}

module.exports = convertTime;