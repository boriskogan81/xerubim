import web3 from './web3';
import compiledFactory from "app/ethereum/build/MediaContractFactory.json";
import factoryAddress from "../config/web3.json";

const instance = new web3.eth.Contract(
  compiledFactory.abi,
  factoryAddress
);

export default instance;
