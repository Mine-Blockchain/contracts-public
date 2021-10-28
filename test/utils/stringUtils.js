const { ethers } = require("ethers");

const toRole = (role) => {
  return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(role));
};

module.exports = {
  toRole,
};
