'use strict';
let dbConfig, knex;

if (process.env.JAWSDB_URL)
    dbConfig = {
        client: "mysql",
        connection: process.env.JAWSDB_URL
    };

if (process.env.KNEX_DEBUG)
    dbConfig.debug = true;

else if (process.env.NODE_ENV === 'test') {
    dbConfig = require('../config/db_config')['test'];
    knex = require('knex')(dbConfig);
    knex.processFlag = 'test';
} else {
    dbConfig = require('../config/db_config')['production'];
}

knex = require('knex')(dbConfig);

const upsert = require('bookshelf-upsert');

const bookshelf = require('bookshelf')(knex);
bookshelf.plugin('bookshelf-json-columns');
bookshelf.plugin(upsert);

module.exports.bookshelf = bookshelf;
module.exports.knex = knex;
