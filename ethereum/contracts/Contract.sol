// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;


contract MediaContractFactory {
  address public _platform;
  address [] public deployedContracts;
  constructor() payable {
    _platform = msg.sender;
  }
  function createContract(
    uint _expiration,
    string calldata _tasking,
    string calldata _formatting,
    uint _minimalLength,
    string calldata _minimalResolution,
    string calldata _location
  ) public payable{
    address newContract =  address(new MediaContract{value: msg.value} (
        _expiration,
        _tasking,
        _formatting,
        _minimalLength,
        _minimalResolution,
        _location,
        payable(_platform),
        payable(msg.sender)
      ));
    deployedContracts.push(newContract);
  }

  function getDeployedContracts() public view returns (address [] memory){
    return deployedContracts;
  }
}

contract MediaContract {
  address payable public customer ;
  address payable public platform;
  address payable public reporter;
  uint public contractPrice;
  uint public platformFee;
  string public task;
  string public format;
  uint public created;
  uint public expires;
  string public status;
  string public pay;
  string public tasking;
  uint public minimalLength;
  string public specialInstructions;
  string public minimalResolution;
  string public location;
  string[] public mediaAddresses;

  constructor (
    uint expiration,
    string memory tasking_,
    string memory formatting_,
    uint minimalLength_,
    string memory minimalResolution_,
    string memory location_,
    address payable platform_,
    address payable newCustomer
  ) payable{
    customer = newCustomer;
    contractPrice =  msg.value * 95 / 100;
    platformFee = msg.value * 5 / 100;
    created = block.timestamp;
    expires = expiration;
    task = tasking_;
    format = formatting_;
    minimalLength = minimalLength_;
    minimalResolution = minimalResolution_;
    location = location_;
    platform = platform_;
    status = 'open';
  }

  function proposeMedia (string[] memory addresses) public {
    require(block.timestamp < expires);
    require(hashCompareWithLengthCheck(status, 'open'));
    reporter =  payable(msg.sender);
    mediaAddresses = addresses;
    status = 'proposed';
  }

  function acceptProposal() public payable {
    require(payable(msg.sender) == customer);
    require(hashCompareWithLengthCheck(status, 'proposed'));
    status = 'closed';
    contractPrice =  address(this).balance * 95 / 100;
    platformFee = address(this).balance * 5 / 100;
    reporter.transfer(contractPrice);
    platform.transfer(platformFee);
  }

  function disputeProposal() public {
    require(hashCompareWithLengthCheck(status, 'proposed'));
    require(payable(msg.sender) == customer);
    status = 'disputed';
  }

  function acceptDispute() public {
    require(payable(msg.sender) == platform);
    require(hashCompareWithLengthCheck(status, 'disputed'));
    status = 'open';
    delete mediaAddresses;
  }

  function rejectDispute() public payable{
    require(msg.sender == platform);
    require(hashCompareWithLengthCheck(status, 'disputed'));
    status = 'closed';
    contractPrice =  address(this).balance * 95 / 100;
    platformFee = address(this).balance * 5 / 100;
    reporter.transfer(contractPrice);
    platform.transfer(platformFee);
  }

  function closeContract() public {
    require(msg.sender == customer);
    require(hashCompareWithLengthCheck(status, 'open'));
    status = 'closed';
    customer.transfer(address(this).balance);
  }

  function renewContract(uint newExpiration) public {
    require(msg.sender == customer);
    require(hashCompareWithLengthCheck(status, 'open'));
    require(block.timestamp < newExpiration);
    expires = newExpiration;
    status = 'open';
  }

  function getMediaAddresses() public view returns (string[] memory) {
    return mediaAddresses;
  }
  function hashCompareWithLengthCheck( string memory a, string memory b) internal pure returns (bool)  {
    if(bytes(a).length != bytes(b).length) {
      return false;
    } else {
      return keccak256(abi.encode(a)) == keccak256(abi.encode(b));
    }
  }
}
