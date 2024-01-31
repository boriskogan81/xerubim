const express = require('express');
const router = express.Router();
const parseFile = require('../helpers/helpers').parseFile;
const helpers = require('../helpers/helpers')
const {model: Contract} = require("../models/contract");
const {model: Media} = require("../models/media");
const {logger} = require('../logger');


//used
router.post('/ingest', async (req, res) => {
    try {
        logger.info(req, 'Ingest request');
        await helpers.ingestContracts();
        return ReS(res, 'successfully ingested', 200);
    } catch (e) {
        console.log(`Contract retrieval failed`, {e});
        logger.error(e, 'Ingest request failed');
        ReE(res, e, 500);
    }
});

//used
router.get('/contracts', async (req, res) => {
    try {
        logger.info(req.query, 'Contract retrieval request');
        const contracts = await helpers.retrieveContracts(req.query);
        return ReS(res, contracts, 200);
    } catch (e) {
        console.log(`Contract retrieval failed`, {e});
        logger.error(e, 'Contract retrieval request failed');
        ReE(res, e, 500);
    }
});

router.get('/buyerEncryptedKey', async(req, res) => {
    try{
        logger.info(req.query, 'Buyer key retrieval request')
        const buyerKeys = await helpers.retrieveBuyerEncryptedKey(req.query);
        return ReS(res, buyerKeys, 200);
    }catch (e) {
        console.log(`Key retrieval failed`, {e});
        logger.error(e, 'Buyer key retrieval request failed');
        ReE(res, e, 500);
    }

});

router.post('/uploadPlain', async (req, res) => {
    logger.info(req, 'Upload request');
    await parseFile(req)
        .then(data => {
            res.status(200).json({
                message: "Success",
                data
            })
        })
        .catch(error => {
            console.log(error)
            logger.error(error, 'Upload request failed');
            res.status(400).json({
                message: "An error occurred.",
                error
            })
        })
})

router.post('/publicKey', async (req, res) => {
    try {
        logger.info(req, 'Public key request')
        await helpers.savePublicKey(req);
        return ReS(res, 'successfully saved', 200);
    } catch (e) {
        console.log(`Public key failed`, {e});
        logger.error(e, 'Public key request failed');
        ReE(res, e, 500);
    }
});

router.post('/contractSubscriptions', async (req, res) => {
    try {
        logger.info(req, 'Contract subscription GET request')
        await helpers.contractSubscriptions(req);
        return ReS(res, 'successfully saved', 200);
    } catch (e) {
        console.log(`Contract subscription failed`, {e});
        logger.error(e, 'Contract subscription GET request failed');
        ReE(res, e, 400);
    }
});

router.get('/nonce', async (req, res) => {
    try {
        logger.info(req.query, 'Nonce retrieval request')
        const nonce = await helpers.retrieveNonce(req);
        return ReS(res, {nonce}, 200);
    } catch (e) {
        console.log(`Nonce retrieval failed`, {e});
        logger.error(e, 'Nonce retrieval request failed');
        ReE(res, e, 500);
    }
});

router.post('/verifySignature', async (req, res) => {
    try {
        logger.info(req, 'Signature verification request')
        const verified = await helpers.verifySignature(req.body.address, req.body.signature);
        return ReS(res, verified, 200);
    }
    catch (e) {
        console.log(`Signature verification failed`, {e});
        logger.error(e, 'Signature verification request failed');
        ReE(res, e, 500);
    }
});

router.get('/messages', async (req, res) => {
    try {
        logger.info(req.query, 'Message retrieval request')
        if(await helpers.verifySignature(req.query.address, req.query.signature)){
            const messages = await helpers.retrieveMessages(req);
            return ReS(res, messages, 200);
        }
        else{
            return ReE(res, 'Signature verification failed', 400);
        }
    } catch (e) {
        console.log(`Message retrieval failed`, {e});
        logger.error(e, 'Message retrieval request failed');
        ReE(res, e, 500);
    }
});

router.put('/messages/:id/read', async (req, res) => {
    try {
        logger.info(req.params, 'Message read marking request')
        await helpers.markMessageRead(req);
        return ReS(res, 'success', 200);
    } catch (e) {
        console.log(`Message marking failed`, {e});
        logger.error(e, 'Message read marking request failed');
        ReE(res, e, 500);
    }
});

router.post('/messages', async (req, res) => {
    try {
        logger.info(req, 'Message sending request')
        if(await helpers.verifySignature(req.body.address, req.body.signature)){
            const messages = await helpers.saveMessage(req);
            return ReS(res, messages, 200);
        }
        else{
            logger.error('Signature verification failed', 'Message sending request failed');
            return ReE(res, 'Signature verification failed', 400);
        }
    }
    catch (e) {
        console.log(`Message sending failed`, {e});
        logger.error(e, 'Message sending request failed');
        ReE(res, e, 500);
    }
});

router.delete('/messages', async (req, res) => {
    try {
        logger.info(req, 'Message deletion request')
        await helpers.messageDelete(req);
        return ReS(res, 'success', 200);
    } catch (e) {
        console.log(`Message deletion failed`, {e});
        logger.error(e, 'Message deletion request failed');
        ReE(res, e, 500);
    }
});

router.post('/messageSubscribe', async (req, res) => {
    try {
        logger.info(req, 'Message subscription request')
        if(await helpers.verifySignature(req.body.address, req.body.signature)){
            await helpers.messageSubscribe(req);
            return ReS(res, 'success', 200);
        }
        else{
            logger.error('Signature verification failed', 'Message subscription request failed');
            return ReE(res, 'Message subscription failed', 400);
        }
    }
    catch (e) {
        logger.error(e, 'Message subscription request failed');
        console.log(`Message subscription failed`, {e});
        ReE(res, e, 500);
    }
});

module.exports = router;
