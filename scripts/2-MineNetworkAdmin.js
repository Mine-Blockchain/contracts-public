const hre = require("hardhat");
const { ethers, upgrades } = require("hardhat");
const { getSavedContractAddresses, saveContractAddress, saveContractAbis } = require('./utils');
let c = require('../deployments/deploymentConfig.json');

main = async () => {
  // Configs
  const config = c[hre.network.name];

  const managerAddress = config.managerAddress;

  // Deploy MineNetworkAdmin Contract
  const MineNetworkAdmin = await hre.ethers.getContractFactory("MineNetworkAdmin");
  const mineNetworkAdmin = await upgrades.deployProxy(MineNetworkAdmin, [managerAddress]);
  await mineNetworkAdmin.deployed();
  console.log("MineNetworkAdmin contract deployed to:", mineNetworkAdmin.address);
  saveContractAddress(hre.network.name, 'MineNetworkAdmin', mineNetworkAdmin.address);

  const MineNetworkAdminAftifact = await hre.artifacts.readArtifact("MineNetworkAdmin");
  saveContractAbis(hre.network.name, 'MineNetworkAdmin', MineNetworkAdminAftifact.abi, hre.network.name);
};

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
