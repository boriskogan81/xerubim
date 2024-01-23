const Web3 = require("web3");
const config = require('./helpers/config_helper');
const knex = require('./bootstrap/bookshelf_instance').knex;
const compiledFactory = require('../OfanymFrontend/ethereum/build/MediaContractFactory.json');
const compiledContract = require('../OfanymFrontend/ethereum/build/MediaContract.json');
const Mailgun = require('mailgun-js');
const mailgun = new Mailgun({apiKey: config.mailgun.key, domain: config.mailgun.domain});

const listenerSetup = async () => {

    const wsProvider = new Web3.providers.WebsocketProvider("wss://sepolia.infura.io/ws/v3/3fbb55944ed342f9a5775602cd8bc900");

    const web3 = new Web3(wsProvider);

    const factory = await new web3.eth.Contract(
        compiledFactory.abi,
        config.web3.factoryAddress
    );

    const factorySubscribe = async () => {
        await factory.events.allEvents(async (err, event) => {
            if (err) {
                console.log(err);
            } else {
                const {event: eventName, returnValues} = event;
                // const {contractAddress, email} = returnValues;

                if (eventName === 'contractDeployed') {
                    console.log('contractCreated', returnValues);
                    await contractSubscribe(returnValues.contractAddress);
                }
            }
        });
    }

    const contractSubscribe = async (contractAddress) => {
        const contract = await new web3.eth.Contract(
            compiledContract.abi,
            contractAddress
        );

        contract.events.allEvents(async (err, event) => {
            if (err) {
                console.log(err);
            } else {
                const {event: eventName, returnValues} = event;
                const {contractAddress, newStatus} = returnValues;
                if (eventName === 'contractStatusChanged') {
                    console.log('contractStatusChanged', returnValues.contractAddress);
                    const subscribed = await knex.raw(`SELECT email FROM event_subscriptions where contractAddress = \'${contractAddress}\'`);
                    if(subscribed[0].length > 0) {
                        const contractQuery = await knex.raw(`SELECT ST_Centroid(ST_GeomFromText(ST_AsText(coordinates))), id, data FROM contract where address = \'${contractAddress}\' LIMIT 1`);
                        const coordinates = contractQuery[0][0]['ST_Centroid(ST_GeomFromText(ST_AsText(coordinates)))'];
                        const task = JSON.parse(contractQuery[0][0]['data'])['3'];
                        const status = JSON.parse(contractQuery[0][0]['data'])['6'];
                        const contractURL = `${config.mailgun.baseURL}?contractId=${contractQuery[0][0].id}&x=${coordinates.x}&y=${coordinates.y}`;
                        subscribed[0].forEach((subscription) => {
                            const data = {
                                from: `Ofanym <postmaster@${config.mailgun.domain}>`,
                                to: subscription.email,
                                subject: "Contract Status Update",
                                template: "Contract Status Update",
                                'h:X-Mailgun-Variables': JSON.stringify({
                                    contractAddress: contractAddress,
                                    status: status,
                                    task: task,
                                    contractURL: contractURL
                                })
                            }
                            mailgun.messages().send(data, function (error, body) {
                                console.log(body);
                            });
                        });
                    }
                }
            }
        });
    }

    await factorySubscribe();

    const contractAddresses = await factory.methods.getDeployedContracts().call();

    await Promise.all(contractAddresses.map(async (contractAddress) => {
        await contractSubscribe(contractAddress);
    })
    )
}

module.exports = {
    listenerSetup
}



