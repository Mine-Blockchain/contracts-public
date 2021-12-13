//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";

/**
 * @title MineNetwork's Admin contract
 * @author MineNetwork
 */
contract MineNetworkAdmin is PausableUpgradeable, OwnableUpgradeable {
  /*** Storage Properties ***/

  // MineNetwork manager addresses
  address public manager;
  address public rewardDepositor;
  address public maintainer;
  address public treasury;

  // MineNetwork contracts
  address public rewardDistributorContract;
  address public poolManagerContract;

  /*** Contract Logic Starts Here */

  modifier onlyManager() {
    require(msg.sender == manager, "Not MineNetwork manager");
    _;
  }

  function initialize(address _manager) public initializer {
    __Ownable_init();
    __Pausable_init();

    manager = _manager;
  }

  /**
   * @notice set manager
   * @param _manager the manager address
   */
  function setManager(address _manager) external onlyOwner {
    manager = _manager;
  }

  /**
   * @notice set reward depositor
   * @param _rewardDepositor the depositor address
   */
  function setRewardDepositor(address _rewardDepositor) external onlyOwner {
    rewardDepositor = _rewardDepositor;
  }

  /**
   * @notice set reward distributor contract
   * @param _rewardDistributorContract the reward distributor contract address
   */
  function setRewardDistributorContract(address _rewardDistributorContract) external onlyOwner {
    rewardDistributorContract = _rewardDistributorContract;
  }

  /**
   * @notice set pool manager contract
   * @param _poolManagerContract the pool manager contract address
   */
  function setPoolManagerContract(address _poolManagerContract) external onlyOwner {
    poolManagerContract = _poolManagerContract;
  }

  /**
   * @notice set maintainer address
   * @param _maintainer maintainer address
   */
  function setMaintainer(address _maintainer) external onlyOwner {
    maintainer = _maintainer;
  }

  /**
   * @notice set treasury address
   * @param _treasury treasury address
   */
  function setTreasury(address _treasury) external onlyOwner {
    treasury = _treasury;
  }

  /**
   * @notice Pause protocol
   */
  function pause() external onlyManager {
    _pause();
  }

  /**
   * @notice Unpause protocol
   */
  function unpause() external onlyManager {
    _unpause();
  }
}
