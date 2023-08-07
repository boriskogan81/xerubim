let dbConfig, config;

if (process.env.JAWSDB_URL)
    dbConfig = {
        client: "mysql",
        connection: process.env.JAWSDB_URL
    };

else {
    dbConfig = require('./config/db_config');
    if (process.env.NODE_ENV === 'test') {
        config = dbConfig.test;
        dbConfig.test.pool['idleTimeoutMillis'] = Infinity;
    } else
        config = dbConfig.production;
}

module.exports = config;
