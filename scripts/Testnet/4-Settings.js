const hre = require("hardhat");
const { ethers, upgrades, network } = require("hardhat");
const { toRole, ether } = require("../../test/utils");
const { getSavedContractAddresses, saveContractAddress, saveContractAbis } = require('../utils');
let c = require('../../deployments/deploymentConfig.json');

impersonateAccountAndSetBalance = async (address) => {
  // impersonate
  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [address],
  });
  const account = await ethers.getSigner(address);

  // set ETH balance
  await network.provider.send("hardhat_setBalance", [
    address,
    "0x21E19E0C9BAB2400000" // 10000 ETH
  ])
  
  return account;
}

main = async () => {
  // Configs
  const config = c[hre.network.name];
  const contracts = getSavedContractAddresses()[hre.network.name];

  const ownerAddress = config.ownerAddress;
  const managerAddress = config.managerAddress;
  const treasuryAddress = config.treasuryAddress;
  const rewardDepositorAddress = config.rewardDepositorAddress;
  const maintainerAddress = config.maintainerAddress;
  const usdtAddress = config.USDT;
  const pBTCMPrice = config.pBTCMPrice;
  const pETHMPrice = config.pETHMPrice;
  const claimIndex = config.claimIndex;
  const pBTCMSupply = config.pBTCMSupply;
  const pETHMSupply = config.pETHMSupply;

  // Constants
  const MINTER_ROLE = toRole("MINTER_ROLE");

  // Addresses
  [deployer] = await ethers.getSigners();

  // Register addresses to MineNetworkAdmin
  const MineNetworkAdminAftifact = await hre.artifacts.readArtifact("MineNetworkAdmin");
  const mineNetworkAdmin = await hre.ethers.getContractAt(MineNetworkAdminAftifact.abi, contracts["MineNetworkAdmin"]);

  await mineNetworkAdmin.setRewardDepositor(rewardDepositorAddress);
  await mineNetworkAdmin.setMaintainer(maintainerAddress);
  await mineNetworkAdmin.setTreasury(treasuryAddress);
  await mineNetworkAdmin.setRewardDistributorContract(contracts["MineNetworkRewardDistributor"]);
  await mineNetworkAdmin.setPoolManagerContract(contracts["MineNetworkPoolManager"]);

  // Add pools
  const wBTC = config.wBTC;
  const wETH = config.wETH;

  const MineNetworkPoolManagerArtifact = await hre.artifacts.readArtifact("MineNetworkPoolManager");
  const mineNetworkPoolManager = await hre.ethers.getContractAt(MineNetworkPoolManagerArtifact.abi, contracts["MineNetworkPoolManager"]);

  const pBTCMAftifact = await hre.artifacts.readArtifact("PToken");
  const pBTCM = await hre.ethers.getContractAt(pBTCMAftifact.abi, contracts["pBTCM"]);

  const pETHMAftifact = await hre.artifacts.readArtifact("PToken");
  const pETHM = await hre.ethers.getContractAt(pETHMAftifact.abi, contracts["pETHM"]);

  const mineAftifact = await hre.artifacts.readArtifact("MINEToken");
  const mine = await hre.ethers.getContractAt(mineAftifact.abi, contracts["MNET"]);

  // const manager = await impersonateAccountAndSetBalance(managerAddress);
  // await mineNetworkPoolManager.connect(manager).addPool(pBTCM.address, wBTC.address, mine.address);
  // await mineNetworkPoolManager.connect(manager).addPool(pETHM.address, wETH.address, mine.address);

  
  // Grant roles to PTokens and MINE Token
  const tokenSaleAftifact = await hre.artifacts.readArtifact("TokenSale");
  const tokenSale = await hre.ethers.getContractAt(tokenSaleAftifact.abi, contracts["TokenSale"]);

  await pBTCM.grantRole(MINTER_ROLE, tokenSale.address);
  await pETHM.grantRole(MINTER_ROLE, tokenSale.address);
  await mine.grantRole(MINTER_ROLE, ownerAddress);

  // Set PToken Prices
  await tokenSale.setTokenPrice(pBTCM.address, usdtAddress, pBTCMPrice);
  await tokenSale.setTokenPrice(pETHM.address, usdtAddress, pETHMPrice);

  // Set PToken TotalSupply
  await tokenSale.setTokenSupplyAmount(pBTCM.address, ether(pBTCMSupply));
  await tokenSale.setTokenSupplyAmount(pETHM.address, ether(pETHMSupply));

  // Set claimIndex
  // const MineNetworkRewardDistributorAftifact = await hre.artifacts.readArtifact("MineNetworkRewardDistributor");
  // const mineNetworkRewardDistributor = await hre.ethers.getContractAt(MineNetworkRewardDistributorAftifact.abi, contracts["MineNetworkRewardDistributor"]);

  // const maintainer = await impersonateAccountAndSetBalance(maintainerAddress);
  // await mineNetworkRewardDistributor.connect(maintainer).setClaimIndex(claimIndex);
};

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
