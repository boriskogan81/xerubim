const EthCrypto = require('eth-crypto');
const fs = require('fs');
const crypto = require('crypto');
const path = require("path");
const {subtle} = require('crypto').webcrypto;
const HDWalletProvider = require("@truffle/hdwallet-provider");
const Web3 = require("web3");
const config = require("../../OfanymFrontend/config/web3.json");
const mnemonicPhrase = config.mnemonic;
const compiledFactory = require('../../OfanymFrontend/ethereum/build/MediaContractFactory.json');
const compiledContract = require('../../OfanymFrontend/ethereum/build/MediaContract.json');
const Contract = require('../models/contract').model;
const ContractFactory = require('../models/contract_factory').model;
const Media = require('../models/media').model;
const ContractVersion = require('../models/smart_contract_version').model;
const knex = require('../bootstrap/bookshelf_instance').knex;
const Web3Storage = require('web3.storage');
const streamingS3 = require('streaming-s3');
const formidable = require('formidable');
const Transform = require('stream').Transform;
const s3Config = require('./s3helper').s3Config;
const {Upload} = require('@aws-sdk/lib-storage');
const {S3Client, PutObjectTaggingCommand } = require("@aws-sdk/client-s3");
const {PassThrough} = require("stream");
const {createEncryptStream, createDecryptStream, setPassword} = require('aes-encrypt-stream');
const {pipeline} = require('stream');
const {IncomingForm} = require("formidable");
const {scrypt, randomFill, createCipheriv} = require('node:crypto');
const multer = require("multer");
const openpgp = require('openpgp');

const storage = multer.memoryStorage()
const upload = multer({ storage });
const delay = (time) => {
    return new Promise(resolve => setTimeout(resolve, time));
}

function encrypt(algorithm, buffer, key, iv) {
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    const encrypted = Buffer.concat([cipher.update(buffer),cipher.final()]);
    return encrypted;
};

const client = new S3Client({
    region: s3Config.region,
    credentials: {
        accessKeyId: s3Config.accessKeyId,
        secretAccessKey: s3Config.secretAccessKey
    },
    //  endpoint: s3Config.endpoint
});

function getAccessToken() {
    return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweDI2RWE4N2I3OTlEY2QyYWFBNDBGQzFkMjNlOWM5MEZkZDMyM0E3NjMiLCJpc3MiOiJ3ZWIzLXN0b3JhZ2UiLCJpYXQiOjE2NjMyNDkzMjgwMjcsIm5hbWUiOiJYZXJ1YmltU2FuZGJveCJ9.9PiUVskWavMIJcOvHkBspvvQNGM2QaN0m3rxr19D8fE'
    //return process.env.WEB3STORAGE_TOKEN
}

function makeStorageClient() {
    return new Web3Storage.Web3Storage({token: getAccessToken()})
}

let provider = new HDWalletProvider({
    mnemonic: {
        phrase: mnemonicPhrase
    },
    providerOrUrl: "https://goerli.infura.io/v3/3aab413e2af7425796d7100d42dc889a",
    networkCheckTimeout: 100000,
    timeoutBlocks: 200
});

const web3 = new Web3(provider);

const saveFile = async (key, fileName, inputFilePath, encrypted, contractAddress, buyerKey) => {
    try {
        // const input = fs.createReadStream(inputFilePath);
        // const hash = crypto.createHash('sha256');
        // hash.setEncoding('hex');
        // let fileHash = '';
        // input.on('end', function() {
        //     hash.end();
        //     console.log(hash.read());
        //     fileHash = hash.read();
        // });
        //
        // input.pipe(hash);
        //
        // const existingMedia = await new Media()
        //     .where({'hash': fileHash})
        //     .fetch({require: false});
        // if (existingMedia)
        //     return
        //
        // const cryptoKey = await subtle.generateKey({name: 'AES-GCM', length: 256}, true, ['encrypt', 'decrypt']);
        // const key = await subtle.exportKey('raw', cryptoKey);
        // const buyerEncryptedKey = await EthCrypto.encryptWithPublicKey(buyerKey, String(key));
        // const iv = crypto.randomBytes(16);
        // const cipher = crypto.createCipheriv('aes-256-ctr', key, iv, null);
        // setPassword(new Buffer(key));
        const inputFileStream = fs.createReadStream(inputFilePath);

        const uploader = new streamingS3(createEncryptStream(inputFileStream), {
                accessKeyId: s3Config.accessKeyId,
                secretAccessKey: s3Config.secretAccessKey
            },
            {
                Bucket: s3Config.bucket,
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
        });

        uploader.on('finished', function (resp, stats) {
            console.log('Upload finished: ', resp);
        });

        uploader.on('error', function (e) {
            console.log('Upload error: ', e);
        });

        uploader.begin();
        // const storage = makeStorageClient();
        // const keyString = new Int32Array(key).toString();
        // await knex.raw(`INSERT INTO crypto (buyerEncryptedKey, iv, hash, contractAddress, keystring) VALUES (\'${encrypted}\', \'${iv.toString('hex')}\',\'${hash}\', \'${contractAddress}\', \'${keyString}\')`)
        return fileName

    } catch (e) {
        console.log(e);
        throw e;
    }
}

const decryptFile = async (privateKey, keyObject, inputFilePath, outputFilePath, fileName) => {
    try {
        const decryptedKey = await EthCrypto.decryptWithPrivateKey(privateKey, keyObject);

        // const iv = redis.hget(key, 'iv');
        const decipher = crypto.createDecipheriv('aes-256-ctr', decryptedKey, iv, null);
        const input = fs.createReadStream(inputFilePath);
        const output = fs.createWriteStream(path.join(outputFilePath, fileName));

        input.pipe(decipher).pipe(output);

        output.on('finish', function () {
            console.log('Decrypted file written to disk!');
        });
    } catch (error) {
        console.log(error)
    }
}

//TODO add logic to sync array of contracts
const ingestContracts = async () => {
    //TODO refactor to use stored ABI and address
    const factory = await new web3.eth.Contract(
        compiledFactory.abi,
        config.factoryAddress
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
    } catch (e) {
        console.log(e);
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
                    raw += ` AND (ST_INTERSECTS(ST_GeomFromText("POLYGON((${corners[0]} ${corners[1]}, ${corners[0]} ${corners[3]}, ${corners[2]} ${corners[3]}, ${corners[2]} ${corners[1]}, ${corners[0]} ${corners[1]}))", 4326), contract.coordinates))`
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

    return {
        contracts: newContracts,
        pagination: newContracts.pagination
    };
};

const storeSignature = async (signature, address) => {
    try {
        await knex.raw(`INSERT INTO signature (signature, address) VALUES (\'${signature}', '${address}')`)
    } catch (e) {
        console.log(e)
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
    } catch (e) {
        console.log(e)
    }
}

const decryptWithPrivateKey = async (ciphertext, privateKey) => {
    try {
        const decrypted = await EthCrypto.decryptWithPrivateKey(privateKey, EthCrypto.cipher.parse(ciphertext));
        return decrypted;
    } catch (e) {
        console.log(e)
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
        const message = await openpgp.createMessage({text: 'stringKey'});
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
                            "Bucket": s3Config.bucket,
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
                        Bucket: s3Config.bucket,
                        Body: cipher,
                        Region: s3Config.region
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
                return body;
            } catch (e) {
                console.log(e);
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
    return { buyerEncryptedKey, buyerPublicKey, buyerPrivateKey};
}

const savePublicKey = async (req) => {
    try{
        await knex.raw(`INSERT INTO public_key (publicKey, privateKey, location, expiration, account) VALUES (\'${req.body.publicKey}',  '${req.body.privateKey}', '${req.body.contractLocation}', '${req.body.expirationDate}', '${req.body.account}')`)
    }
    catch(e) {
        console.log(e);
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
    savePublicKey
};
