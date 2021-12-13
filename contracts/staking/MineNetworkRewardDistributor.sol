//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";

import "../interfaces/IMineNetworkRewardDistributor.sol";
import "../interfaces/IMineNetworkPoolManager.sol";
import "../interfaces/IMineNetworkAdmin.sol";

/**
 * @title MineNetwork's Reward Distributor Contract
 * @notice Distribute users the reward
 * @author MineNetwork
 */
contract MineNetworkRewardDistributor is IMineNetworkRewardDistributor, ReentrancyGuardUpgradeable {
  using ECDSAUpgradeable for bytes32;
  using SafeERC20Upgradeable for IERC20Upgradeable;

  /*** Events ***/
  event Deposit(address indexed from, address indexed rewardToken, uint256 amount);
  event Claim(
    address indexed beneficiary,
    uint256 indexed pid,
    address indexed rewardToken,
    uint256 amount,
    address doubleRewardToken,
    uint256 doubleRewardAmount,
    uint256 _claimIndex
  );

  /*** Constants ***/

  /*** Storage Properties ***/
  address public addressManager;
  mapping(address => mapping(uint256 => uint256)) public userLastClaimedAt;
  uint256 public claimInterval;
  uint256 private claimIndex;
  mapping(bytes => bool) private isUsedSignature;

  /*** Contract Logic Starts Here */

  modifier onlyManager() {
    require(msg.sender == IMineNetworkAdmin(addressManager).manager(), "Not MineNetwork manager");
    _;
  }

  modifier onlyRewardDepositor() {
    require(msg.sender == IMineNetworkAdmin(addressManager).rewardDepositor(), "Not reward depositor");
    _;
  }

  modifier onlyMaintainer() {
    require(msg.sender == IMineNetworkAdmin(addressManager).maintainer(), "Not maintainer");
    _;
  }

  modifier onlyUnpaused() {
    require(!IMineNetworkAdmin(addressManager).paused(), "Paused");
    _;
  }

  function initialize(address _addressManager, uint256 _claimInterval) public initializer {
    __ReentrancyGuard_init();

    addressManager = _addressManager;
    claimInterval = _claimInterval;
  }

  /**
   * @notice Deposit reward token to distribute to the stakers
   * @param _rewardToken reward token address
   * @param _amount reward token amount
   */
  function deposit(address _rewardToken, uint256 _amount) external override onlyRewardDepositor onlyUnpaused {
    IERC20Upgradeable(_rewardToken).safeTransferFrom(msg.sender, address(this), _amount);

    emit Deposit(msg.sender, _rewardToken, _amount);
  }

  /**
   * @notice Transfer the staker his reward
   * @param _pid pool index
   * @param _rewardToken reward token address
   * @param _amount reward token amount to claim
   * @param _doubleRewardToken double reward token address
   * @param _doubleRewardAmount double reward token amount to claim
   * @param _claimIndex reward index
   * @param _signature message signature
   */
  function claim(
    uint256 _pid,
    address _rewardToken,
    uint256 _amount,
    address _doubleRewardToken,
    uint256 _doubleRewardAmount,
    uint256 _claimIndex,
    bytes memory _signature
  ) external override nonReentrant onlyUnpaused {
    // check signature duplication
    require(!isUsedSignature[_signature], "Already used signature");
    isUsedSignature[_signature] = true;

    // check reward index
    require(claimIndex == _claimIndex, "Invalid claim index");

    // check reward interval
    require(block.timestamp > userLastClaimedAt[msg.sender][_pid] + claimInterval, "Invalid interval");
    userLastClaimedAt[msg.sender][_pid] = block.timestamp;

    // check signer
    address maintainer = IMineNetworkAdmin(addressManager).maintainer();
    bytes32 data = keccak256(
      abi.encodePacked(msg.sender, _pid, _rewardToken, _amount, _doubleRewardToken, _doubleRewardAmount, _claimIndex)
    );
    require(data.toEthSignedMessageHash().recover(_signature) == maintainer, "Invalid signer");

    // check pid
    address poolManager = IMineNetworkAdmin(addressManager).poolManagerContract();
    require(_pid < IMineNetworkPoolManager(poolManager).poolLength(), "Invalid pid");

    // check rewardToken and doubleRewardToken
    (, address rewardToken, address doubleRewardToken) = IMineNetworkPoolManager(poolManager).pools(_pid);
    require(rewardToken == _rewardToken, "Mismatched reward token");
    require(doubleRewardToken == _doubleRewardToken, "Mismatched double reward token");

    // transfer reward and double reward
    require(IERC20Upgradeable(rewardToken).transfer(msg.sender, _amount), "Transfer failure");
    require(IERC20Upgradeable(doubleRewardToken).transfer(msg.sender, _doubleRewardAmount), "Transfer failure");

    emit Claim(msg.sender, _pid, rewardToken, _amount, doubleRewardToken, _doubleRewardAmount, _claimIndex);
  }

  /**
   * @notice Set the interval valid between reward claim request
   */
  function setClaimInterval(uint256 _claimInterval) external override onlyManager {
    claimInterval = _claimInterval;
  }

  /**
   * @notice Set the claim index
   */
  function setClaimIndex(uint256 _claimIndex) external override onlyMaintainer {
    claimIndex = _claimIndex;
  }
}
