const { ethers } = require("ethers");
const { BigNumber } = require("@ethersproject/bignumber");

const ether = (amount) => {
  const weiString = ethers.utils.parseEther(amount.toString());
  return BigNumber.from(weiString);
};

const gWei = (amount) => {
  const weiString = BigNumber.from("1000000000").mul(amount);
  return BigNumber.from(weiString);
};

const usdc = (amount) => {
  const weiString = BigNumber.from("1000000").mul(amount);
  return BigNumber.from(weiString);
};

const bigNumber = (amount) => {
  return BigNumber.from(amount);
};

module.exports = {
  ether,
  gWei,
  usdc,
  bigNumber,
};
