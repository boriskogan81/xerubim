'use strict';

process.on('uncaughtException', function (e) {
    console.log('An error has occured. error is: %s and stack trace is: %s', e, e.stack);
    console.log('Process will restart now.');
    process.exit(1);
});

// This is useful for relative paths to root
global.__base = __dirname + '/';

require('./global_functions');

var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
})
app.use('/', indexRouter);
app.listen(8080)

module.exports = app;
