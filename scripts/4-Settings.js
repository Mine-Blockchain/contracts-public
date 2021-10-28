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

  // Register addresses to PolkamineAdmin
  const polkamineAdminAftifact = await hre.artifacts.readArtifact("PolkamineAdmin");
  const polkamineAdmin = await hre.ethers.getContractAt(polkamineAdminAftifact.abi, contracts["PolkamineAdmin"]);

  await polkamineAdmin.setRewardDepositor(rewardDepositorAddress);
  await polkamineAdmin.setMaintainer(maintainerAddress);
  await polkamineAdmin.setTreasury(treasuryAddress);
  await polkamineAdmin.setRewardDistributorContract(contracts["PolkamineRewardDistributor"]);
  await polkamineAdmin.setPoolManagerContract(contracts["PolkaminePoolManager"]);

  // Add pools
  const wBTC = config.wBTC;
  const wETH = config.wETH;

  const polkaminePoolManagerArtifact = await hre.artifacts.readArtifact("PolkaminePoolManager");
  const polkaminePoolManager = await hre.ethers.getContractAt(polkaminePoolManagerArtifact.abi, contracts["PolkaminePoolManager"]);

  // await polkaminePoolManager.connect(manager).addPool(pBTCM.address, wBTC.address, mine.address);
  // await polkaminePoolManager.connect(manager).addPool(pETHM.address, wETH.address, mine.address);

  
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
  // await polkamineRewardDistributor.connect(maintainer).setClaimIndex(claimIndex);
};

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
