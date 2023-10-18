import {defineStore} from 'pinia';
import {Web3} from "web3";
import {api} from 'boot/axios';
import compiledContract from "app/ethereum/build/MediaContract.json";
import compiledFactory from "app/ethereum/build/MediaContractFactory.json";
import detectEthereumProvider from '@metamask/detect-provider';
import {factoryAddress} from "../../config/web3.json";
import * as web3Utils from 'web3-utils';
import * as openpgp from 'openpgp';


const delay = (delayInms) => {
  return new Promise(resolve => setTimeout(resolve, delayInms));
}

export const useWeb3Store = defineStore('web3', {
  state: () => ({
    connected: false,
    web3: null,
    factory: null,
    account: null
  }),
  getters: {
    getConnection: (state) => state.connected,
    getWeb3: (state) => state.web3,
    getFactory: (state) => state.factory,
    getAccount: (state) => state.account
  },
  actions: {
    async setConnection(connection) {
      this.connected = connection;
    },
    async setWeb3(web3) {
      this.web3 = web3
    },
    async setFactory(factory) {
      try {
        console.log('setting factory', factory)
        this.factory = new this.web3.eth.Contract(compiledFactory.abi, factoryAddress);
      } catch (e) {
        console.log('error setting factory', e)
      }
      //factory
    },
    async setAccount(account) {
      this.account = account
    },
    async getGasFeeForContractCall(contract) {
      try {
        const gasAmount = await this.factory.methods.createContract(
          Math.floor(new Date(contract.expirationDate).getTime() / 1000),
          contract.task,
          contract.format,
          parseInt(contract.minimalLength),
          contract.minimalResolution,
          JSON.stringify(contract.location)
        ).estimateGas({
          from: this.account,
          value: web3Utils.toWei(contract.pay.toString(), 'ether')
        })
        return gasAmount.toString();
      } catch (e) {
        console.log('gas fee estimation failed: ', e);
        throw e;
      }
    },
    async createContract(contract) {
      try {

        const {privateKey, publicKey} = await openpgp.generateKey({
          type: 'rsa',
          passphrase: contract.passphrase,
          userIDs: [{name: 'My Name', email: 'name@example.com'}]
        });

        console.log('publicKey', publicKey);

        console.log('privateKey', privateKey)

        await api.post('/publicKey', {
          publicKey,
          privateKey,
          contractLocation: contract.location,
          expirationDate: contract.expirationDate,
          account: this.account
        })

        this.factory.events.contractDeployed((error, event) => {
          if (error) {
            console.log('error', error);
            throw error;
          }
          console.log('event', event);
        })

        let contractAddress = null;

        const contractCreated = await this.factory.methods
          .createContract(
            Math.floor(new Date(contract.expirationDate).getTime() / 1000),
            contract.task,
            contract.format,
            parseInt(contract.minimalLength),
            contract.minimalResolution,
            JSON.stringify(contract.location)
          )
          .send({
            from: this.account,
            gas: await this.getGasFeeForContractCall(contract),
            value: web3Utils.toWei(contract.pay.toString(), 'ether')
          })
          .on('transactionHash', function (hash) {
            console.log('transactionHash', hash);
          })
          .on('confirmation', function (confirmationNumber, receipt) {
            console.log('confirmation', confirmationNumber, receipt);
          })
          .on('receipt', function (receipt) {
            console.log('receipt', receipt);
          })

        const deployedAddress = await this.web3.eth.getTransactionReceipt(contractCreated.transactionHash);

        console.log('deployedAddress', deployedAddress);
      } catch (e) {
        console.log('createContract error', e);
        throw e;
      }
    },
    async getGasFeeForProposalCall(contract) {
      const gasAmount = await contract.methods.acceptProposal()
        .estimateGas({from: this.account})
      return gasAmount.toString();
    },
    async acceptProposal(address) {
      try {
        const contract = new this.web3.eth.Contract(compiledContract.abi, address);
        await contract.methods
          .acceptProposal()
          .send({
            from: this.account,
            gas: await this.getGasFeeForProposalCall(contract)
          })
          .on('error', function (error, receipt) {
            console.log(error, receipt)
            throw error;
          });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    async disputeProposal(address) {
      try {
        const contract = new this.web3.eth.Contract(compiledContract.abi, address);
        await contract.methods
          .disputeProposal()
          .send({
            from: this.account,
            gas: await this.getGasFeeForProposalCall(contract)
          })
          .on('error', function (error, receipt) {
            console.log(error, receipt);
            throw error;
          });
      } catch (error) {
        throw error
      }
    },

    async closeContract(address) {
      try{
        const contract = new this.web3.eth.Contract(compiledContract.abi,address);
        await contract.methods
          .closeContract()
          .send({
            from: this.account,
            gas: await this.getGasFeeForProposalCall(contract)
          })
          .on('error', function (error, receipt) {
            console.log(error, receipt)
            throw error;
          });
      }
      catch(error){
        console.log(error);
        throw error;
      }
    },

    async platformCloseContract(address) {
      try{
        const contract = new this.web3.eth.Contract(compiledContract.abi,address);
        await contract.methods
          .platformCloseContract()
          .send({
            from: this.account,
            gas: await this.getGasFeeForProposalCall(contract)
          })
          .on('error', function (error, receipt) {
            console.log(error, receipt)
            throw error;
          });
      }
      catch(error){
        console.log(error);
        throw error;
      }
    },

    async acceptDispute(address) {
      try{
        const contract = new this.web3.eth.Contract(compiledContract.abi,address);
        await contract.methods
          .acceptDispute()
          .send({
            from: this.account,
            gas: await this.getGasFeeForProposalCall(contract)
          })
          .on('error', function (error, receipt) {
            console.log(error, receipt)
            throw error;
          });
      }
      catch(error){
        console.log(error);
        throw error;
      }
    },

    async rejectDispute(address) {
      try{
        const contract = new this.web3.eth.Contract(compiledContract.abi,address);
        await contract.methods
          .rejectDispute()
          .send({
            from: this.account,
            gas: await this.getGasFeeForProposalCall(contract)
          })
          .on('error', function (error, receipt) {
            console.log(error, receipt)
            throw error;
          });
      }
      catch(error){
        console.log(error);
        throw error;
      }
    },

    fromWei(wei) {
      return web3Utils.fromWei(wei, "ether")
    },

    async setup() {
      console.log('setup')
      const provider = await detectEthereumProvider();
      if (!provider) {
        console.log('no provider detected, aborting setup')
        return;
      }
      await this.setWeb3(new Web3(provider));
      await this.setFactory(new this.web3.eth.Contract(
        compiledFactory.abi,
        factoryAddress
      ));
      const accounts = await window.ethereum.request({method: 'eth_requestAccounts'});
      await this.setAccount(accounts[0]);
    },

    async proposeMedia(address, cids) {
      try {
        const contract = new this.web3.eth.Contract(
          compiledContract.abi,
          address
        );
        const getGasFeeForProposalCall = async () => {
          const gasAmount = await contract.methods.proposeMedia(cids)
            .estimateGas({from: this.account})
          return gasAmount.toString();
        };

        await contract.methods
          .proposeMedia(cids)
          .send({
            from: this.account,
            gas: 10000000 //await getGasFeeForProposalCall()
          })
          .on('error', function (error, receipt) {
            console.log(error, receipt)
            throw (error)
          });

      } catch (e) {
        console.log(e);
      }

    }
  }
});


