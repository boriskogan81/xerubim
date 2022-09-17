import web3 from './web3';
import compiledFactory from "app/ethereum/build/MediaContractFactory.json";

const instance = new web3.eth.Contract(
  compiledFactory.abi,
  '0xeF69217Db1560631Ad9274CaE93ae8C85A4Bc6c1'
);

export default instance;
