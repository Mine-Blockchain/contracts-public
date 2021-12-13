//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IMineNetworkPoolManager {
  function pools(uint256 pid)
    external
    returns (
      address depositToken,
      address rewardToken,
      address doubleRewardToken
    );

  function addPool(
    address _depositToken,
    address _rewardToken,
    address _doubleRewradToken
  ) external returns (uint256);

  function removePool(uint256 _pid) external;

  function poolLength() external view returns (uint256);
}
