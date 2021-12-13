const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { toRole, increaseTime, ZERO, bigNumber } = require("../utils");

describe("TokenSale", () => {
  let pBTCM, pETHM, depositToken, mineNetworkAdmin, tokenSale;

  const MINTER_ROLE = toRole("MINTER_ROLE");
  const BURNER_ROLE = toRole("BURNER_ROLE");
  const MINT_AMOUNT = 10000;

  beforeEach(async () => {
    [deployer, alice, bob, manager, treasury] = await ethers.getSigners();

    // Deploy PToken
    const PToken = await ethers.getContractFactory("PToken");
    pBTCM = await upgrades.deployProxy(PToken, ["pBTCM", "pBTCM"]);
    pETHM = await upgrades.deployProxy(PToken, ["pETHM", "pETHM"]);

    // Deploy depositToken
    const DepositToken = await ethers.getContractFactory("MINEToken");
    depositToken = await upgrades.deployProxy(DepositToken, ["MDT", "Mock Deposit Token"]);

    // Deploy MineNetworkAdmin
    const MineNetworkAdmin = await ethers.getContractFactory("MineNetworkAdmin");
    mineNetworkAdmin = await upgrades.deployProxy(MineNetworkAdmin, [manager.address]);

    // Deploy TokenSale
    const TokenSale = await ethers.getContractFactory("TokenSale");
    tokenSale = await upgrades.deployProxy(TokenSale, [mineNetworkAdmin.address]);

    // Add treasury address to MineNetworkAdmin
    mineNetworkAdmin.setTreasury(treasury.address);

    // Mint depositToken and rewardToken
    await pBTCM.grantRole(MINTER_ROLE, tokenSale.address);
    await pETHM.grantRole(MINTER_ROLE, tokenSale.address);
  });

  describe("Set Token Price", async () => {
    it("Should not set token price by non manager", async () => {
      let depositTokenAmount = 100;

      await expect(tokenSale.setTokenPrice(pBTCM.address, depositToken.address, depositTokenAmount)).to.be.revertedWith(
        "Not MineNetwork manager",
      );
    });

    it("Should set token price by manager", async () => {
      let depositTokenAmount = 100;

      await tokenSale.connect(manager).setTokenPrice(pBTCM.address, depositToken.address, depositTokenAmount);
      expect(await tokenSale.tokenPrice(pBTCM.address)).to.be.deep.equal([
        depositToken.address,
        bigNumber(depositTokenAmount),
      ]);
    });
  });

  describe("Set Token Supply Amount", async () => {
    it("Should not set token price by non manager", async () => {
      let tokenSupplyAmount = 10000;

      await expect(tokenSale.setTokenSupplyAmount(pBTCM.address, tokenSupplyAmount)).to.be.revertedWith(
        "Not MineNetwork manager",
      );
    });

    it("Should set token supply amount by manager", async () => {
      let tokenSupplyAmount = 10000;

      await tokenSale.connect(manager).setTokenSupplyAmount(pBTCM.address, tokenSupplyAmount);
      expect(await tokenSale.tokenSupplyAmount(pBTCM.address)).to.be.equal(tokenSupplyAmount);
    });
  });

  describe("Purchase", async () => {
    it("Should purchase tokens", async () => {
      // set token price
      let depositTokenAmount = 100;
      await tokenSale.connect(manager).setTokenPrice(pBTCM.address, depositToken.address, depositTokenAmount);

      // mint depositToken to users
      await depositToken.grantRole(MINTER_ROLE, deployer.address);
      await depositToken.mint(alice.address, MINT_AMOUNT);

      // purchase
      let purchaseTokenAmount = 10;

      expect(await pBTCM.balanceOf(alice.address)).to.be.equal(0);
      depositToken.connect(alice).approve(tokenSale.address, depositTokenAmount * purchaseTokenAmount);
      await tokenSale.connect(alice).purchase(pBTCM.address, purchaseTokenAmount);
      expect(await pBTCM.balanceOf(alice.address)).to.be.equal(purchaseTokenAmount);
    });

    it("Should not purchase tokens if deposit token amount is not enough", async () => {
      // set token price
      let depositTokenAmount = 100;
      await tokenSale.connect(manager).setTokenPrice(pBTCM.address, depositToken.address, depositTokenAmount);

      // mint depositToken to users
      await depositToken.grantRole(MINTER_ROLE, deployer.address);
      await depositToken.mint(alice.address, MINT_AMOUNT);

      // purchase
      let purchaseTokenAmount = 10;

      expect(await pBTCM.balanceOf(alice.address)).to.be.equal(0);
      depositToken.connect(alice).approve(tokenSale.address, depositTokenAmount * purchaseTokenAmount - 1);
      await expect(tokenSale.connect(alice).purchase(pBTCM.address, purchaseTokenAmount)).to.be.revertedWith(
        "ERC20: transfer amount exceeds allowance",
      );
    });

    it("Should not purchase tokens if purchase token amount is exceeded", async () => {
      // set token price
      let depositTokenAmount = 100;
      await tokenSale.connect(manager).setTokenPrice(pBTCM.address, depositToken.address, depositTokenAmount);

      // mint depositToken to users
      await depositToken.grantRole(MINTER_ROLE, deployer.address);
      await depositToken.mint(alice.address, MINT_AMOUNT);

      // purchase
      let purchaseTokenAmount = 10;

      expect(await pBTCM.balanceOf(alice.address)).to.be.equal(0);
      depositToken.connect(alice).approve(tokenSale.address, depositTokenAmount * purchaseTokenAmount);
      await expect(tokenSale.connect(alice).purchase(pBTCM.address, purchaseTokenAmount + 1)).to.be.revertedWith(
        "ERC20: transfer amount exceeds allowance",
      );
    });

    it("Should not purchase tokens if token price is not set", async () => {
      let depositTokenAmount = 100;

      // mint depositToken to users
      await depositToken.grantRole(MINTER_ROLE, deployer.address);
      await depositToken.mint(alice.address, MINT_AMOUNT);

      // purchase
      let purchaseTokenAmount = 10;

      expect(await pETHM.balanceOf(alice.address)).to.be.equal(0);
      depositToken.connect(alice).approve(tokenSale.address, depositTokenAmount * purchaseTokenAmount);
      await expect(tokenSale.connect(alice).purchase(pETHM.address, purchaseTokenAmount)).to.be.revertedWith(
        "Invalid purchase",
      );
    });

    it("Should not purchase tokens if token price is zero", async () => {
      // set token price
      let depositTokenAmount = 0;
      await tokenSale.connect(manager).setTokenPrice(pBTCM.address, depositToken.address, depositTokenAmount);

      // mint depositToken to users
      await depositToken.grantRole(MINTER_ROLE, deployer.address);
      await depositToken.mint(alice.address, MINT_AMOUNT);

      // purchase
      let purchaseTokenAmount = 10;

      expect(await pBTCM.balanceOf(alice.address)).to.be.equal(0);
      depositToken.connect(alice).approve(tokenSale.address, depositTokenAmount * purchaseTokenAmount);
      await expect(tokenSale.connect(alice).purchase(pBTCM.address, purchaseTokenAmount)).to.be.revertedWith(
        "Invalid purchase",
      );
    });

    it("Should not purchase tokens if depositToken is mismatched", async () => {
      // set token price
      let depositTokenAmount = 100;
      await tokenSale.connect(manager).setTokenPrice(pBTCM.address, depositToken.address, depositTokenAmount);

      // mint depositToken to users
      await pETHM.grantRole(MINTER_ROLE, deployer.address);
      await pETHM.mint(alice.address, MINT_AMOUNT);

      // purchase
      let purchaseTokenAmount = 10;

      expect(await pBTCM.balanceOf(alice.address)).to.be.equal(0);
      pETHM.connect(alice).approve(tokenSale.address, depositTokenAmount * purchaseTokenAmount);
      await expect(tokenSale.connect(alice).purchase(pBTCM.address, purchaseTokenAmount)).to.be.revertedWith(
        "ERC20: transfer amount exceeds balance",
      );
    });
  });

  describe("Withdraw Fund", async () => {
    it("Should not withdraw fund by non owner", async () => {
      // set token price
      let pBTCMDepositTokenAmount = 100;
      await tokenSale.connect(manager).setTokenPrice(pBTCM.address, depositToken.address, pBTCMDepositTokenAmount);

      // mint depositToken to users
      await depositToken.grantRole(MINTER_ROLE, deployer.address);
      await depositToken.mint(alice.address, MINT_AMOUNT);

      // purchase
      let pBTCMPurchaseTokenAmount = 10;

      expect(await depositToken.balanceOf(treasury.address)).to.be.equal(0);
      // purchase pBTCM
      await depositToken.connect(alice).approve(tokenSale.address, pBTCMDepositTokenAmount * pBTCMPurchaseTokenAmount);
      await tokenSale.connect(alice).purchase(pBTCM.address, pBTCMPurchaseTokenAmount);
      await expect(tokenSale.connect(manager).withdrawFund(depositToken.address)).to.be.revertedWith(
        "Not MineNetwork owner",
      );
    });

    it("Should withdraw fund by owner", async () => {
      // set token price
      let pBTCMDepositTokenAmount = 100;
      let pETHMDepositTokenAmount = 300;
      await tokenSale.connect(manager).setTokenPrice(pBTCM.address, depositToken.address, pBTCMDepositTokenAmount);
      await tokenSale.connect(manager).setTokenPrice(pETHM.address, depositToken.address, pETHMDepositTokenAmount);

      // mint depositToken to users
      await depositToken.grantRole(MINTER_ROLE, deployer.address);
      await depositToken.mint(alice.address, MINT_AMOUNT);

      // purchase
      let pBTCMPurchaseTokenAmount = 10;
      let pETHMPurchaseTokenAmount = 20;

      expect(await depositToken.balanceOf(treasury.address)).to.be.equal(0);
      // purchase pBTCM
      await depositToken.connect(alice).approve(tokenSale.address, pBTCMDepositTokenAmount * pBTCMPurchaseTokenAmount);
      await tokenSale.connect(alice).purchase(pBTCM.address, pBTCMPurchaseTokenAmount);
      await tokenSale.withdrawFund(depositToken.address);
      expect(await depositToken.balanceOf(treasury.address)).to.be.equal(
        pBTCMDepositTokenAmount * pBTCMPurchaseTokenAmount,
      );

      // purchase pETHM
      await depositToken.connect(alice).approve(tokenSale.address, pETHMDepositTokenAmount * pETHMPurchaseTokenAmount);
      await tokenSale.connect(alice).purchase(pETHM.address, pETHMPurchaseTokenAmount);
      await tokenSale.withdrawFund(depositToken.address);
      expect(await depositToken.balanceOf(treasury.address)).to.be.equal(
        pBTCMDepositTokenAmount * pBTCMPurchaseTokenAmount + pETHMDepositTokenAmount * pETHMPurchaseTokenAmount,
      );
    });
  });
});
