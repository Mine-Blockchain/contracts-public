const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { toRole, increaseTime } = require("../utils");

describe("MineNetwork Pool Manage", () => {
  let pBTCM,
    pETHM,
    wBTCO,
    wETHO,
    mine,
    pBTCMPool,
    pETHMPool,
    mineNetworkAdmin,
    mineNetworkPoolManager,
    mineNetworkRewardDistributor,
    rewardInterval;

  const MINTER_ROLE = toRole("MINTER_ROLE");
  const BURNER_ROLE = toRole("BURNER_ROLE");
  const MINT_AMOUNT = 100;

  before(async () => {
    [deployer, alice, bob, manager, rewardDepositor, maintainer] = await ethers.getSigners();

    // Deploy PToken
    const PToken = await ethers.getContractFactory("PToken");
    pBTCM = await upgrades.deployProxy(PToken, ["pBTCM", "pBTCM"]);
    pETHM = await upgrades.deployProxy(PToken, ["pETHM", "pETHM"]);

    // Deploy WToken
    const WToken = await ethers.getContractFactory("WToken");
    wBTCO = await upgrades.deployProxy(WToken, ["wBTCO", "wBTCO"]);
    wETHO = await upgrades.deployProxy(WToken, ["wETHO", "wETHO"]);

    // Deploy MINE Token
    const MINEToken = await ethers.getContractFactory("MINEToken");
    mine = await upgrades.deployProxy(MINEToken, ["MINE", "MINE"]);

    // Deploy MineNetworkAdmin
    const MineNetworkAdmin = await ethers.getContractFactory("MineNetworkAdmin");
    mineNetworkAdmin = await upgrades.deployProxy(MineNetworkAdmin, [manager.address]);

    // Deploy MineNetworkPoolManager
    const MineNetworkPoolManager = await ethers.getContractFactory("MineNetworkPoolManager");
    mineNetworkPoolManager = await upgrades.deployProxy(MineNetworkPoolManager, [mineNetworkAdmin.address]);

    // Deploy MineNetworkRewardDistributor ans set the address to MineNetworkAdmin
    rewardInterval = 43200; // half day
    const MineNetworkRewardDistributor = await ethers.getContractFactory("MineNetworkRewardDistributor");
    mineNetworkRewardDistributor = await upgrades.deployProxy(MineNetworkRewardDistributor, [
      mineNetworkAdmin.address,
      rewardInterval,
    ]);

    await mineNetworkAdmin.setManager(manager.address);

    await mineNetworkAdmin.setRewardDistributorContract(mineNetworkRewardDistributor.address);

    // Set PoolManager, RewardDepositor and Maintainer
    await mineNetworkAdmin.setPoolManagerContract(mineNetworkPoolManager.address);
    await mineNetworkAdmin.setRewardDepositor(rewardDepositor.address);
    await mineNetworkAdmin.setMaintainer(maintainer.address);

    // Mint depositToken and rewardToken
    await pBTCM.grantRole(MINTER_ROLE, deployer.address);
    await pETHM.grantRole(MINTER_ROLE, deployer.address);

    await pBTCM.mint(alice.address, MINT_AMOUNT);
    await pBTCM.mint(bob.address, MINT_AMOUNT);
    await pETHM.mint(alice.address, MINT_AMOUNT);
    await pETHM.mint(bob.address, MINT_AMOUNT);

    await wBTCO.grantRole(MINTER_ROLE, deployer.address);
    await wETHO.grantRole(MINTER_ROLE, deployer.address);

    await wBTCO.mint(rewardDepositor.address, MINT_AMOUNT);
    await wETHO.mint(rewardDepositor.address, MINT_AMOUNT);
  });

  describe("MineNetworkPoolManager", () => {
    it("Should initialize", async () => {
      expect(await mineNetworkPoolManager.addressManager()).to.be.equal(mineNetworkAdmin.address);
    });

    it("Should be able to add pool", async () => {
      await expect(mineNetworkPoolManager.addPool(pBTCM.address, wBTCO.address, mine.address)).to.be.revertedWith(
        "Not MineNetwork manager",
      );

      await expect(mineNetworkPoolManager.pools(0)).to.be.reverted;
      expect(await mineNetworkPoolManager.poolLength()).to.be.equal(0);
      await mineNetworkPoolManager.connect(manager).addPool(pBTCM.address, wBTCO.address, mine.address);
      expect(await mineNetworkPoolManager.pools(0)).to.be.deep.equal([pBTCM.address, wBTCO.address, mine.address]);
      expect(await mineNetworkPoolManager.poolLength()).to.be.equal(1);
    });

    it("Should be able to remove pool", async () => {
      await expect(mineNetworkPoolManager.removePool(0)).to.be.revertedWith("Not MineNetwork manager");
      await expect(mineNetworkPoolManager.connect(manager).removePool(10)).to.be.revertedWith("Invalid pool index");

      expect(await mineNetworkPoolManager.isDeprecatedPool(0)).to.be.false;
      await mineNetworkPoolManager.connect(manager).removePool(0);
      expect(await mineNetworkPoolManager.pools(0)).to.be.deep.equal([pBTCM.address, wBTCO.address, mine.address]);
      expect(await mineNetworkPoolManager.isDeprecatedPool(0)).to.be.true;
      expect(await mineNetworkPoolManager.poolLength()).to.be.equal(1);
    });

    it("Should not be able to stake when paused", async () => {
      await mineNetworkAdmin.connect(manager).pause();
      await expect(mineNetworkPoolManager.connect(alice).stake(0, MINT_AMOUNT + 1)).to.be.revertedWith("Paused");
      await mineNetworkAdmin.connect(manager).unpause();
    });

    it("Should be able to stake when unpaused", async () => {
      await expect(mineNetworkPoolManager.connect(alice).stake(1, 10)).to.be.revertedWith("Invalid pool index");
      await expect(mineNetworkPoolManager.connect(alice).stake(0, 0)).to.be.revertedWith("Invalid amount");
      await expect(mineNetworkPoolManager.connect(alice).stake(0, 10)).to.be.revertedWith(
        "ERC20: transfer amount exceeds allowance",
      );

      await pBTCM.connect(alice).approve(mineNetworkPoolManager.address, ethers.constants.MaxUint256);

      await expect(mineNetworkPoolManager.connect(alice).stake(0, MINT_AMOUNT + 1)).to.be.revertedWith(
        "ERC20: transfer amount exceeds balance",
      );

      expect(await pBTCM.balanceOf(alice.address)).to.be.equal(MINT_AMOUNT);
      expect(await pBTCM.balanceOf(mineNetworkPoolManager.address)).to.be.equal(0);
      expect(await mineNetworkPoolManager.userStakes(0, alice.address)).to.be.equal(0);
      await mineNetworkPoolManager.connect(alice).stake(0, 10);
      expect(await pBTCM.balanceOf(alice.address)).to.be.equal(MINT_AMOUNT - 10);
      expect(await pBTCM.balanceOf(mineNetworkPoolManager.address)).to.be.equal(10);
      expect(await mineNetworkPoolManager.userStakes(0, alice.address)).to.be.equal(10);
    });

    it("Should not be able to unstake when paused", async () => {
      await mineNetworkAdmin.connect(manager).pause();
      await expect(mineNetworkPoolManager.connect(alice).unstake(0, MINT_AMOUNT + 1)).to.be.revertedWith("Paused");
      await mineNetworkAdmin.connect(manager).unpause();
    });

    it("Should be able to unstake when unpaused", async () => {
      await expect(mineNetworkPoolManager.connect(alice).unstake(1, 10)).to.be.revertedWith("Invalid pool index");
      await expect(mineNetworkPoolManager.connect(alice).unstake(0, 0)).to.be.revertedWith("Invalid amount");
      await expect(mineNetworkPoolManager.connect(alice).unstake(0, 11)).to.be.revertedWith("Invalid amount");

      expect(await pBTCM.balanceOf(alice.address)).to.be.equal(MINT_AMOUNT - 10);
      expect(await pBTCM.balanceOf(mineNetworkPoolManager.address)).to.be.equal(10);
      expect(await mineNetworkPoolManager.userStakes(0, alice.address)).to.be.equal(10);
      await mineNetworkPoolManager.connect(alice).unstake(0, 10);
      expect(await pBTCM.balanceOf(alice.address)).to.be.equal(MINT_AMOUNT);
      expect(await pBTCM.balanceOf(mineNetworkPoolManager.address)).to.be.equal(0);
      expect(await mineNetworkPoolManager.userStakes(0, alice.address)).to.be.equal(0);
    });
  });
});
