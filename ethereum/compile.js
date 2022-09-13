const path = require('path');
const solc =  require('solc');
const fs = require('fs-extra');

const buildPath = path.resolve(__dirname, 'build');
fs.removeSync(buildPath);
const contractPath = path.resolve(__dirname, 'contracts', 'Contract.sol');
const source = fs.readFileSync(contractPath, 'utf-8');

const compilerInput = {
  language: 'Solidity',
  sources:
    {
      'Contract.sol':
        {
          content: source
        }
    },
  settings:
    {
      optimizer:
        {
          enabled: true
        },
      outputSelection:
        {
          '*':{
            '*':['*']
          }
        }
    }
};

const output = JSON.parse(solc.compile(JSON.stringify(compilerInput))).contracts['Contract.sol'];

fs.ensureDirSync(buildPath);

for (let contractIndex in Object.values(output)) {
    fs.outputJsonSync(path.resolve(buildPath, Object.keys(output)[contractIndex] + '.json'), output[Object.keys(output)[contractIndex]]);
}

