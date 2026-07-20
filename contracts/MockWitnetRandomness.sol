// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

contract MockWitnetRandomness {
    uint256 public immutable requiredFee;
    uint256 public lastPayment;
    uint256 public lastRandomizeBlock;

    mapping(uint256 blockNumber => bool ready) private randomized;
    mapping(uint256 blockNumber => bytes32 seed) private randomness;
    mapping(bytes32 request => uint32 value) private overrides;

    constructor(uint256 fee) {
        requiredFee = fee;
    }

    function estimateRandomizeFee(uint256) external view returns (uint256) {
        return requiredFee;
    }

    function randomize() external payable returns (uint256) {
        require(msg.value >= requiredFee, "insufficient fee");

        lastPayment = requiredFee;
        lastRandomizeBlock = block.number;

        uint256 unusedFunds = msg.value - requiredFee;
        if (unusedFunds > 0) {
            payable(msg.sender).transfer(unusedFunds);
        }

        return requiredFee;
    }

    function setRandomized(uint256 blockNumber, bytes32 seed) external {
        randomized[blockNumber] = true;
        randomness[blockNumber] = seed;
    }

    function setRandomValue(
        uint256 blockNumber,
        uint256 nonce,
        uint32 value
    ) external {
        overrides[keccak256(abi.encode(blockNumber, nonce))] = value + 1;
    }

    function isRandomized(uint256 blockNumber) external view returns (bool) {
        return randomized[blockNumber];
    }

    function getRandomnessAfter(uint256 blockNumber)
        external
        view
        returns (bytes32)
    {
        require(randomized[blockNumber], "randomness unavailable");
        return randomness[blockNumber];
    }

    function random(
        uint32 range,
        uint256 nonce,
        uint256 blockNumber
    ) external view returns (uint32) {
        require(range > 0, "invalid range");
        require(randomized[blockNumber], "randomness unavailable");

        uint32 overrideValue = overrides[keccak256(abi.encode(blockNumber, nonce))];
        if (overrideValue > 0) {
            return (overrideValue - 1) % range;
        }

        return uint32(
            uint256(keccak256(abi.encode(randomness[blockNumber], nonce))) % range
        );
    }
}