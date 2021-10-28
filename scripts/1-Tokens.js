const hre = require("hardhat");
const { ethers, upgrades } = require("hardhat");
const { getSavedContractAddresses, saveContractAddress, saveContractAbis } = require('./utils');
let c = require('../deployments/deploymentConfig.json');

main = async () => {
  // Configs
  const config = c[hre.network.name];

  // Addresses
  [deployer] = await ethers.getSigners();
  console.log('deployer address = ', deployer.address);

  // Deploy PTokens
  const PToken = await hre.ethers.getContractFactory("PToken");
  const pBTCM = await upgrades.deployProxy(PToken, ["pBTCM", "pBTCM"]);
  await pBTCM.deployed();
  console.log("pBTCM token contract deployed to:", pBTCM.address);
  saveContractAddress(hre.network.name, 'pBTCM', pBTCM.address);

  const pBTCMAftifact = await hre.artifacts.readArtifact("PToken");
  saveContractAbis(hre.network.name, 'pBTCM', pBTCMAftifact.abi, hre.network.name);

  const pETHM = await upgrades.deployProxy(PToken, ["pETHM", "pETHM"]);
  await pETHM.deployed();
  console.log("pETHM token contract deployed to:", pETHM.address);
  saveContractAddress(hre.network.name, 'pETHM', pETHM.address);

  const pETHMAftifact = await hre.artifacts.readArtifact("PToken");
  saveContractAbis(hre.network.name, 'pETHM', pETHMAftifact.abi, hre.network.name);

  // Use WTokens
  const wBTC = config.wBTC;
  saveContractAddress(hre.network.name, 'Wrapped BTC', wBTC);

  const wETH = config.wETH;
  saveContractAddress(hre.network.name, 'Wrapped Ether', wETH);

  // Deploy MNET Token
  const MINEToken = await hre.ethers.getContractFactory("MINEToken");
  const mine = await upgrades.deployProxy(MINEToken, ["MNET", "MNET"]);
  await mine.deployed();
  console.log("MNET token contract deployed to:", mine.address);
  saveContractAddress(hre.network.name, 'MNET', mine.address);

  const mineAftifact = await hre.artifacts.readArtifact("MINEToken");
  saveContractAbis(hre.network.name, 'MNET', mineAftifact.abi, hre.network.name);
};

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
