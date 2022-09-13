const HDWalletProvider = require("@truffle/hdwallet-provider");
const Web3 = require("web3");
const config = require("../config/web3.json");
const mnemonicPhrase = config.mnemonic;
const compiledFactory = require('../ethereum/build/MediaContractFactory.json');
let provider = new HDWalletProvider({
  mnemonic: {
    phrase: mnemonicPhrase
  },
  providerOrUrl: "https://goerli.infura.io/v3/3aab413e2af7425796d7100d42dc889a"
});

const web3 = new Web3(provider);

const deploy = async () => {
  const accounts = await web3.eth.getAccounts();

  console.log('Attempting to deploy from account ', accounts[0]);
  try {
    const result = await new web3.eth.Contract(compiledFactory.abi)
      .deploy({data: compiledFactory.evm.bytecode.object})
      .send({
        gas: '3000000',
        from: accounts[0]
      });
    console.log(result);
  } catch (e) {
    console.log(e);
  }

};

deploy();
