'use strict';
let dbConfig, knex;

if (process.env.ENVIRONMENT)
    dbConfig = {
        "client": "mysql",
        "connection": {
            "host": process.env.PLANETSCALE_HOST,
            "user": process.env.PLANETSCALE_USER,
            "password": process.env.PLANETSCALE_PWD,
            "database": process.env.PLANETSCALE_DB,
            "ssl": {
                "rejectUnauthorized": false
            }
        },
        "debug": true
    };
else if (process.env.NODE_ENV === 'test') {
    dbConfig = require('../config/db_config')['test'];
    knex = require('knex')(dbConfig);
    knex.processFlag = 'test';
}

if (process.env.KNEX_DEBUG)
    dbConfig.debug = true;

knex = require('knex')(dbConfig);

const upsert = require('bookshelf-upsert');

const bookshelf = require('bookshelf')(knex);
bookshelf.plugin('bookshelf-json-columns');
bookshelf.plugin(upsert);

module.exports.bookshelf = bookshelf;
module.exports.knex = knex;
