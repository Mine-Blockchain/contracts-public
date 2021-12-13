const hre = require("hardhat");
const { ethers, upgrades } = require("hardhat");
const { getSavedContractAddresses, saveContractAddress, saveContractAbis } = require('./utils');
let c = require('../deployments/deploymentConfig.json');

main = async () => {
  // Configs
  const config = c[hre.network.name];

  const claimInterval = config.claimInterval;

  // Deploy MineNetworkPoolManager Contract
  const MineNetworkPoolManager = await hre.ethers.getContractFactory("MineNetworkPoolManager");
  const mineNetworkPoolManager = await upgrades.deployProxy(MineNetworkPoolManager, [contracts["MineNetworkAdmin"]]);
  await mineNetworkPoolManager.deployed();
  console.log("MineNetworkPoolManager contract deployed to:", mineNetworkPoolManager.address);
  saveContractAddress(hre.network.name, 'MineNetworkPoolManager', mineNetworkPoolManager.address);

  const MineNetworkPoolManagerAftifact = await hre.artifacts.readArtifact("MineNetworkPoolManager");
  saveContractAbis(hre.network.name, 'MineNetworkPoolManager', MineNetworkPoolManagerAftifact.abi, hre.network.name);

  // Deploy MineNetworkRewardDistributor
  const MineNetworkRewardDistributor = await hre.ethers.getContractFactory("MineNetworkRewardDistributor");
  const mineNetworkRewardDistributor = await upgrades.deployProxy(MineNetworkRewardDistributor, [
    contracts["MineNetworkAdmin"],
    claimInterval,
  ]);
  await mineNetworkRewardDistributor.deployed();
  console.log("MineNetworkRewardDistributor contract deployed to:", mineNetworkRewardDistributor.address);
  saveContractAddress(hre.network.name, 'MineNetworkRewardDistributor', mineNetworkRewardDistributor.address);

  const MineNetworkRewardDistributorAftifact = await hre.artifacts.readArtifact("MineNetworkRewardDistributor");
  saveContractAbis(hre.network.name, 'MineNetworkRewardDistributor', MineNetworkRewardDistributorAftifact.abi, hre.network.name);

  // Deploy TokenSale
  const TokenSale = await hre.ethers.getContractFactory("TokenSale");
  const tokenSale = await upgrades.deployProxy(TokenSale, [contracts["MineNetworkAdmin"]]);
  await tokenSale.deployed();
  console.log("TokenSale contract deployed to:", tokenSale.address);
  saveContractAddress(hre.network.name, 'TokenSale', tokenSale.address);

  const tokenSaleAftifact = await hre.artifacts.readArtifact("TokenSale");
  saveContractAbis(hre.network.name, 'TokenSale', tokenSaleAftifact.abi, hre.network.name);
};

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
