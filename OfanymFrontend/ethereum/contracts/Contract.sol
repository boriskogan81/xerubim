// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;


contract MediaContractFactory {
  event contractDeployed(address contractAddress, address customerAddress);
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
  ) public payable {
    address newContract = address(new MediaContract{value : msg.value}(
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
    emit contractDeployed(newContract, msg.sender);
  }

  function getDeployedContracts() public view returns (address [] memory){
    return deployedContracts;
  }
}

contract MediaContract {
  address payable public customer;
  address payable public platform;
  address payable public reporter;
  string public task;
  string public format;
  uint public expires;
  string public status;
  uint public minimalLength;
  string public specialInstructions;
  string public minimalResolution;
  string public location;
  string[] public mediaAddresses;
  event contractStatusChanged(address contractAddress, address customerAddress, string newStatus);

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
    expires = expiration;
    task = tasking_;
    format = formatting_;
    minimalLength = minimalLength_;
    minimalResolution = minimalResolution_;
    location = location_;
    platform = platform_;
    status = 'open';
  }

  function proposeMedia(string[] memory addresses) public {
    require(block.timestamp < expires);
    require(hashCompareWithLengthCheck(status, 'open'));
    reporter = payable(msg.sender);
    mediaAddresses = addresses;
    status = 'proposed';
    emit contractStatusChanged(address(this), customer, status);
  }

  function acceptProposal() public payable {
    require(payable(msg.sender) == customer);
    require(hashCompareWithLengthCheck(status, 'proposed'));
    status = 'closed';
    reporter.transfer(address(this).balance * 95 / 100);
    platform.transfer(address(this).balance * 5 / 100);
    emit contractStatusChanged(address(this), customer, status);
  }

  function disputeProposal() public {
    require(hashCompareWithLengthCheck(status, 'proposed'));
    require(payable(msg.sender) == customer);
    status = 'disputed';
    emit contractStatusChanged(address(this), customer, status);
  }

  function acceptDispute() public {
    require(payable(msg.sender) == platform);
    require(hashCompareWithLengthCheck(status, 'disputed'));
    status = 'open';
    delete mediaAddresses;
    emit contractStatusChanged(address(this), customer, status);
  }

  function rejectDispute() public payable {
    require(msg.sender == platform);
    require(hashCompareWithLengthCheck(status, 'disputed'));
    status = 'closed';
    reporter.transfer(address(this).balance * 95 / 100);
    platform.transfer(address(this).balance * 5 / 100);
    emit contractStatusChanged(address(this), customer, status);
  }

  function closeContract() public {
    require(msg.sender == customer);
    require(hashCompareWithLengthCheck(status, 'open'));
    status = 'closed';
    customer.transfer(address(this).balance);
    emit contractStatusChanged(address(this), customer, status);
  }

  function renewContract(uint newExpiration) public {
    require(msg.sender == customer);
    require(hashCompareWithLengthCheck(status, 'open'));
    require(block.timestamp < newExpiration);
    expires = newExpiration;
    status = 'open';
    emit contractStatusChanged(address(this), customer, status);
  }

  function getMediaAddresses() public view returns (string[] memory) {
    return mediaAddresses;
  }

  function getSummary() public view returns (
    address,
    address,
    uint,
    string memory,
    string memory,
    uint,
    string memory,
    uint,
    string memory,
    string memory,
    string memory,
    string[] memory
  ){
    return (
    customer,
    reporter,
    address(this).balance * 95 / 100,
    task,
    format,
    expires,
    status,
    minimalLength,
    specialInstructions,
    minimalResolution,
    location,
    mediaAddresses
    );
  }

  function hashCompareWithLengthCheck(string memory a, string memory b) internal pure returns (bool)  {
    if (bytes(a).length != bytes(b).length) {
      return false;
    } else {
      return keccak256(abi.encode(a)) == keccak256(abi.encode(b));
    }
  }
}
