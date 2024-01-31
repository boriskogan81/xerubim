const mailgunConfig = require('../config/mailgun.json');
const twitterConfig = require('../config/twitter.json');
const dbConfig = require('../config/db_config');
const s3Config = require('../config/s3config.json');
const web3Config = require('../config/web3.json');

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
        connection: process.env.JAWSDB_URL || dbConfig.production.connection,
        pool: {
            min: 2,
            max: 10
        },
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
        mnemonic: process.env.MNEMONIC || web3Config.mnemonic,
        factoryAddress: process.env.FACTORY_ADDRESS || web3Config.factoryAddress,
        providerUrl: process.env.PROVIDER_URL || web3Config.providerUrl,
        platform: process.env.PLATFORM || web3Config.platform,
    }
}

module.exports = config;