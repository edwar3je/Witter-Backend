const ExpressError = require('./expressError');

const convertTime = (query) => {
    if(typeof(query) !== 'object' || !query || query.time_date === undefined || typeof(query.time_date) !== 'object'){
        throw new ExpressError('Invalid data provided', 403)
    }

    query.date = query.time_date.toLocaleDateString('en-US', {month: 'long', year: 'numeric', day: 'numeric', timeZone: 'EST'});
    query.time = query.time_date.toLocaleTimeString('en-US', {hour: 'numeric', minute: 'numeric', hour12: true, timeZone: 'EST'});;

    return query
}

module.exports = convertTime;