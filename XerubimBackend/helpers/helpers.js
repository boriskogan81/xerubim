const EthCrypto = require('eth-crypto');
const fs = require('fs');
const crypto = require('crypto');
const path = require("path");
const {subtle} = require('crypto').webcrypto;
const HDWalletProvider = require("@truffle/hdwallet-provider");
const Web3 = require("web3");
const config = require("../../Xerubim/config/web3.json");
const mnemonicPhrase = config.mnemonic;
const compiledFactory = require('../../Xerubim/ethereum/build/MediaContractFactory.json');
const compiledContract = require('../../Xerubim/ethereum/build/MediaContract.json');
const Contract = require('../models/contract').model;
const ContractFactory = require('../models/contract_factory').model;
const Media = require('../models/media').model;
const ContractVersion = require('../models/smart_contract_version').model;
const knex = require('../bootstrap/bookshelf_instance').knex;
const Web3Storage = require('web3.storage');

function getAccessToken () {
    return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweDI2RWE4N2I3OTlEY2QyYWFBNDBGQzFkMjNlOWM5MEZkZDMyM0E3NjMiLCJpc3MiOiJ3ZWIzLXN0b3JhZ2UiLCJpYXQiOjE2NjMyNDkzMjgwMjcsIm5hbWUiOiJYZXJ1YmltU2FuZGJveCJ9.9PiUVskWavMIJcOvHkBspvvQNGM2QaN0m3rxr19D8fE'
    //return process.env.WEB3STORAGE_TOKEN
}

function makeStorageClient () {
    return new Web3Storage.Web3Storage({ token: getAccessToken() })
}

let provider = new HDWalletProvider({
    mnemonic: {
        phrase: mnemonicPhrase
    },
    providerOrUrl: "https://goerli.infura.io/v3/3aab413e2af7425796d7100d42dc889a"
});

const web3 = new Web3(provider);

const encryptFile = async (key, fileName, inputFilePath, encrypted, contractAddress) => {
    try {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-ctr', key, iv, null);
        //const input = fs.createReadStream(inputFilePath);
        const storage = makeStorageClient();
        const keyString = new Int32Array(key).toString();
        const files = await Web3Storage.getFilesFromPath(inputFilePath);
        const cid = await storage.put(files);
        await knex.raw(`INSERT INTO crypto (buyerEncryptedKey, iv, cid, contractAddress, keystring) VALUES (\'${encrypted}\', \'${iv.toString('hex')}\',\'${cid}\', \'${contractAddress}\', \'${keyString}\')`)
        return cid

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
        '0xeF69217Db1560631Ad9274CaE93ae8C85A4Bc6c1'
    );
    const contractAddresses = await factory.methods.getDeployedContracts().call();

    //TODO refactor to use map and Promise.all
    for await (const contractAddress of contractAddresses) {
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

    }
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

            prepped = "ST_GeomFromText('POLYGON((" + prepped.slice(0, -2) + "))', 4326)"
            return prepped;
        }

        await knex.raw(`INSERT INTO contract(data, address, coordinates,  smart_contract_version_id) VALUES (\'${JSON.stringify(data)}\', \'${address}\',  \'${geoString(data[10])}\', 1)`);
    } catch (e) {
        console.log(e);
    }

}

const retrieveContracts = async (query) => {

    let {pageSize, page, corners, customerAddress, reporterAddress, addresses, orderBy, desc, searchString} = query;

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

const encryptWithSignature = async (plaintext, address) => {
    try{
        const signatureQuery = await knex.raw(`SELECT signature FROM signature where address = \'${address}\' LIMIT 1`);

        const signature = signatureQuery[0][0].signature;
        const publicKey = EthCrypto.recoverPublicKey(
            signature,
            EthCrypto.hash.keccak256('\x19Ethereum Signed Message:\n' + 'Signature verification for video file encryption'.length + 'Signature verification for video file encryption')
        );
        const encryptedObject = await EthCrypto.encryptWithPublicKey(publicKey, plaintext);
        const encrypted = EthCrypto.cipher.stringify(encryptedObject);
        await knex.raw(`INSERT INTO crypto (sellerEncryptedKey) VALUES (\'${encrypted}\')`)
        return encrypted;
    }
    catch (e) {
        console.log(e)
    }
}

const decryptWithPrivateKey = async (ciphertext, privateKey) => {
    try{
        const decrypted = await EthCrypto.decryptWithPrivateKey(privateKey, EthCrypto.cipher.parse(ciphertext));
        return decrypted;
    }
    catch (e) {
        console.log(e)
    }
}
module.exports = {encryptFile, ingestContractByAddress, ingestContracts, retrieveContracts, storeSignature, encryptWithSignature, decryptWithPrivateKey};
