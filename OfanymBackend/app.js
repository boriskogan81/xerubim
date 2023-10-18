'use strict';

process.on('uncaughtException', function (e) {
    console.log('An error has occured. error is: %s and stack trace is: %s', e, e.stack);
    console.log('Process will restart now.');
    process.exit(1);
});

// This is useful for relative paths to root
global.__base = __dirname + '/';

require('./global_functions');
const PORT = process.env.PORT || 8080;

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');

const indexRouter = require('./routes/index');
const { logger, contextMiddleware } = require('./logger.js');

const app = express();
app.use(contextMiddleware);

const cors = require('cors');
const {listenerSetup} = require("./listener");
const listener = require('./listener').listenerSetup();

app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
})
app.use(cors({ origin: 'http://localhost:9000'}))
app.use('/', indexRouter);
app.listen(PORT, () => {
    logger.info(`Server listening at http://localhost:${PORT}`);
});
listenerSetup()

module.exports = app;
