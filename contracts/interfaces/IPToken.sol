//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IPToken {
  function mint(address to, uint256 amount) external;

  function burn(uint256 amount) external;
}
