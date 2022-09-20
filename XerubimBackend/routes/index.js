const express = require('express');
const router = express.Router();
const EthCrypto = require('eth-crypto');
const fs = require('fs');
const crypto = require('crypto');
const {subtle} = require('crypto').webcrypto;
const formidable = require('formidable');
const path = require('path');
const unencrypted = path.join(__dirname, '../unencrypted');
const encrypted = path.join(__dirname, '../encrypted/');
const decrypted = path.join(__dirname, '../decrypted/');
const encryptFile = require('../helpers/helpers').encryptFile;
const helpers = require('../helpers/helpers')
const {knex} = require("../bootstrap/bookshelf_instance");
const {model: Contract} = require("../models/contract");



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
        const input = fs.createReadStream('C:\\Users\\b_kog\\Projects\\XerubimBackend\\unencrypted\\unencrypted.mp4');
        const output = fs.createWriteStream('C:\\Users\\b_kog\\Projects\\XerubimBackend\\encrypted\\unencrypted.mp4.enc');

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
    const {contractAddress} = req.params;
    const contract = await new Contract()
        .where({'address': contractAddress})
        .fetch({require: true});

    const customerAddress = contract.attributes.data['0'];
    const signatureQuery = await knex.raw(`SELECT signature FROM signature where address = \'${customerAddress}\' LIMIT 1`);

    const signature = signatureQuery[0][0].signature;
    const customerPublicKey = EthCrypto.recoverPublicKey(
        signature,
        EthCrypto.hash.keccak256('\x19Ethereum Signed Message:\n' + 'Signature verification for video file encryption'.length + 'Signature verification for video file encryption')
    );

    const cryptoKey = await subtle.generateKey({name: 'AES-GCM', length: 256}, true, ['encrypt', 'decrypt']);
    const key = await subtle.exportKey('raw', cryptoKey);
    const buyerEncryptedKey = await EthCrypto.encryptWithPublicKey(customerPublicKey, String(key));
    const encrypted = EthCrypto.cipher.stringify(buyerEncryptedKey);

    let cids = [];
    const form = new formidable.IncomingForm({
        multiples: true,
        keepExtensions: true,
    });
    try {
        form.uploadDir = unencrypted;
        form.parse(req, async (err, fields, files) => {
            if (err) {
                throw(err);
            }
            const fileKeys = Object.keys(files);
            await Promise.all(fileKeys.map(async (fileKey) => {
                const cid = await encryptFile(
                    key,
                    files[fileKey].newFilename,
                    files[fileKey].filepath,
                    encrypted,
                    contractAddress
                )
                cids.push(cid)
            }))
            res.json({cids});
        });
    } catch (e) {
        return res.status(400).json({
            status: 'Fail',
            message: 'File parsing error',
            error: e
        })
    }

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

module.exports = router;
