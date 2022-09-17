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


router.post('/encrypt', async (req, res) => {
    try {
        const {buyerKey, sellerKey, marketKey} = req.body;
        const cryptoKey = await subtle.generateKey({name: 'AES-GCM', length: 256}, true, ['encrypt', 'decrypt']);
        const key = await subtle.exportKey('raw', cryptoKey);
        const buyerEncryptedKey = await EthCrypto.encryptWithPublicKey(buyerKey, String(key));
        const sellerEncryptedKey = await EthCrypto.encryptWithPublicKey(sellerKey, String(key));
        const marketEncryptedKey = await EthCrypto.encryptWithPublicKey(marketKey, String(key));
        const encryptedKeys = {
            buyerEncryptedKey,
            sellerEncryptedKey,
            marketEncryptedKey
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

router.post('/upload', async (req, res) => {
    let encryptedFiles = [];
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
                const encryptedFile = await encryptFile(
                    req.buyerKey || 'a22ad7e75b5287fbae7f35fcd952bb61405cb60ee3b7e984858c1f0cccf61609d8092ee469234f75e70b6a2e4041ad88cde93a75df14a5566ad561e12444d7c2',
                    req.sellerKey || 'a22ad7e75b5287fbae7f35fcd952bb61405cb60ee3b7e984858c1f0cccf61609d8092ee469234f75e70b6a2e4041ad88cde93a75df14a5566ad561e12444d7c2',
                    'a22ad7e75b5287fbae7f35fcd952bb61405cb60ee3b7e984858c1f0cccf61609d8092ee469234f75e70b6a2e4041ad88cde93a75df14a5566ad561e12444d7c2',
                    files[fileKey].newFilename,
                    files[fileKey].filepath,
                    encrypted
                )
                encryptedFiles.push(encryptedFile)
            }))
            res.json({encryptedFiles});
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
