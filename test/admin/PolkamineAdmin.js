const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { toRole, increaseTime } = require("../utils");

describe("Polkamine Pool Manage", () => {
  let pBTCM,
    pETHM,
    wBTCO,
    wETHO,
    pBTCMPool,
    pETHMPool,
    PolkamineAdmin,
    polkaminePoolManager,
    polkamineRewardDistributor,
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

    // Deploy PolkamineAdmin
    const PolkamineAdmin = await ethers.getContractFactory("PolkamineAdmin");
    polkamineAdmin = await upgrades.deployProxy(PolkamineAdmin, [manager.address]);

    // Deploy PolkaminePoolManager
    const PolkaminePoolManager = await ethers.getContractFactory("PolkaminePoolManager");
    polkaminePoolManager = await upgrades.deployProxy(PolkaminePoolManager, [polkamineAdmin.address]);

    // Deploy PolkamineRewardDistributor ans set the address to PolkamineAdmin
    rewardInterval = 43200; // half day
    const PolkamineRewardDistributor = await ethers.getContractFactory("PolkamineRewardDistributor");
    polkamineRewardDistributor = await upgrades.deployProxy(PolkamineRewardDistributor, [
      polkamineAdmin.address,
      rewardInterval,
    ]);

    await polkamineAdmin.setManager(manager.address);

    await polkamineAdmin.setRewardDistributorContract(polkamineRewardDistributor.address);

    // Set PoolManager, RewardDepositor and Maintainer
    await polkamineAdmin.setPoolManagerContract(polkaminePoolManager.address);
    await polkamineAdmin.setRewardDepositor(rewardDepositor.address);
    await polkamineAdmin.setMaintainer(maintainer.address);

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

  describe("PolkamineAdmin", () => {
    it("Should not pause by non manager", async () => {
      expect(await polkamineAdmin.connect(manager).paused()).to.be.false;
      await expect(polkamineAdmin.connect(alice).pause()).to.be.revertedWith("Not polkamine manager");
    });

    it("Should pause by manager", async () => {
      expect(await polkamineAdmin.paused()).to.be.false;
      await polkamineAdmin.connect(manager).pause();
      expect(await polkamineAdmin.paused()).to.be.true;
    });

    it("Should not unpause by non manager", async () => {
      expect(await polkamineAdmin.connect(manager).paused()).to.be.true;
      await expect(polkamineAdmin.connect(alice).pause()).to.be.revertedWith("Not polkamine manager");
    });

    it("Should pause by manager", async () => {
      expect(await polkamineAdmin.paused()).to.be.true;
      await polkamineAdmin.connect(manager).unpause();
      expect(await polkamineAdmin.paused()).to.be.false;
    });
  });
});
