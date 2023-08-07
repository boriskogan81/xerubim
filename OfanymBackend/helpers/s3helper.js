const AWS = require('aws-sdk');
const config = require('../config/s3config.json');

const s3Config = {
    apiVersion: process.env.AWS_API_VERSION || '2006-03-01',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || config.accessKeyId,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || config.secretAccessKey,
    region: process.env.AWS_REGION || config.region,
    bucket: process.env.AWS_BUCKET || config.bucket,
    endpoint: process.env.AWS_ENDPOINT || config.endpoint
    }
//const s3.json = new AWS.S3(s3Config);

module.exports.s3Config = s3Config;