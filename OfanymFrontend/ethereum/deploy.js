const HDWalletProvider = require("@truffle/hdwallet-provider");
const {Web3} = require("web3");
const config = require("../config/web3.json");
const mnemonicPhrase = config.mnemonic;
const compiledFactory = require('./build/MediaContractFactory.json');
let provider = new HDWalletProvider({
  mnemonic: {
    phrase: mnemonicPhrase
  },
  providerOrUrl: "https://goerli.infura.io/v3/3fbb55944ed342f9a5775602cd8bc900"
});

const web3 = new Web3(provider);


const deploy = async () => {
  const accounts = await web3.eth.getAccounts();
  const account = accounts[0];

  console.log('Attempting to deploy from account ', account);
  try {
    const factory = new web3.eth.Contract(compiledFactory.abi);
    const bytecode = compiledFactory.evm.bytecode.object;
    const gasEstimate = await factory.deploy({data: '0x' + bytecode}).estimateGas();
    const gasPrice = await web3.eth.getGasPrice();
    const deployedFactory = factory.deploy({data: '0x' + bytecode})
    const result = await deployedFactory
      .send({
      gas: gasEstimate,
      from: account,
      gasPrice: gasPrice
    });
    console.log(result);

  } catch (e) {
    console.log(e);
  }

};

deploy();
