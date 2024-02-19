const express = require('express');
const app = express();
const ExpressError = require('./helpers/expressError');
const cors = require('cors');

/** This allows for other domains to make requests to the API */

app.use(cors());

/** This parses all incoming data as JSON */

app.use(express.json());

/** Relevant routes for API */

const accountRoutes = require('./routes/account');
const profileRoutes = require('./routes/profile');
const userRoutes = require('./routes/user');
const weetRoutes = require('./routes/weet');
const validateRoutes = require('./routes/validate');

app.use('/account', accountRoutes);
app.use('/profile', profileRoutes);
app.use('/users', userRoutes);
app.use('/weets', weetRoutes);
app.use('/validate', validateRoutes);

/** 404 error handler */

app.use((req, res, next) => {
    const err = new ExpressError('Not Found', 404);

    return next(err);
});

/** General error handler */

app.use((err, req, res, next) => {
    res.status(err.status || 500);

    return res.json({
        status: err.status,
        message: err.message
    });
});

module.exports = app;

