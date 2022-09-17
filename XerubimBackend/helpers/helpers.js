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

let provider = new HDWalletProvider({
    mnemonic: {
        phrase: mnemonicPhrase
    },
    providerOrUrl: "https://goerli.infura.io/v3/3aab413e2af7425796d7100d42dc889a"
});

const web3 = new Web3(provider);

const encryptFile = async (buyerKey, sellerKey, marketKey, fileName, inputFilePath, destination) => {
    try {
        const cryptoKey = await subtle.generateKey({name: 'AES-GCM', length: 256}, true, ['encrypt', 'decrypt']);
        const key = await subtle.exportKey('raw', cryptoKey);
        const buyerEncryptedKey = await EthCrypto.encryptWithPublicKey(buyerKey, String(key));
        const sellerEncryptedKey = await EthCrypto.encryptWithPublicKey(sellerKey, String(key));
        const marketEncryptedKey = await EthCrypto.encryptWithPublicKey(marketKey, String(key));
        const encryptedKeys = {
            buyerEncryptedKey, sellerEncryptedKey, marketEncryptedKey
        }

        const iv = crypto.randomBytes(16);
       // redis.hset(key.toString(), 'iv', iv.toString())
        const cipher = crypto.createCipheriv('aes-256-ctr', key, iv, null);
        const input = fs.createReadStream(inputFilePath);
        const output = fs.createWriteStream(path.join(destination, fileName));

        input.pipe(cipher).pipe(output);

        output.on('finish', function () {
            console.log('Encrypted file written to disk!');
        });
        return {...encryptedKeys, fileName}

    } catch (error) {
        console.log(error)
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
    for await (const contractAddress of contractAddresses){
        try{
            const cachedContract = await new Contract()
                .where({'address': contractAddress})
                .fetch({require: false});
            if(!cachedContract){
                await ingestContractByAddress(contractAddress)
            }
        }
        catch (e) {
            console.log(e);
        }

    }
}

const syncContractByAddress = async (address) => {
    //TODO refactor to use stored ABI and address
    try{
        const contract = await new web3.eth.Contract(
            compiledContract.abi,
            address
        );

        const data = await contract.methods.getSummary().call();

        await new Contract()
            .where({'address': address})
            .upsert({data});
    }
    catch (e) {
        console.log(e);
    }

}

const ingestContractByAddress = async (address) => {
    try{
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

        await knex.raw(`INSERT INTO contract(data, address, coordinates,  smart_contract_version_id) 
        VALUES ('${JSON.stringify(data)}', '${address}',  ${geoString(data[10])}, 1)`)
    }
    catch (e) {
        console.log(e);
    }

}

const retrieveContracts = async (query) => {

    let {pageSize, page, corners, customerAddress, reporterAddress, addresses, orderBy, desc, searchString} = JSON.parse(query.query);

    if (pageSize)
        pageSize = parseInt(pageSize);

    if (page)
        page = parseInt(page);


    if (orderBy && desc)
        orderBy = `-${orderBy}`;


    const cachedContracts = await new Contract()
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

    return {
        contracts: cachedContracts,
        pagination: cachedContracts.pagination
    };
};

module.exports = {encryptFile, ingestContractByAddress, ingestContracts, retrieveContracts};
