const hre = require("hardhat");
const { ethers, upgrades } = require("hardhat");
const { getSavedContractAddresses, saveContractAddress, saveContractAbis } = require('../utils');
let c = require('../../deployments/deploymentConfig.json');

main = async () => {
  // Configs
  const config = c[hre.network.name];

  const managerAddress = config.managerAddress;

  // Deploy PolkamineAdmin Contract
  const PolkamineAdmin = await hre.ethers.getContractFactory("PolkamineAdmin");
  const polkamineAdmin = await upgrades.deployProxy(PolkamineAdmin, [managerAddress]);
  await polkamineAdmin.deployed();
  console.log("PolkamineAdmin contract deployed to:", polkamineAdmin.address);
  saveContractAddress(hre.network.name, 'PolkamineAdmin', polkamineAdmin.address);

  const polkamineAdminAftifact = await hre.artifacts.readArtifact("PolkamineAdmin");
  saveContractAbis(hre.network.name, 'PolkamineAdmin', polkamineAdminAftifact.abi, hre.network.name);
};

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
