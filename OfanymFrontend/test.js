const { Web3 } = require('web3');

const contractABI = require('./ethereum/build/MediaContractFactory.json').abi;
const contractAddress = require('./config/web3.json').factoryAddress;

console.log(Web3.version);

// Assuming you are on the Ethereum mainnet
const web3 = new Web3('https://rpc.ankr.com/eth_goerli');


// Initialize the contract
const myContract = new web3.eth.Contract(contractABI, contractAddress);

// Replace with your account address
const account = '0x500694d00efc0315cac629b83dfd11c8b038afaa';

// Sample data for the createContract method
const contract = {
  active:true,
  expirationDate:"2023/07/28",
  task: "Sea",
  format: "Video",
  minimalLength: "2",
  minimalResolution: "1080p",
  location: [[34.20552730447454,32.04477320766729],[34.114865641068285,32.11758387524815],[34.140965210836754,32.22748676970982],[34.281078690646424,32.30579258201376],[34.331904168616596,32.22748676970982],[34.26184742871176,32.090108151632734],[34.20552730447454,32.04477320766729]],
  pay: "0.001",
  signature: ""
};

console.log(Math.floor(new Date(contract.expirationDate).getTime() / 1000));

// Define the createContract method with sample data
const method = myContract.methods.createContract(
  Math.floor(new Date(contract.expirationDate).getTime() / 1000),
  contract.task,
  contract.format,
  contract.minimalLength,
  contract.minimalResolution,
  JSON.stringify(contract.location)
);

const estimateGas = async () => {
  try {
    const gasAmount = await method.estimateGas({
      from: account,
      value: web3.utils.toWei(contract.pay.toString(), 'ether')
    });
    console.log('Estimated gas: ', gasAmount);
  } catch (e) {
    console.log('An error occurred: ', e);
  }
}

estimateGas();
