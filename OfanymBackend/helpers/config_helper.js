const web3 = require("web3");
let mailgunConfig, twitterConfig, dbConfig, s3Config, web3Config;

if(!process.env.ENVIRONMENT){
    mailgunConfig = require('../config/mailgun.json');
    twitterConfig = require('../config/twitter.json');
    dbConfig = require('../config/db_config');
    s3Config = require('../config/s3config.json');
    web3Config = require('../config/web3.json');
}
else{
    mailgunConfig = {};
    twitterConfig = {};
    dbConfig = {};
    s3Config = {};
    web3Config = {};
}

const config = {
    mailgun: {
        key: process.env.MAILGUN_API_KEY || mailgunConfig.key,
        domain: process.env.MAILGUN_DOMAIN || mailgunConfig.domain,
        baseUrl: process.env.MAILGUN_BASE_URL || mailgunConfig.baseUrl
    },
    twitter: {
        key: process.env.TWITTER_API_KEY || twitterConfig.key,
        secret: process.env.TWITTER_API_SECRET || twitterConfig.secret
    },
    db: {
        client: "mysql",
        connection: {
            "host": process.env.PLANETSCALE_HOST || dbConfig.production && dbConfig.production.connection.host,
            "user": process.env.PLANETSCALE_USER || dbConfig.production && dbConfig.production.connection.user,
            "password": process.env.PLANETSCALE_PWD || dbConfig.production && dbConfig.production.connection.password,
            "database": process.env.PLANETSCALE_DB || dbConfig.production && dbConfig.production.connection.database,
            "ssl": {
                "rejectUnauthorized": false
            }
        }
    },
    s3: {
        apiVersion: process.env.AWS_API_VERSION || '2006-03-01',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || s3Config.accessKeyId,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || s3Config.secretAccessKey,
        region: process.env.AWS_REGION || s3Config.region,
        bucket: process.env.AWS_BUCKET || s3Config.bucket,
        endpoint: process.env.AWS_ENDPOINT || s3Config.endpoint
    },
    web3: {
        mnemonic: process.env.MNEMONIC.replace('*', ' ')|| web3Config.mnemonic,
        factoryAddress: process.env.FACTORY_ADDRESS || web3Config.factoryAddress,
        providerUrl: process.env.PROVIDER_URL || web3Config.providerUrl,
        platform: process.env.PLATFORM || web3Config.platform,
    }
}
console.log('mnemonic', config.web3.mnemonic);
module.exports = config;
