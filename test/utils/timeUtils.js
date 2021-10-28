const hre = require("hardhat");

const increaseTime = async (sec) => {
  await hre.network.provider.send("evm_increaseTime", [sec]);
  await hre.network.provider.send("evm_mine");
};

const getTimeStamp = async () => {
  const blockTimestamp = (await hre.network.provider.send("eth_getBlockByNumber", ["0x0", false])).timestamp;
  return parseInt(blockTimestamp.slice(2), 16);
};

const getSnapShot = async () => {
  return await hre.network.provider.send("evm_snapshot");
};

const revertEvm = async (snapshotID) => {
  await hre.network.provider.send("evm_revert", [snapshotID]);
};

module.exports = {
  increaseTime,
  getTimeStamp,
  getSnapShot,
  revertEvm,
};
