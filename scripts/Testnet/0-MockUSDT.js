const hre = require("hardhat");
const { ethers, upgrades } = require("hardhat");
const { getSavedContractAddresses, saveContractAddress, saveContractAbis } = require('../utils');

main = async () => {
  // Addresses
  [deployer] = await ethers.getSigners();
  console.log('deployer address = ', deployer.address);

  // Deploy Mock USDT Token
  const USDTToken = await hre.ethers.getContractFactory("ERC20Mock");
  const usdtToken = await USDTToken.deploy("Mock USDT Token", "MUT");
  await usdtToken.deployed();
  console.log("Mock USDT token contract deployed to:", usdtToken.address);
  saveContractAddress(hre.network.name, 'Mock USDT', usdtToken.address);

  const usdtTokenAftifact = await hre.artifacts.readArtifact("ERC20Mock");
  saveContractAbis(hre.network.name, 'Mock USDT', usdtTokenAftifact.abi, hre.network.name);
};

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
