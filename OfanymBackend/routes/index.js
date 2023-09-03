const express = require('express');
const router = express.Router();
const EthCrypto = require('eth-crypto');
const fs = require('fs');
const crypto = require('crypto');
const {subtle} = require('crypto').webcrypto;
const path = require('path');
const unencrypted = path.join(__dirname, '../unencrypted');
const encrypted = path.join(__dirname, '../encrypted/');
const decrypted = path.join(__dirname, '../decrypted/');
const saveFile = require('../helpers/helpers').saveFile;
const parseFile = require('../helpers/helpers').parseFile;
const helpers = require('../helpers/helpers')
const {knex} = require("../bootstrap/bookshelf_instance");
const {model: Contract} = require("../models/contract");
const {model: Media} = require("../models/media");
const {setPassword, createEncryptStream} = require("aes-encrypt-stream");
const streamingS3 = require("streaming-s3");
const s3Config = require("../config/s3config.json");

const savePlain = async (key, fileName, inputFilePath, encrypted, contractAddress, buyerKey) => {
    try {
        const input = fs.createReadStream(inputFilePath);
        const hash = crypto.createHash('sha256');
        hash.setEncoding('hex');
        let fileHash = '';
        input.on('end', function() {
            hash.end();
            console.log(hash.read());
            fileHash = hash.read();
        });

        input.pipe(hash);

        // const existingMedia = await new Media()
        //     .where({'hash': fileHash})
        //     .fetch({require: false});
        // if (existingMedia)
        //     return

        // const cryptoKey = await subtle.generateKey({name: 'AES-GCM', length: 256}, true, ['encrypt', 'decrypt']);
        // const key = await subtle.exportKey('raw', cryptoKey);
        // const buyerEncryptedKey = await EthCrypto.encryptWithPublicKey(buyerKey, String(key));
        // const iv = crypto.randomBytes(16);
        // const cipher = crypto.createCipheriv('aes-256-ctr', key, iv, null);
        // setPassword(new Buffer(key));
        const inputFileStream = fs.createReadStream(inputFilePath);

        const uploader = new streamingS3(createEncryptStream(inputFileStream), {accessKeyId: s3Config.accessKeyId, secretAccessKey: s3Config.secretAccessKey},
            {
                Bucket: s3Config.bucket,
                Key: hash
            }
        );

        uploader.on('data', function(bytesRead) {
            console.log(bytesRead, ' bytes read.');
        });

        uploader.on('part', function(number) {
            console.log('Part ', number, ' uploaded.');
        });

        // All parts uploaded, but upload not yet acknowledged.
        uploader.on('uploaded', function(stats) {
            console.log('Upload stats: ', stats);
        });

        uploader.on('finished', function(resp, stats) {
            console.log('Upload finished: ', resp);
        });

        uploader.on('error', function(e) {
            console.log('Upload error: ', e);
        });

        uploader.begin();

        return cid

    } catch (e) {
        console.log(e);
        throw e;
    }
}



router.post('/encrypt', async (req, res) => {
    try {
        const {buyerKey, sellerKey} = req.body;
        const cryptoKey = await subtle.generateKey({name: 'AES-GCM', length: 256}, true, ['encrypt', 'decrypt']);
        const key = await subtle.exportKey('raw', cryptoKey);
        const buyerEncryptedKey = await EthCrypto.encryptWithPublicKey(buyerKey, String(key));
        const sellerEncryptedKey = await EthCrypto.encryptWithPublicKey(sellerKey, String(key));
        const encryptedKeys = {
            buyerEncryptedKey,
            sellerEncryptedKey
        }

        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-ctr', key, iv, null);
        const input = fs.createReadStream('C:\\Users\\b_kog\\Projects\\OfanymBackend\\unencrypted\\unencrypted.mp4');
        const output = fs.createWriteStream('C:\\Users\\b_kog\\Projects\\OfanymBackend\\encrypted\\unencrypted.mp4.enc');

        input.pipe(cipher).pipe(output);

        output.on('finish', function () {
            console.log('Encrypted file written to disk!');
        });
        Promise.all(async files => {

        })
        res.status(200).json({encryptedKeys});

    } catch (error) {
        console.log(error)
    }
});

router.post('/decrypt', async (req, res) => {
    try {
        const {key} = req.body;


    } catch (error) {
        console.log(error)
    }
});

router.post('/signatures', async (req, res) => {
    try {
        const {signature, address} = req.body;
        await helpers.storeSignature(signature, address);
        return ReS(res, 'successfully stored', 200);
    } catch (e) {
        console.log(e)
        ReE(res, e, 500);
    }
});

router.post('/plaintextEncrypt', async (req, res) => {
    try {
        const {plaintext, address} = req.body;
        const encrypted  = await helpers.encryptWithSignature(plaintext, address);
        return ReS(res, {encrypted}, 200);
    } catch (e) {
        console.log(e)
        ReE(res, e, 500);
    }
});

router.post('/ciphertextDecrypt', async (req, res) => {
    try {
        const {ciphertext, privateKey} = req.body;
        const decrypted  = await helpers.decryptWithPrivateKey(ciphertext, privateKey);
        return ReS(res, {decrypted}, 200);
    } catch (e) {
        console.log(e)
        ReE(res, e, 500);
    }
});

router.post('/upload/contractAddress/:contractAddress', async (req, res) => {
    // const {contractAddress} = req.params;
    // const contract = await new Contract()
    //     .where({'address': contractAddress})
    //     .fetch({require: true});
    //
    // const customerAddress = contract.attributes.data['0'];
    // const signatureQuery = await knex.raw(`SELECT signature FROM signature where address = \'${customerAddress}\' LIMIT 1`);
    //
    // const signature = signatureQuery[0][0].signature;
    // const customerPublicKey = EthCrypto.recoverPublicKey(
    //     signature,
    //     EthCrypto.hash.keccak256('\x19Ethereum Signed Message:\n' + 'Signature verification for video file encryption'.length + 'Signature verification for video file encryption')
    // );
    //
    // const cryptoKey = await subtle.generateKey({name: 'AES-GCM', length: 256}, true, ['encrypt', 'decrypt']);
    // const key = await subtle.exportKey('raw', cryptoKey);
    // const buyerEncryptedKey = await EthCrypto.encryptWithPublicKey(customerPublicKey, String(key));
    // const encrypted = EthCrypto.cipher.stringify(buyerEncryptedKey);
    //
    // let cids = [];
    // const form = new formidable.IncomingForm({
    //     multiples: true,
    //     keepExtensions: true,
    // });
    // try {
    //     form.uploadDir = unencrypted;
    //     form.parse(req, async (err, fields, files) => {
    //         if (err) {
    //             throw(err);
    //         }
    //         const fileKeys = Object.keys(files);
    //         await Promise.all(fileKeys.map(async (fileKey) => {
    //             const cid = await saveFile(
    //                 key,
    //                 files[fileKey].newFilename,
    //                 files[fileKey].filepath,
    //                 encrypted,
    //                 contractAddress
    //             )
    //             cids.push(cid)
    //         }))
    //         res.json({cids});
    //     });
    // } catch (e) {
    //     return res.status(400).json({
    //         status: 'Fail',
    //         message: 'File parsing error',
    //         error: e
    //     })
    // }

})

router.post('/ingest', async (req, res) => {
    try {
        await helpers.ingestContracts();
        return ReS(res, 'successfully ingested', 200);
    } catch (e) {
        console.log(`Contract retrieval failed`, {e});
        ReE(res, e, 500);
    }
});

router.get('/contracts', async (req, res) => {
    try {
        const contracts = await helpers.retrieveContracts(req.query);
        return ReS(res, contracts, 200);
    } catch (e) {
        console.log(`Contract retrieval failed`, {e});
        ReE(res, e, 500);
    }
});

router.get('/buyerEncryptedKey', async(req, res) => {
    try{
        const buyerKeys = await helpers.retrieveBuyerEncryptedKey(req.query);
        return ReS(res, buyerKeys, 200);
    }catch (e) {
        console.log(`Key retrieval failed`, {e});
        ReE(res, e, 500);
    }

});

router.post('/uploadPlain', async (req, res) => {
    await parseFile(req)
        .then(data => {
            res.status(200).json({
                message: "Success",
                data
            })
        })
        .catch(error => {
            res.status(400).json({
                message: "An error occurred.",
                error
            })
        })
})

router.post('/publicKey', async (req, res) => {
    try {
        await helpers.savePublicKey(req);
        return ReS(res, 'successfully saved', 200);
    } catch (e) {
        console.log(`Public key failed`, {e});
        ReE(res, e, 500);
    }
});

router.post('/contractSubscriptions', async (req, res) => {
    try {
        await helpers.contractSubscriptions(req);
        return ReS(res, 'successfully saved', 200);
    } catch (e) {
        console.log(`Contract subscription failed`, {e});
        ReE(res, e, 400);
    }
});

router.post('/contractCentroid', async (req, res) => {
    try {
        const centroid = await helpers.contractCentroid(req);
        return ReS(res, centroid, 200);
    } catch (e) {
        console.log(`Contract centroid failed`, {e});
        ReE(res, e, 400);
    }
});

router.get('/nonce', async (req, res) => {
    try {
        const nonce = await helpers.retrieveNonce(req);
        return ReS(res, {nonce}, 200);
    } catch (e) {
        console.log(`Nonce retrieval failed`, {e});
        ReE(res, e, 500);
    }
});

router.post('/verifySignature', async (req, res) => {
    try {
        const verified = await helpers.verifySignature(req.body.address, req.body.signature);
        return ReS(res, verified, 200);
    }
    catch (e) {
        console.log(`Signature verification failed`, {e});
        ReE(res, e, 500);
    }
});

router.get('/messages', async (req, res) => {
    try {
        if(await helpers.verifySignature(req.query.address, req.query.signature)){
            const messages = await helpers.retrieveMessages(req);
            return ReS(res, messages, 200);
        }
        else{
            return ReE(res, 'Signature verification failed', 400);
        }
    } catch (e) {
        console.log(`Message retrieval failed`, {e});
        ReE(res, e, 500);
    }
});

router.put('/messages/:id/read', async (req, res) => {
    try {
        await helpers.markMessageRead(req);
        return ReS(res, 'success', 200);
    } catch (e) {
        console.log(`Message marking failed`, {e});
        ReE(res, e, 500);
    }
});

router.post('/messages', async (req, res) => {
    try {
        if(await helpers.verifySignature(req.body.address, req.body.signature)){
            const messages = await helpers.saveMessage(req);
            return ReS(res, messages, 200);
        }
        else{
            return ReE(res, 'Signature verification failed', 400);
        }
    }
    catch (e) {
        console.log(`Message sending failed`, {e});
        ReE(res, e, 500);
    }
});

router.delete('/messages', async (req, res) => {
    try {
        await helpers.messageDelete(req);
        return ReS(res, 'success', 200);
    } catch (e) {
        console.log(`Message deletion failed`, {e});
        ReE(res, e, 500);
    }
});

router.post('/messageSubscribe', async (req, res) => {
    try {
        if(await helpers.verifySignature(req.body.address, req.body.signature)){
            const subscribed = await helpers.messageSubscribe(req);
            return ReS(res, 'success', 200);
        }
        else{
            return ReE(res, 'Message subscription failed', 400);
        }
    }
    catch (e) {
        console.log(`Message subscription failed`, {e});
        ReE(res, e, 500);
    }
});

module.exports = router;
