const hre = require("hardhat");
const { ethers, upgrades, network } = require("hardhat");
const { toRole } = require("../../test/utils");
const { getSavedContractAddresses, saveContractAddress, saveContractAbis } = require('../utils');
let c = require('../../deployments/deploymentConfig.json');

main = async () => {
  // Configs
  const config = c[hre.network.name];
  const contracts = getSavedContractAddresses()[hre.network.name];

  const ownerAddress = config.ownerAddress;

  // Constants
  const MINTER_ROLE = toRole("MINTER_ROLE");

  // Addresses
  [deployer] = await ethers.getSigners();

  // PToken and MNET token
  const pBTCMAftifact = await hre.artifacts.readArtifact("PToken");
  const pBTCM = await hre.ethers.getContractAt(pBTCMAftifact.abi, contracts["pBTCM"]);

  const pETHMAftifact = await hre.artifacts.readArtifact("PToken");
  const pETHM = await hre.ethers.getContractAt(pETHMAftifact.abi, contracts["pETHM"]);

  const mineAftifact = await hre.artifacts.readArtifact("MINEToken");
  const mine = await hre.ethers.getContractAt(mineAftifact.abi, contracts["MNET"]);

  const defaultAdminRole = await pBTCM.DEFAULT_ADMIN_ROLE();

  await pBTCM.grantRole(defaultAdminRole, ownerAddress);
  await pBTCM.revokeRole(defaultAdminRole, deployer.address);

  await pETHM.grantRole(defaultAdminRole, ownerAddress);
  await pETHM.revokeRole(defaultAdminRole, deployer.address);

  await mine.grantRole(defaultAdminRole, ownerAddress);
  await mine.revokeRole(defaultAdminRole, deployer.address);

  // MineNetworkAdmin
  const MineNetworkAdminAftifact = await hre.artifacts.readArtifact("MineNetworkAdmin");
  const mineNetworkAdmin = await hre.ethers.getContractAt(MineNetworkAdminAftifact.abi, contracts["MineNetworkAdmin"]);

  mineNetworkAdmin.transferOwnership(ownerAddress); 
};

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
