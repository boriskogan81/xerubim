const EthCrypto = require('eth-crypto');
const fs = require('fs');
const crypto = require('crypto');
const {subtle} = require('crypto').webcrypto;
const HDWalletProvider = require("@truffle/hdwallet-provider");
const Web3 = require("web3");
const config = require('./config_helper');
const mnemonicPhrase = config.web3.mnemonic;
const providerUrl = config.web3.providerUrl;
const compiledFactory = require('../ethereum/build/MediaContractFactory.json');
const compiledContract = require('../ethereum/build/MediaContract.json');
const Contract = require('../models/contract').model;
const knex = require('../bootstrap/bookshelf_instance').knex;
const streamingS3 = require('streaming-s3');
const formidable = require('formidable');
const {Upload} = require('@aws-sdk/lib-storage');
const {S3Client, PutObjectTaggingCommand } = require("@aws-sdk/client-s3");
const {PassThrough} = require("stream");
const {createEncryptStream} = require('aes-encrypt-stream');
const openpgp = require('openpgp');
const Mailgun = require('mailgun-js');
const mailgun = new Mailgun({apiKey: config.mailgun.key, domain: config.mailgun.domain});
const {logger} = require('../logger');

const client = new S3Client({
    region: config.s3.region,
    credentials: {
        accessKeyId: config.s3.accessKeyId,
        secretAccessKey: config.s3.secretAccessKey
    },
    //  endpoint: s3Config.endpoint
});




let provider = new HDWalletProvider({
    mnemonic: {
        phrase: mnemonicPhrase
    },
    providerOrUrl: providerUrl,
    networkCheckTimeout: 100000,
    timeoutBlocks: 200
});

const web3 = new Web3(provider);

const saveFile = async (key, fileName, inputFilePath) => {
    try {
        const inputFileStream = fs.createReadStream(inputFilePath);

        const uploader = new streamingS3(createEncryptStream(inputFileStream), {
                accessKeyId: config.s3.accessKeyId,
                secretAccessKey: config.s3.secretAccessKey
            },
            {
                Bucket: config.s3.bucket,
                Key: hash
            }
        );

        uploader.on('data', function (bytesRead) {
            console.log(bytesRead, ' bytes read.');
        });

        uploader.on('part', function (number) {
            console.log('Part ', number, ' uploaded.');
        });

        // All parts uploaded, but upload not yet acknowledged.
        uploader.on('uploaded', function (stats) {
            console.log('Upload stats: ', stats);
            logger.info(`File ${fileName} uploaded to S3`, {stats})
        });

        uploader.on('finished', function (resp, stats) {
            console.log('Upload finished: ', resp);
            logger.info(`File ${fileName} upload finished`, {resp})
        });

        uploader.on('error', function (e) {
            console.log('Upload error: ', e);
            logger.error(`File ${fileName} upload error`, {e})
        });

        uploader.begin();
        return fileName

    } catch (e) {
        console.log(e);
        throw e;
    }
}

//TODO add logic to sync array of contracts
const ingestContracts = async () => {
    //TODO refactor to use stored ABI and address
    const factory = await new web3.eth.Contract(
        compiledFactory.abi,
        config.web3.factoryAddress
    );
    const contractAddresses = await factory.methods.getDeployedContracts().call();

    await Promise.all(contractAddresses.map(async (contractAddress) => {
        try {
            const cachedContract = await new Contract()
                .where({'address': contractAddress})
                .fetch({require: false});
            if (!cachedContract) {
                await ingestContractByAddress(contractAddress)
            }
        } catch (e) {
            console.log(e);
            logger.error(e, 'Ingest contract failed');
        }
    }))
}

const syncContractByAddress = async (address) => {
    //TODO refactor to use stored ABI and address
    try {
        const contract = await new web3.eth.Contract(
            compiledContract.abi,
            address
        );

        const data = await contract.methods.getSummary().call();

        await new Contract()
            .where({'address': address})
            .upsert({data});
    } catch (e) {
        console.log(e);
        logger.error(e, 'Sync contract failed');
    }

}

const ingestContractByAddress = async (address) => {
    try {
        const contract = await new web3.eth.Contract(
            compiledContract.abi,
            address
        );

        const data = await contract.methods.getSummary().call();

        const geoString = (polygon) => {
            const arrayed = JSON.parse((polygon))
            let prepped = '';
            arrayed.forEach(subArray => {
                prepped = prepped + subArray[0] + ' ' + subArray[1] + ', '
            })

            prepped = 'ST_GeomFromText("POLYGON((' + prepped.slice(0, -2) + '))", 4326)'
            return prepped;
        }

        await knex.raw(`INSERT INTO contract(data, address, coordinates,  smart_contract_version_id) VALUES (\'${JSON.stringify(data)}\', \'${address}\',  ${geoString(data[10])}, 1)`);
        logger.info(`Contract ${address} ingested`, {data})
    } catch (e) {
        console.log(e);
        logger.error(e, 'Ingest contract failed');
    }

}

const retrieveContracts = async (query) => {

    let {pageSize, page, corners, customerAddress, reporterAddress, addresses, orderBy, desc, searchString, timeliness} = query;

    if (pageSize)
        pageSize = parseInt(pageSize);

    if (page)
        page = parseInt(page);


    if (orderBy && desc)
        orderBy = `-${orderBy}`;


    const cachedContracts = async (corners, searchString, reporterAddress, customerAddress, orderBy, pageSize, page) => {
        const contracts = await new Contract()
            .query((qb) => {
                raw = 'contract.id != 0'
                if (corners)
                    raw += ` AND (ST_INTERSECTS(ST_GeomFromText("POLYGON((${corners[1]} ${corners[0]}, ${corners[3]} ${corners[0]}, ${corners[3]} ${corners[2]}, ${corners[1]} ${corners[2]}, ${corners[1]} ${corners[0]}))", 4326, "axis-order=lat-long"), contract.coordinates))`
                if (searchString) {
                    raw += ` AND (contract.data->'$' LIKE "%${searchString}%")`
                }
                if (reporterAddress) {
                    raw += ` AND (contract.data->'$.1' LIKE "%${searchString}%")`
                }
                if (customerAddress) {
                    raw += ` AND (contract.data->'$.0' LIKE "%${searchString}%")`
                }
                if(timeliness === 'expired')
                    raw += ` AND CAST(JSON_EXTRACT(contract.data, \'$."5"\') AS UNSIGNED) <= UNIX_TIMESTAMP(NOW())`
                else if(timeliness === 'all')
                    raw += ` AND CAST(JSON_EXTRACT(contract.data, \'$."5"\') AS UNSIGNED) > 0`
                else
                    raw += ` AND CAST(JSON_EXTRACT(contract.data, \'$."5"\') AS UNSIGNED) > UNIX_TIMESTAMP(NOW())`

                qb
                    .whereRaw(raw);
            })
            .orderBy(orderBy || '-address')
            .fetchPage({
                pageSize: pageSize || 10, // Defaults to 10 if not specified
                page: page || 1
            });
        logger.info(`Contracts retrieved`, {contracts})
        return contracts;
    }

    const oldContracts = await cachedContracts(corners, searchString, reporterAddress, customerAddress, orderBy, pageSize, page);

    const updatedContracts = oldContracts.models.map(async (model) => {
        const ethContract = await new web3.eth.Contract(
            compiledContract.abi,
            model.attributes.address
        );
        const data = await ethContract.methods.getSummary().call();
        return await knex.raw(`UPDATE contract SET data = \'${JSON.stringify(data)}\' WHERE address = \'${model.attributes.address}\'`);
    })

    await Promise.all(updatedContracts);
    const newContracts = await cachedContracts(corners, searchString, reporterAddress, customerAddress, orderBy, pageSize, page);
    logger.info(`Contracts retrieved`, {newContracts})
    return {
        contracts: newContracts,
        pagination: newContracts.pagination
    };
};

const storeSignature = async (signature, address) => {
    try {
        await knex.raw(`INSERT INTO signature (signature, address) VALUES (\'${signature}', '${address}')`)
    } catch (e) {
        console.log(e);
        logger.error(e, 'Store signature failed');
    }
}

const encryptWithSignature = async (plaintext, address, contractAddress, type) => {
    try {
        const signatureQuery = await knex.raw(`SELECT signature FROM signature where address = \'${address}\' LIMIT 1`);
        const signature = signatureQuery[0][0].signature;
        const publicKey = EthCrypto.recoverPublicKey(
            signature,
            EthCrypto.hash.keccak256('\x19Ethereum Signed Message:\n' + 'Signature verification for video file encryption'.length + 'Signature verification for video file encryption')
        );
        const encryptedObject = await EthCrypto.encryptWithPublicKey(publicKey, plaintext);

        if(type === 'customer')
            await knex.raw(`INSERT INTO crypto (contractAddress, buyerEncryptedKey) VALUES (\'${contractAddress}\', \'${JSON.stringify(encryptedObject)}\')`)
        logger.info(`Encrypted with signature`, {encryptedObject})
    } catch (e) {
        console.log(e)
        logger.error(e, 'Encrypt with signature failed');
    }
}

const decryptWithPrivateKey = async (ciphertext, privateKey) => {
    try {
        const decrypted = await EthCrypto.decryptWithPrivateKey(privateKey, EthCrypto.cipher.parse(ciphertext));
        logger.info(`Decrypted with private key`, {decrypted})
        return decrypted;
    } catch (e) {
        console.log(e)
        logger.error(e, 'Decrypt with private key failed');
    }
}

const parseFile = async (req) => {
    const keys = [];
    const contract = new web3.eth.Contract(compiledContract.abi,req.query.address);
    const contractStatus = await contract.methods.status().call();
    if(contractStatus !== 'open')
        throw 'Contract is not open'

    const contractCustomer = await contract.methods.customer().call();

    return new Promise(async (resolve, reject) => {
        //get stored contract from Knex
        const contractQuery = await knex.raw(`SELECT data FROM contract where address = \'${req.query.address}\' LIMIT 1`);
        const contractData = JSON.parse(contractQuery[0][0].data);
        const contractCustomer = contractData["0"];
        const contractLocation = JSON.parse(contractData["10"]).flat(2);
        //get public key from contract location and account
        let customerPublicKey = await knex.raw(`SELECT publicKey FROM public_key WHERE location = \'${contractLocation}\' AND account = \'${contractCustomer}\' LIMIT 1`);
        let publicKeyUpdate = await knex.raw(`UPDATE public_key SET address = '${req.query.address}' WHERE location = \'${contractLocation}\' AND account = \'${contractCustomer}\'`);
        customerPublicKey = customerPublicKey[0][0].publicKey;
        customerPublicKey = await openpgp.readKey({armoredKey: customerPublicKey});
        const CryptoAlgorithm = "aes-256-gcm";
        const iv = crypto.getRandomValues(new Uint8Array(16));
        const key = await subtle.generateKey({
                name: "AES-GCM",
                length: 256,
            },
            true,
            ["encrypt", "decrypt"]
        )
        let stringKey = await subtle.exportKey('raw',key);
        stringKey = Buffer.from(stringKey).toString('base64');
        //encrypt string key with public key
        const message = await openpgp.createMessage({text: stringKey});
        const encrypted = await openpgp.encrypt({
            message, // input as Message object
            encryptionKeys: customerPublicKey
        });
        //store string key in Knex as buyerencryptedkey in crypto table
        await knex.raw(`INSERT INTO crypto (buyerEncryptedKey, contractAddress) VALUES (\'${encrypted}', '${req.query.address}')`)
        //update contract address in public key table
        await knex.raw(`UPDATE public_key SET address = '${req.query.address}' WHERE location = \'${contractLocation}\' AND account = \'${contractCustomer}\'`);
        const stringIv = Buffer.from(iv).toString('base64');
        const s3Uploads = [];
        const taggingInputs = [];
        const taggingRequests = [];
        const fileWriteStreamHandler = (file) => {
            try {
                const body = new PassThrough();
                const cipher = crypto.createCipheriv(CryptoAlgorithm, key, iv);
                let authTag;
                const s3Key = `files/${Date.now().toString()}-${file.originalFilename}`;
                knex.raw(`INSERT INTO filekeys ('keystring', 'location') VALUES (\'${stringKey}\', \'${s3Key}\')`)
                body.pipe(cipher);
                cipher.on('end', async () => {
                    try{
                        authTag =  cipher.getAuthTag().toString('base64');
                        const input = {
                            "Bucket": config.s3.bucket,
                            "Key": s3Key,
                            "Tagging": {
                                "TagSet": [
                                    {
                                        "Key": "iv",
                                        "Value": stringIv
                                    },
                                    {
                                        "Key": "authTag",
                                        "Value": authTag
                                    }
                                ]
                            }
                        };
                        taggingInputs.push(input);
                        keys.push(s3Key);
                    }
                    catch(e){
                        console.log('tagging failure:', e);
                    }

                })

                const upload = new Upload({
                    client, params: {
                        Key: s3Key,
                        ContentType: file.mimetype,
                        Bucket: config.s3.bucket,
                        Body: cipher,
                        Region: config.s3.region
                    },
                    queueSize: 4,
                    partSize: 1024 * 1024 * 5,
                    leavePartsOnError: false
                });
                const uploadRequest = upload.done()
                    .then((response) => {
                        file.location = response.Location;
                    })
                    .catch(
                        function (error) {
                            console.log(error.message)
                            reject(error)
                        }
                    );

                s3Uploads.push(uploadRequest);
                logger.info(`File ${file.originalFilename} uploaded to S3`, {file})
                return body;
            } catch (e) {
                console.log(e);
                logger.error(e, 'File upload failed');
                throw e;
            }
        }


        const form = formidable({
            multiples: true,
            fileWriteStreamHandler
        });

        form.parse(req, (error, fields, files) => {
            if (error) {
                reject(error);
                return;
            }

            Promise.all(s3Uploads)
                .then(async () => {
                    taggingInputs.forEach((input) => {
                        taggingRequests.push(
                            new Promise((resolve, reject) => {
                                const command = new PutObjectTaggingCommand(input);
                                client.send(command, (err, data) => {
                                    if (err) {
                                        console.log('tagging error: ', err);
                                        reject(err);
                                    }
                                    else {
                                        console.log('tagging success: ', data);
                                        resolve(data);
                                    }
                                });
                            })
                        );
                    })
                    await Promise.all(taggingRequests);
                    resolve(keys);
                })
                .catch(function (error) {
                        console.log(error.message)
                        reject(error)
                    }
                );
        });

    });
}

const retrieveBuyerEncryptedKey = async (query) => {
    let {contractAddress} = query;
    const keyQuery = await knex.raw(`SELECT buyerEncryptedKey FROM crypto where contractAddress = \'${contractAddress}\' LIMIT 1`);
    const buyerEncryptedKey = keyQuery[0][0].buyerEncryptedKey;
    const buyerKeys = await knex.raw(`SELECT publicKey, privateKey FROM public_key WHERE address = \'${contractAddress}\' LIMIT 1`);
    const buyerPublicKey = buyerKeys[0][0].publicKey;
    const buyerPrivateKey = buyerKeys[0][0].privateKey;
    logger.info(`Buyer key retrieved`, {buyerEncryptedKey, buyerPublicKey, buyerPrivateKey})
    return { buyerEncryptedKey, buyerPublicKey, buyerPrivateKey};
}

const savePublicKey = async (req) => {
    try{
        await knex.raw(`INSERT INTO public_key (publicKey, privateKey, location, expiration, account) VALUES (\'${req.body.publicKey}',  '${req.body.privateKey}', '${req.body.contractLocation}', '${req.body.expirationDate}', '${req.body.account}')`)
    }
    catch(e) {
        console.log(e);
        logger.error(e, 'Save public key failed');
    }
}

const contractSubscriptions = async (req) => {
    try{
        const exists = await knex.raw(`SELECT * FROM event_subscriptions WHERE contractAddress = \'${req.body.contractAddress}' AND email = '${req.body.email}' LIMIT 1`);
        if(exists[0].length === 0)
            return await knex.raw(`INSERT INTO event_subscriptions (contractAddress, email) VALUES (\'${req.body.contractAddress}',  '${req.body.email}')`)
        else
            throw 'Subscription already exists'
    }
    catch(e) {
        console.log(e);
        logger.error(e, 'Contract subscription failed');
        throw e
    }
}

const contractCentroid = async (req) => {
    try{
        const contractQuery = await knex.raw(`SELECT ST_Centroid(ST_GeomFromText(ST_AsText(coordinates))) FROM contract where address = \'${req.body.contractAddress}\' LIMIT 1`);
        const coordinates = contractQuery[0][0]['ST_Centroid(ST_GeomFromText(ST_AsText(coordinates)))'];
        return coordinates;
    }
    catch(e) {
        console.log(e);
        logger.error(e, 'Contract centroid failed');
        throw e
    }
};

const retrieveNonce = async (req) => {
    try{
        const nonceQuery = await knex.raw(`SELECT nonce FROM users where address = \'${req.query.address}\' LIMIT 1`);
        let nonce;
        if(!nonceQuery[0].length){
            nonce = generateRandomString(32)
            await knex.raw(`INSERT INTO users (address, nonce) VALUES (\'${req.query.address}',  '${nonce}')`)
        }
        else
            nonce = nonceQuery[0][0].nonce;
        return nonce;
    }
    catch(e) {
        console.log(e)
        logger.error(e, 'Retrieve nonce failed');
        throw e
    }
};

const verifySignature = async (address, signature) => {
    try{
        const nonceQuery = await knex.raw(`SELECT nonce FROM users WHERE address = \'${address}\' LIMIT 1`);
        const nonce = nonceQuery[0][0].nonce;
        const recoveredAddress =  web3.eth.accounts.recover(nonce, signature);
        if(recoveredAddress.toLowerCase() === address.toLowerCase()){
            await knex.raw(`UPDATE users SET nonce = \'${generateRandomString(32)}\' WHERE address = \'${address}\'`)
            return true;
        }
        else
            return false;
    }
    catch(e) {
        console.log(e);
        logger.error(e, 'Verify signature failed');
        throw e
    }

}

const retrieveMessages = async (req) => {
    try{
        const searchString = req.query.searchString ? ` AND (title LIKE "%${req.query.searchString}%" OR text LIKE "%${req.query.searchString}%")` : '';
        const inboxMessages = await knex.raw(`SELECT * FROM messages WHERE \`to\` = \'${req.query.address}\' ${searchString} AND deleted = 0 ORDER BY timestamp DESC LIMIT 10 OFFSET ${req.query.currentInbox}`);
        const sentMessages = await knex.raw(`SELECT * FROM messages WHERE \`from\` = \'${req.query.address}\' ${searchString} ORDER BY timestamp DESC LIMIT 10 OFFSET ${req.query.currentSent}`);
        logger.info(`Messages retrieved`, {inboxMessages, sentMessages})
        return {
            inboxMessages: inboxMessages[0],
            sentMessages: sentMessages[0]
        }
    }
    catch(e) {
        console.log(e);
        logger.error(e, 'Retrieve messages failed');
        throw e
    }
};

const saveMessage = async (req) => {
    try{
        const message = req.body.message;
        await knex.raw(`INSERT INTO messages (\`to\`, \`from\`, title, text, contract, responseTo, timestamp) VALUES (\'${message.to}', \'${req.body.address}',  '${message.title}', '${message.text}', '${message.contract}', '${message.responseTo}', '${new Date().getTime()}')`)
        const exists = await knex.raw(`SELECT * FROM email_subscriptions WHERE address = \'${message.to}'`);
        if(exists[0].length !== 0){
            const subscription = exists[0][0]
            const ofanymURL = `${config.mailgun.baseURL}`;
            const data = {
                from: `Ofanym <postmaster@${config.mailgun.domain}>`,
                to: subscription.email,
                subject: "New Message At Ofanym",
                template: "Message Notification\n",
                'h:X-Mailgun-Variables': JSON.stringify({
                    ofanymURL: ofanymURL
                })
            }
            mailgun.messages().send(data, function (error, body) {
                console.log(body);
            });
        }
        logger.info(`Message saved`, {message})
        return true;
    }
    catch(e) {
        console.log(e);
        logger.error(e, 'Save message failed');
        throw e
    }
}

const generateRandomString = (length) => {
    let result = '';
    const characters =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
};

const markMessageRead = async (req) => {
    try{
        const message = await knex.raw(`UPDATE messages SET \`read\` = 1 WHERE id = \'${req.body.id}' AND \`to\` = \'${req.body.address}'`)
        return true;
    }
    catch(e) {
        console.log(e);
        logger.error(e, 'Mark message read failed');
        throw e
    }
}

const messageDelete = async (req) => {
    try{
        if(!await verifySignature(req.body.address, req.body.signature))
            throw 'Invalid signature'
        const message = await knex.raw(`UPDATE messages SET \`deleted\` = 1 WHERE id = \'${req.body.id}' AND \`to\` = \'${req.body.address}'`)
        return true;
    }
    catch(e) {
        console.log(e);
        logger.error(e, 'Message deletion failed');
        throw e
    }
}

const messageSubscribe = async (req) => {
    try{
        const exists = await knex.raw(`SELECT * FROM email_subscriptions WHERE address = \'${req.body.address}'`);
        if(exists[0].length !== 0)
            return await knex.raw(`UPDATE email_subscriptions SET  \`email\` = \'${req.body.email}' WHERE address = \'${req.body.address}'`);
        else
            return await knex.raw(`INSERT INTO email_subscriptions (address, email) VALUES (\'${req.body.address}',  '${req.body.email}')`)

    }
    catch(e) {
        console.log(e);
        logger.error(e, 'Message subscription failed');
        throw e
    }
}

module.exports = {
    saveFile,
    ingestContractByAddress,
    ingestContracts,
    retrieveContracts,
    storeSignature,
    encryptWithSignature,
    decryptWithPrivateKey,
    parseFile,
    retrieveBuyerEncryptedKey,
    savePublicKey,
    contractSubscriptions,
    contractCentroid,
    retrieveNonce,
    verifySignature,
    retrieveMessages,
    saveMessage,
    markMessageRead,
    messageDelete,
    messageSubscribe
};
