//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IMineNetworkRewardDistributor {
  function deposit(address _rewardToken, uint256 _amount) external;

  function claim(
    uint256 _pid,
    address _rewardToken,
    uint256 _amount,
    address _doubleRewardToken,
    uint256 _doubleRewardAmount,
    uint256 _claimIndex,
    bytes memory signature
  ) external;

  function setClaimInterval(uint256 _claimInterval) external;

  function setClaimIndex(uint256 _claimIndex) external;
}
