const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');
const options = {gasLimit: 8000000};
const web3 = new Web3(ganache.provider(options));

const compiledFactory = require('../ethereum/build/MediaContractFactory.json');
const compiledContract = require('../ethereum/build/MediaContract.json');

let accounts, factory, contractAddress, contract;

const today = new Date();
const tomorrow = new Date(today);
const dayAfter = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);
dayAfter.setDate(tomorrow.getDate() + 2);
const tomorrowTimestamp = Math.floor(tomorrow.getTime()/1000);
const dayAfterTimestamp = Math.floor(dayAfter.getTime()/1000);
const addresses = ['media1', 'media2'];

beforeEach(async () => {
  accounts = await web3.eth.getAccounts();

  factory = await new web3.eth.Contract(compiledFactory.abi)
    .deploy({data: compiledFactory.evm.bytecode.object})
    .send({from: accounts[0], gas: 8000000})

  await factory
    .methods
    .createContract(tomorrowTimestamp, 'Jerusalem traffic', 'MPEG', 60, '4K', JSON.stringify([["34.742580", "32.046081"], ["34.760053", "32.135796"], ["34.817236", "32.127726"], ["34.783349", "32.031719"]]))
    .send({
      from: accounts[1],
      gas: '8000000',
      value: web3.utils.toWei('1')
    })
    .on('error', function (error, receipt) {
      console.log(error, receipt)
    });

  [contractAddress] = await factory.methods.getDeployedContracts().call();

  contract = await new web3.eth.Contract(
    compiledContract.abi,
    contractAddress
  );
})

describe('Contracts', () => {
  it('deploys a factory and a contract', () => {
    assert.ok(factory.options.address);
    assert.ok(contract.options.address);
  });
  it('marks the contract factory deployer as contract platform', async () => {
    const platform = await contract.methods.platform().call();
    assert.equal(accounts[0], platform);
  })
  it('marks the contract deployer as contract customer', async () => {
    const customer = await contract.methods.customer().call();
    assert.equal(accounts[1], customer);
  })
  it('sets the contract status as open on creation', async () => {
    const status = await contract.methods.status().call();
    assert.equal('open', status);
  })
  it('allows a reporter to propose media', async () => {
    //check the proposer becomes a reporter, the status of the contract changes to proposed and the media addresses are populated
    await contract
      .methods
      .proposeMedia(addresses)
      .send({
        from: accounts[2],
        gas: '8000000'
      })
      .on('error', function (error, receipt) {
        console.log(error, receipt)
      });
    const reporter = await contract.methods.reporter().call();
    const mediaAddresses = await contract.methods.getMediaAddresses().call();
    const status = await contract.methods.status().call();
    assert.equal(accounts[2], reporter);
    assert.equal(mediaAddresses.length, 2);
    assert.equal(status, 'proposed');
  })
  it('does not allow a proposal while a proposal is pending', async () => {
    //check the second proposal fails
  })
  it('allows the customer to accept a proposal', async () => {
    //check the status changes to closed, the contract price is paid to the reporter and the platform fee to the customer
    const platformBalanceBefore = await web3.eth.getBalance(accounts[0])
    const reporterBalanceBefore = await web3.eth.getBalance(accounts[2])
    await contract.methods.proposeMedia(addresses)
      .send({
        from: accounts[2],
        gas: '8000000'
      })
      .on('error', function (error, receipt) {
        console.log(error, receipt)
      });
    await contract.methods.acceptProposal()
      .send({
        from: accounts[1],
        gas: '8000000'
      })
      .on('error', function (error, receipt) {
        console.log(error, receipt)
      });
    const status = await contract.methods.status().call();
    const platformBalanceAfter = await web3.eth.getBalance(accounts[0])
    const reporterBalanceAfter = await web3.eth.getBalance(accounts[2])
    assert.equal(status, 'closed');
    assert(parseInt(platformBalanceAfter) > parseInt(platformBalanceBefore));
    assert(parseInt(reporterBalanceAfter) > parseInt(reporterBalanceBefore));
  })
  it('does not allow a another proposal once the status is closed', async () => {
    //check the next proposal fails
  })
  it('allows a customer to dispute the proposal', async () => {
    //check the status changes to disputed
    await contract.methods.proposeMedia(addresses)
      .send({
        from: accounts[2],
        gas: '8000000'
      })
      .on('error', function (error, receipt) {
        console.log(error, receipt)
      });
    await contract.methods.disputeProposal()
      .send({
        from: accounts[1],
        gas: '8000000'
      })
      .on('error', function (error, receipt) {
        console.log(error, receipt)
      });
    const status = await contract.methods.status().call();
    assert.equal(status, 'disputed');
  })
  it('does not allow a noncustomer to dispute the proposal', async () => {
    //check the status remains proposed
    await contract.methods.proposeMedia(addresses)
      .send({
        from: accounts[2],
        gas: '8000000'
      })
      .on('error', function (error, receipt) {
        console.log(error, receipt)
      });
    try{
      await contract.methods.disputeProposal()
        .send({
          from: accounts[3],
          gas: '8000000'
        })
        .on('error', function (error, receipt) {
          console.log(error, receipt)
        });
    }
    catch (e){
      console.log(e)
    }

    const status = await contract.methods.status().call();
    assert.equal(status, 'proposed');
  })
  it('allows the platform to accept the dispute', async () => {
    //check the status changes to open and the media addresses are reset
    await contract.methods.proposeMedia(addresses)
      .send({
        from: accounts[2],
        gas: '8000000'
      })
      .on('error', function (error, receipt) {
        console.log(error, receipt)
      });
    await contract.methods.disputeProposal()
      .send({
        from: accounts[1],
        gas: '8000000'
      })
      .on('error', function (error, receipt) {
        console.log(error, receipt)
      });
    await contract.methods.acceptDispute()
      .send({
        from: accounts[0],
        gas: '8000000'
      })
      .on('error', function (error, receipt) {
        console.log(error, receipt)
      });
    const status = await contract.methods.status().call();
    const mediaAddresses = await contract.methods.getMediaAddresses().call();
    assert.equal(status, 'open');
    assert.equal(mediaAddresses.length, 0);
  })
  it('does not allow a reporter to accept the dispute', async () => {
    //check the status remains disputed
    await contract.methods.proposeMedia(addresses)
      .send({
        from: accounts[2],
        gas: '8000000'
      })
      .on('error', function (error, receipt) {
        console.log(error, receipt)
      });
    await contract.methods.disputeProposal()
      .send({
        from: accounts[1],
        gas: '8000000'
      })
      .on('error', function (error, receipt) {
        console.log(error, receipt)
      });
    try{
      await contract.methods.acceptDispute()
        .send({
          from: accounts[2],
          gas: '8000000'
        })
        .on('error', function (error, receipt) {
          console.log(error, receipt)
        });
    }
    catch (e) {
      console.log(e)
    }
    const status = await contract.methods.status().call();
    const mediaAddresses = await contract.methods.getMediaAddresses().call();
    assert.equal(status, 'disputed');
    assert.equal(mediaAddresses.length, 2);
  })
  it('allows the platform to reject the dispute', async () => {
    //check the status becomes closed and the contract price is paid to the reporter and the platform fee to the customer
    const platformBalanceBefore = await web3.eth.getBalance(accounts[0])
    const reporterBalanceBefore = await web3.eth.getBalance(accounts[2])
    await contract.methods.proposeMedia(addresses)
      .send({
        from: accounts[2],
        gas: '8000000'
      })
      .on('error', function (error, receipt) {
        console.log(error, receipt)
      });
    await contract.methods.disputeProposal()
      .send({
        from: accounts[1],
        gas: '8000000'
      })
      .on('error', function (error, receipt) {
        console.log(error, receipt)
      });
    await contract.methods.rejectDispute()
      .send({
        from: accounts[0],
        gas: '8000000'
      })
      .on('error', function (error, receipt) {
        console.log(error, receipt)
      });
    const status = await contract.methods.status().call();
    const mediaAddresses = await contract.methods.getMediaAddresses().call();
    const platformBalanceAfter = await web3.eth.getBalance(accounts[0])
    const reporterBalanceAfter = await web3.eth.getBalance(accounts[2])
    assert.equal(status, 'closed');
    assert(parseInt(platformBalanceAfter) > parseInt(platformBalanceBefore));
    assert(parseInt(reporterBalanceAfter) > parseInt(reporterBalanceBefore));
    assert.equal(mediaAddresses.length, 2);
  })
  it('does not allow a reporter to reject the dispute', async () => {
    //check the status remains disputed
    await contract.methods.proposeMedia(addresses)
      .send({
        from: accounts[2],
        gas: '8000000'
      })
      .on('error', function (error, receipt) {
        console.log(error, receipt)
      });
    await contract.methods.disputeProposal()
      .send({
        from: accounts[1],
        gas: '8000000'
      })
      .on('error', function (error, receipt) {
        console.log(error, receipt)
      });
    try{
      await contract.methods.rejectDispute()
        .send({
          from: accounts[2],
          gas: '8000000'
        })
        .on('error', function (error, receipt) {
          console.log(error, receipt)
        });
    }
    catch (e) {
      console.log(e)
    }
    const status = await contract.methods.status().call();
    const mediaAddresses = await contract.methods.getMediaAddresses().call();
    assert.equal(status, 'disputed');
    assert.equal(mediaAddresses.length, 2);
  })
  it('allows the customer to close the contract', async () => {
    //check the status changes to closed
    await contract.methods.closeContract()
      .send({
        from: accounts[1],
        gas: '8000000'
      })
      .on('error', function (error, receipt) {
        console.log(error, receipt)
      });
    const status = await contract.methods.status().call();
    assert.equal(status, 'closed');
  })
  it('does not allow a reporter to close the contract', async () => {
    //check the status remains open
    await contract.methods.proposeMedia(addresses)
      .send({
        from: accounts[2],
        gas: '8000000'
      })
      .on('error', function (error, receipt) {
        console.log(error, receipt)
      });
    try{
      await contract.methods.closeContract()
        .send({
          from: accounts[2],
          gas: '8000000'
        })
        .on('error', function (error, receipt) {
          console.log(error, receipt)
        });
    }
    catch (e) {
      console.log(e)
    }

    const status = await contract.methods.status().call();
    assert.equal(status, 'proposed');
  })
  it('allows the customer to renew the contract', async () => {
    //check the new expiration date is set
    await contract.methods.renewContract(dayAfterTimestamp)
      .send({
        from: accounts[1],
        gas: '8000000'
      })
      .on('error', function (error, receipt) {
        console.log(error, receipt)
      });
    const expires = await contract.methods.expires().call();
    assert.equal(expires, dayAfterTimestamp);
  })
  it('does not allow a reporter to renew the contract', async () => {
    //check the old expiration date remains
    try{
      await contract.methods.renewContract(dayAfterTimestamp)
        .send({
          from: accounts[2],
          gas: '8000000'
        })
        .on('error', function (error, receipt) {
          console.log(error, receipt)
        });
    }
    catch (e) {
      console.log(e);
    }
    const expires = await contract.methods.expires().call();
    assert.equal(expires, tomorrowTimestamp);
  })
});
