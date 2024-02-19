/** A helper function consisting of a class that extends the existing Error class. Primarily used to
 *  build custom errors with an appropriate message and status.
 */

class ExpressError extends Error {
    constructor(message, status) {
        super();
        this.message = message;
        this.status = status;
        if(process.env.NODE_ENV !== 'test'){
            console.error(this.stack);
        }
    }
}

module.exports = ExpressError;