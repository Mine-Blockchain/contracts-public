//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import "../interfaces/IMineNetworkPoolManager.sol";
import "../interfaces/IMineNetworkAdmin.sol";

/**
 * @title MineNetwork's Pool Manager contract
 * @author MineNetwork
 */
contract MineNetworkPoolManager is IMineNetworkPoolManager, ReentrancyGuardUpgradeable {
  using SafeERC20Upgradeable for IERC20Upgradeable;

  /*** Events ***/
  event AddPool(uint256 pid, address indexed depositToken, address indexed rewardToken);
  event RemovePool(uint256 pid);
  event StakeChange(uint256 pid, address indexed user, uint256 fromAmount, uint256 toAmount);

  /*** Constants ***/

  /*** Storage Properties ***/
  struct PoolInfo {
    address depositToken;
    address rewardToken;
    address doubleRewardToken;
  }

  address public addressManager;
  PoolInfo[] public override pools;
  mapping(uint256 => mapping(address => uint256)) public userStakes;
  mapping(uint256 => uint256) public poolStakes;
  mapping(uint256 => bool) public isDeprecatedPool;

  /*** Contract Logic Starts Here */

  modifier onlyManager() {
    require(msg.sender == IMineNetworkAdmin(addressManager).manager(), "Not MineNetwork manager");
    _;
  }

  modifier onlyUnpaused() {
    require(!IMineNetworkAdmin(addressManager).paused(), "Paused");
    _;
  }

  function initialize(address _addressManager) public initializer {
    __ReentrancyGuard_init();

    addressManager = _addressManager;
  }

  /**
   * @notice Add a new pool
   * @param _depositToken deposit token address
   * @param _rewardToken reward token address
   * @param _doubleRewardToken double reward token address
   */
  function addPool(
    address _depositToken,
    address _rewardToken,
    address _doubleRewardToken
  ) external override onlyManager returns (uint256 pid) {
    pools.push(PoolInfo(_depositToken, _rewardToken, _doubleRewardToken));
    pid = pools.length - 1;

    emit AddPool(pid, _depositToken, _rewardToken);
  }

  /**
   * @notice Remove a pool
   * @param _pid the pool index to be removed
   */
  function removePool(uint256 _pid) external override onlyManager {
    require(_pid < pools.length, "Invalid pool index");

    // remove pool
    isDeprecatedPool[_pid] = true;

    emit RemovePool(_pid);
  }

  /**
   * @notice stake depositToken
   * @param _amount the stake amount
   */
  function stake(uint256 _pid, uint256 _amount) external onlyUnpaused {
    require(_pid < pools.length, "Invalid pool index");
    require(_amount > 0, "Invalid amount");

    IERC20Upgradeable(pools[_pid].depositToken).safeTransferFrom(msg.sender, address(this), _amount);

    uint256 fromAmount = userStakes[_pid][msg.sender];
    userStakes[_pid][msg.sender] = fromAmount + _amount;
    poolStakes[_pid] += _amount;

    emit StakeChange(_pid, msg.sender, fromAmount, userStakes[_pid][msg.sender]);
  }

  /**
   * @notice unstake depositToken
   * @param _amount the unstake amount
   */
  function unstake(uint256 _pid, uint256 _amount) external nonReentrant onlyUnpaused {
    require(_pid < pools.length, "Invalid pool index");
    require(_amount > 0 && _amount <= userStakes[_pid][msg.sender], "Invalid amount");

    uint256 fromAmount = userStakes[_pid][msg.sender];
    userStakes[_pid][msg.sender] = fromAmount - _amount;
    poolStakes[_pid] -= _amount;
    IERC20Upgradeable(pools[_pid].depositToken).safeTransfer(msg.sender, _amount);

    emit StakeChange(_pid, msg.sender, fromAmount, userStakes[_pid][msg.sender]);
  }

  /**
   * @notice Returns the length of the pool
   */
  function poolLength() external view override returns (uint256) {
    return pools.length;
  }
}
