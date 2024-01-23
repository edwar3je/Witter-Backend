const express = require('express');
const app = express();
const ExpressError = require('./helpers/expressError');

/** This parses all incoming data as JSON */

app.use(express.json());

/** Insert routes using require, followed by app.use (should include two arguments: the 'endpoint' and the variable leading to the routes) */

const accountRoutes = require('./routes/account');
const profileRoutes = require('./routes/profile');
const weetRoutes = require('./routes/weets');

app.use('/account', accountRoutes);
app.use('/profile', profileRoutes);
app.use('/weet', weetRoutes);

/** Include error handler down below, followed by general error handler */

app.use(function(req, res, next) {
    const err = new ExpressError('Not Found', 404);

    return next(err);
});

app.use(function(err, req, res, next) {
    res.status(err.status || 500);

    return res.json({
        status: err.status,
        message: err.message
    });
});

module.exports = app;

