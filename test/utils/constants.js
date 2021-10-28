const { constants } = require("ethers");
const { BigNumber } = require("@ethersproject/bignumber");

const { AddressZero, MaxUint256, One, Two, Zero } = constants;

const ADDRESS_ZERO = AddressZero;
const EMPTY_BYTES = "0x";
const MAX_UINT_256 = MaxUint256;
const ONE = One;
const TWO = Two;
const THREE = BigNumber.from(3);
const ZERO = Zero;
const MAX_INT_256 = "0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
const MIN_INT_256 = "-0x8000000000000000000000000000000000000000000000000000000000000000";
const ONE_DAY_IN_SECONDS = BigNumber.from(60 * 60 * 24);
const ONE_HOUR_IN_SECONDS = BigNumber.from(60 * 60);
const ONE_YEAR_IN_SECONDS = BigNumber.from(31557600);

const PRECISE_UNIT = constants.WeiPerEther;
const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

module.export = {
  ADDRESS_ZERO,
  EMPTY_BYTES,
  MAX_UINT_256,
  ONE,
  TWO,
  THREE,
  ZERO,
  MAX_INT_256,
  MIN_INT_256,
  ONE_DAY_IN_SECONDS,
  ONE_HOUR_IN_SECONDS,
  ONE_YEAR_IN_SECONDS,
  PRECISE_UNIT,
  ETH_ADDRESS,
};
