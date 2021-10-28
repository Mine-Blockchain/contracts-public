const hre = require("hardhat");
const { ethers, upgrades } = require("hardhat");
const { getSavedContractAddresses, saveContractAddress, saveContractAbis } = require('../utils');
let c = require('../../deployments/deploymentConfig.json');

main = async () => {
  // Configs
  const config = c[hre.network.name];

  // Addresses
  [deployer] = await ethers.getSigners();

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

  // Deploy WTokens
  const WToken = await hre.ethers.getContractFactory("WToken");
  const wBTCO = await upgrades.deployProxy(WToken, ["wBTCO", "wBTCO"]);
  await wBTCO.deployed();
  console.log("wBTCO token contract deployed to:", wBTCO.address);
  saveContractAddress(hre.network.name, 'wBTCO', wBTCO.address);

  const wBTCOAftifact = await hre.artifacts.readArtifact("WToken");
  saveContractAbis(hre.network.name, 'wBTCO', wBTCOAftifact.abi, hre.network.name);

  const wETHO = await upgrades.deployProxy(WToken, ["wETHO", "wETHO"]);
  await wETHO.deployed();
  console.log("wETHO token contract deployed to:", wETHO.address);
  saveContractAddress(hre.network.name, 'wETHO', wETHO.address);

  const wETHOAftifact = await hre.artifacts.readArtifact("WToken");
  saveContractAbis(hre.network.name, 'wETHO', wETHOAftifact.abi, hre.network.name);

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
