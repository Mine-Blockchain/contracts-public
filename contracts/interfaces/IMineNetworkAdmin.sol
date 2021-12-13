//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IMineNetworkAdmin {
  function manager() external view returns (address);

  function owner() external view returns (address);

  function rewardDepositor() external view returns (address);

  function maintainer() external view returns (address);

  function rewardDistributorContract() external view returns (address);

  function poolManagerContract() external view returns (address);

  function treasury() external view returns (address);

  function paused() external view returns (bool);
}
