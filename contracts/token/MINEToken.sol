//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

/**
 * @notice MINE Token Contract
 * @author MineNetwork
 */
contract MINEToken is ERC20Upgradeable, AccessControlUpgradeable {
  /*** Events ***/
  event Mint(address indexed to, uint256 amount);
  event Burn(address indexed from, uint256 amount);

  /*** Constants ***/
  bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
  bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

  /*** Storage Properties ***/

  /*** Contract Logic Starts Here */

  function initialize(string memory name, string memory symbol) public initializer {
    __ERC20_init_unchained(name, symbol);
    __AccessControl_init_unchained();

    // Grant the contract deployer the default admin role: it will be able
    // to grant and revoke any roles
    _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
  }

  /**
   * @notice Mint the token
   * @dev caller must have the minter role
   * @param to address to receive the token minted
   * @param amount token amount to be minted
   */
  function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
    _mint(to, amount);

    emit Mint(to, amount);
  }

  /**
   * @notice Burn `amount` tokens from the caller.
   */
  function burn(uint256 amount) external virtual {
    _burn(msg.sender, amount);

    emit Burn(address(this), amount);
  }

  /**
   * @notice Burn `amount` tokens from `account`, deducting from the caller's allowance
   * @dev caller must have the burner role and have allowance for `from`'s tokens of at least `amount`.
   * @param from address from which the token will be burned
   * @param amount token amount to be burned
   */
  function burnFrom(address from, uint256 amount) external virtual onlyRole(BURNER_ROLE) {
    uint256 currentAllowance = allowance(from, msg.sender);
    require(currentAllowance >= amount, "MINEToken: exceeds allowance");
    _approve(from, msg.sender, currentAllowance - amount);
    _burn(from, amount);

    emit Burn(from, amount);
  }
}
