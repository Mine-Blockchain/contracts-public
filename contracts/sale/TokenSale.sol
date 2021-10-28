//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import "../interfaces/IPolkamineAdmin.sol";
import "../interfaces/IPToken.sol";

/**
 * @notice Token Sale Contract
 * @author Polkamine
 */
contract TokenSale is ReentrancyGuardUpgradeable {
  using SafeERC20Upgradeable for IERC20Upgradeable;

  /*** Events ***/
  event SetTokenPrice(
    address indexed _purchaseTokenAddress,
    address indexed _depositTokenAddress,
    uint256 _depositTokenAmount
  );
  event SetTokenSupplyAmount(address indexed tokenAddress, uint256 tokenSupplyAmount);
  event Purchase(
    address indexed depositTokenAddress,
    uint256 depositTokenAmount,
    address indexed purchaseTokenAddress,
    uint256 purchaseTokenAmount
  );
  event WithdrawFund(address indexed _tokenAddress, uint256 withdrawAmount);

  /*** Storage Properties ***/
  struct PurchaseInfo {
    address depositTokenAddress;
    uint256 depositTokenAmount;
  }

  mapping(address => PurchaseInfo) public tokenPrice; // token => PurchaseInfo
  mapping(address => uint256) public tokenSupplyAmount; // token => supply
  address public addressManager;

  /*** Contract Logic Starts Here */

  modifier onlyManager() {
    require(msg.sender == IPolkamineAdmin(addressManager).manager(), "Not polkamine manager");
    _;
  }

  modifier onlyOwner() {
    require(msg.sender == IPolkamineAdmin(addressManager).owner(), "Not polkamine owner");
    _;
  }

  function initialize(address _addressManager) public initializer {
    __ReentrancyGuard_init();

    addressManager = _addressManager;
  }

  /**
   * @notice Set the token price
   * @param _purchaseTokenAddress token address to purchase
   * @param _depositTokenAddress token address to deposit
   * @param _depositTokenAmount token amount to deposit
   */
  function setTokenPrice(
    address _purchaseTokenAddress,
    address _depositTokenAddress,
    uint256 _depositTokenAmount
  ) external onlyManager {
    tokenPrice[_purchaseTokenAddress].depositTokenAddress = _depositTokenAddress;
    tokenPrice[_purchaseTokenAddress].depositTokenAmount = _depositTokenAmount;

    emit SetTokenPrice(_purchaseTokenAddress, _depositTokenAddress, _depositTokenAmount);
  }

  /**
   * @notice Purchase tokens
   * @param _purchaseTokenAddress token address to purchase
   * @param _purchaseTokenAmount token amount to purchase
   */
  function purchase(address _purchaseTokenAddress, uint256 _purchaseTokenAmount) external nonReentrant {
    address depositTokenAddress = tokenPrice[_purchaseTokenAddress].depositTokenAddress;
    uint256 depositTokenAmount = tokenPrice[_purchaseTokenAddress].depositTokenAmount;

    require(depositTokenAddress != address(0) && depositTokenAmount > 0, "Invalid purchase");

    IERC20Upgradeable(depositTokenAddress).safeTransferFrom(
      msg.sender,
      address(this),
      depositTokenAmount * _purchaseTokenAmount
    );
    IPToken(_purchaseTokenAddress).mint(msg.sender, _purchaseTokenAmount);

    emit Purchase(depositTokenAddress, depositTokenAmount, _purchaseTokenAddress, _purchaseTokenAmount);
  }

  /**
   * @notice Set token supply amount
   * @param _tokenAddress token address
   * @param _tokenSupplyAmount token supply amount
   */
  function setTokenSupplyAmount(address _tokenAddress, uint256 _tokenSupplyAmount) external onlyManager {
    tokenSupplyAmount[_tokenAddress] = _tokenSupplyAmount;

    emit SetTokenSupplyAmount(_tokenAddress, _tokenSupplyAmount);
  }

  /**
   * @notice Withdraw fund
   * @param _tokenAddress token address to withdraw
   */
  function withdrawFund(address _tokenAddress) external onlyOwner {
    address treasury = IPolkamineAdmin(addressManager).treasury();
    uint256 balance = IERC20Upgradeable(_tokenAddress).balanceOf(address(this));

    IERC20Upgradeable(_tokenAddress).safeTransfer(treasury, balance);

    emit WithdrawFund(_tokenAddress, balance);
  }
}
