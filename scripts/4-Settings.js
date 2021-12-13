const hre = require("hardhat");
const { ethers, upgrades } = require("hardhat");
const { toRole } = require("../test/utils");
const { getSavedContractAddresses, saveContractAddress, saveContractAbis } = require('./utils');
let c = require('../deployments/deploymentConfig.json');

main = async () => {
  // Configs
  const config = c[hre.network.name];
  const contracts = getSavedContractAddresses()[hre.network.name];

  const ownerAddress = config.ownerAddress;
  const treasuryAddress = config.treasuryAddress;
  const rewardDepositorAddress = config.rewardDepositorAddress;
  const maintainerAddress = config.maintainerAddress;
  const usdtAddress = config.USDT;
  const pBTCMPrice = config.pBTCMPrice;
  const pETHMPrice = config.pETHMPrice;

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

  // await mineNetworkPoolManager.connect(manager).addPool(pBTCM.address, wBTC.address, mine.address);
  // await mineNetworkPoolManager.connect(manager).addPool(pETHM.address, wETH.address, mine.address);

  
  // Grant roles to PTokens and MINE Token
  const pBTCMArtifact = await hre.artifacts.readArtifact("PToken");
  const pBTCM = await hre.ethers.getContractAt(pBTCMArtifact.abi, contracts["pBTCM"]);

  const pETHMAftifact = await hre.artifacts.readArtifact("PToken");
  const pETHM = await hre.ethers.getContractAt(pETHMAftifact.abi, contracts["pETHM"]);

  const mineAftifact = await hre.artifacts.readArtifact("MINEToken");
  const mine = await hre.ethers.getContractAt(mineAftifact.abi, contracts["MNET"]);

  await pBTCM.grantRole(MINTER_ROLE, tokenSale.address);
  await pETHM.grantRole(MINTER_ROLE, tokenSale.address);
  await mine.grantRole(MINTER_ROLE, ownerAddress);

  // Set PToken Prices
  const tokenSaleAftifact = await hre.artifacts.readArtifact("TokenSale");
  const tokenSale = await hre.ethers.getContractAt(tokenSaleAftifact.abi, contracts["TokenSale"]);

  await tokenSale.setTokenPrice(pBTCM.address, usdtAddress, pBTCMPrice);
  await tokenSale.setTokenPrice(pETHM.address, usdtAddress, pETHMPrice);

  // Set PToken TotalSupply
  await tokenSale.setTokenSupplyAmount(pBTCM.address, ether(pBTCMSupply));
  await tokenSale.setTokenSupplyAmount(pETHM.address, ether(pETHMSupply));

  // // Set claimIndex
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
