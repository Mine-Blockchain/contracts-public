const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { toRole, increaseTime } = require("../utils");

describe("MineNetwork Pool Manage", () => {
  let pBTCM,
    pETHM,
    wBTCO,
    wETHO,
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

  describe("MineNetworkAdmin", () => {
    it("Should not pause by non manager", async () => {
      expect(await mineNetworkAdmin.connect(manager).paused()).to.be.false;
      await expect(mineNetworkAdmin.connect(alice).pause()).to.be.revertedWith("Not MineNetwork manager");
    });

    it("Should pause by manager", async () => {
      expect(await mineNetworkAdmin.paused()).to.be.false;
      await mineNetworkAdmin.connect(manager).pause();
      expect(await mineNetworkAdmin.paused()).to.be.true;
    });

    it("Should not unpause by non manager", async () => {
      expect(await mineNetworkAdmin.connect(manager).paused()).to.be.true;
      await expect(mineNetworkAdmin.connect(alice).pause()).to.be.revertedWith("Not MineNetwork manager");
    });

    it("Should pause by manager", async () => {
      expect(await mineNetworkAdmin.paused()).to.be.true;
      await mineNetworkAdmin.connect(manager).unpause();
      expect(await mineNetworkAdmin.paused()).to.be.false;
    });
  });
});
