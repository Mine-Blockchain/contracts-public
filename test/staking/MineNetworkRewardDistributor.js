const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { toRole, increaseTime, ZERO } = require("../utils");

const getSignature = async (
  signer,
  beneficiary,
  pid,
  rewardToken,
  rewardAmount,
  doubleRewardToken,
  doubleRewardAmount,
  claimIndex,
) => {
  let message = ethers.utils.solidityKeccak256(
    ["address", "uint256", "address", "uint256", "address", "uint256", "uint256"],
    [beneficiary, pid, rewardToken, rewardAmount, doubleRewardToken, doubleRewardAmount, claimIndex],
  );
  let signature = await signer.signMessage(ethers.utils.arrayify(message));
  return signature;
};

describe("MineNetworkRewardDistributor", () => {
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
    // mineNetworkRewardOracle,
    pidPBTCM,
    pidPETHM,
    claimInterval;

  let signatureAliceBTC, signatureBobBTC, signatureAliceETH, signatureBobETH;

  const MINTER_ROLE = toRole("MINTER_ROLE");
  const BURNER_ROLE = toRole("BURNER_ROLE");
  const MINT_AMOUNT = 10000;

  beforeEach(async () => {
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

    await mineNetworkPoolManager.connect(manager).addPool(pBTCM.address, wBTCO.address, mine.address);
    pidPBTCM = 0;

    await mineNetworkPoolManager.connect(manager).addPool(pETHM.address, wETHO.address, mine.address);
    pidPETHM = 1;

    // initialize claimIndex and claimInterval
    claimIndex = 0;
    claimInterval = 43200;

    // Deploy MineNetworkRewardDistributor ans set the address to MineNetworkAdmin
    const MineNetworkRewardDistributor = await ethers.getContractFactory("MineNetworkRewardDistributor");
    mineNetworkRewardDistributor = await upgrades.deployProxy(MineNetworkRewardDistributor, [
      mineNetworkAdmin.address,
      claimInterval,
    ]);

    await mineNetworkAdmin.setRewardDistributorContract(mineNetworkRewardDistributor.address);

    // Set PoolManager, RewardDepositor and Maintainer
    await mineNetworkAdmin.setPoolManagerContract(mineNetworkPoolManager.address);
    await mineNetworkAdmin.setRewardDepositor(rewardDepositor.address);
    await mineNetworkAdmin.setMaintainer(maintainer.address);

    // set claimIndex and claimInterval
    await mineNetworkRewardDistributor.connect(maintainer).setClaimIndex(claimIndex);
    await mineNetworkRewardDistributor.connect(manager).setClaimInterval(claimInterval);

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

    await mine.grantRole(MINTER_ROLE, deployer.address);

    await mine.mint(rewardDepositor.address, MINT_AMOUNT);
  });

  describe("Claim Interval", async () => {
    it("Should not set claim interval by non mamanger", async () => {
      let newClaimInterval = 86400;
      await expect(mineNetworkRewardDistributor.setClaimInterval(newClaimInterval)).to.be.revertedWith(
        "Not MineNetwork manager",
      );
    });

    it("Should set claim interval by mamanger", async () => {
      expect(await mineNetworkRewardDistributor.claimInterval()).to.equal(claimInterval);

      let newClaimInterval = 86400;
      await mineNetworkRewardDistributor.connect(manager).setClaimInterval(newClaimInterval);
      expect(await mineNetworkRewardDistributor.claimInterval()).to.equal(newClaimInterval);
    });

    it("Should not set claim index by non maintainer", async () => {
      let newClaimindex = claimIndex + 1;
      await expect(mineNetworkRewardDistributor.setClaimIndex(newClaimindex)).to.be.revertedWith("Not maintainer");
    });
  });

  describe("Deposit", async () => {
    it("Should not deposit reward token when paused", async () => {
      await mineNetworkAdmin.connect(manager).pause();
      await expect(
        mineNetworkRewardDistributor.connect(rewardDepositor).deposit(wBTCO.address, MINT_AMOUNT),
      ).to.be.revertedWith("Paused");
      await mineNetworkAdmin.connect(manager).unpause();
    });

    it("Should not deposit reward token by non rewardDepositor", async () => {
      await wBTCO.connect(rewardDepositor).approve(mineNetworkRewardDistributor.address, MINT_AMOUNT);
      await expect(mineNetworkRewardDistributor.deposit(wBTCO.address, MINT_AMOUNT)).to.be.revertedWith(
        "Not reward depositor",
      );
    });

    it("Should deposit reward token when unpaused", async () => {
      await expect(
        mineNetworkRewardDistributor.connect(rewardDepositor).deposit(wBTCO.address, MINT_AMOUNT),
      ).to.be.revertedWith("ERC20: transfer amount exceeds allowance");

      expect(await wBTCO.balanceOf(rewardDepositor.address)).to.equal(MINT_AMOUNT);
      expect(await wBTCO.balanceOf(mineNetworkRewardDistributor.address)).to.equal(0);
      await wBTCO.connect(rewardDepositor).approve(mineNetworkRewardDistributor.address, MINT_AMOUNT);
      await mineNetworkRewardDistributor.connect(rewardDepositor).deposit(wBTCO.address, MINT_AMOUNT);
      expect(await wBTCO.balanceOf(rewardDepositor.address)).to.equal(0);
      expect(await wBTCO.balanceOf(mineNetworkRewardDistributor.address)).to.equal(MINT_AMOUNT);
    });
  });

  describe("Claim", async () => {
    it("Should not claim rewards when paused", async () => {
      // deposit first rewards
      let wBTCOTotalRewardFirst = 30;

      await wBTCO.connect(rewardDepositor).approve(mineNetworkRewardDistributor.address, wBTCOTotalRewardFirst);

      // mock BTC/ETH reward signature
      signatureAliceBTC = await getSignature(
        maintainer,
        alice.address,
        pidPBTCM,
        wBTCO.address,
        10,
        mine.address,
        10,
        claimIndex,
      );

      await mineNetworkAdmin.connect(manager).pause();
      await expect(
        mineNetworkRewardDistributor
          .connect(alice)
          .claim(pidPBTCM, wBTCO.address, 10, mine.address, 10, claimIndex, signatureAliceBTC),
      ).to.be.revertedWith("Paused");
      await mineNetworkAdmin.connect(manager).unpause();
    });

    it("Should claim rewards by staker when unpaused", async () => {
      // deposit first rewards
      let wBTCOTotalRewardFirst = 30,
        wETHOTotalRewardFirst = 60,
        mineTotalRewardFirst = 100;

      await wBTCO.connect(rewardDepositor).approve(mineNetworkRewardDistributor.address, wBTCOTotalRewardFirst);
      await mineNetworkRewardDistributor.connect(rewardDepositor).deposit(wBTCO.address, wBTCOTotalRewardFirst);
      await wETHO.connect(rewardDepositor).approve(mineNetworkRewardDistributor.address, wETHOTotalRewardFirst);
      await mineNetworkRewardDistributor.connect(rewardDepositor).deposit(wETHO.address, wETHOTotalRewardFirst);
      await mine.connect(rewardDepositor).approve(mineNetworkRewardDistributor.address, mineTotalRewardFirst);
      await mineNetworkRewardDistributor.connect(rewardDepositor).deposit(mine.address, mineTotalRewardFirst);

      // mock BTC/ETH reward signature
      signatureAliceBTC = await getSignature(
        maintainer,
        alice.address,
        pidPBTCM,
        wBTCO.address,
        10,
        mine.address,
        10,
        claimIndex,
      );
      signatureBobBTC = await getSignature(
        maintainer,
        bob.address,
        pidPBTCM,
        wBTCO.address,
        10,
        mine.address,
        10,
        claimIndex,
      );
      signatureAliceETH = await getSignature(
        maintainer,
        alice.address,
        pidPETHM,
        wETHO.address,
        20,
        mine.address,
        20,
        claimIndex,
      );
      signatureBobETH = await getSignature(
        maintainer,
        bob.address,
        pidPETHM,
        wETHO.address,
        20,
        mine.address,
        20,
        claimIndex,
      );

      // claim wBTCO
      expect(await wBTCO.balanceOf(alice.address)).to.equal(0);
      expect(await wBTCO.balanceOf(bob.address)).to.equal(0);
      await mineNetworkRewardDistributor
        .connect(alice)
        .claim(pidPBTCM, wBTCO.address, 10, mine.address, 10, claimIndex, signatureAliceBTC);
      await mineNetworkRewardDistributor
        .connect(bob)
        .claim(pidPBTCM, wBTCO.address, 10, mine.address, 10, claimIndex, signatureBobBTC);
      expect(await wBTCO.balanceOf(alice.address)).to.equal(10);
      expect(await wBTCO.balanceOf(bob.address)).to.equal(10);
      expect(await wBTCO.balanceOf(mineNetworkRewardDistributor.address)).to.equal(10);
      expect(await mine.balanceOf(alice.address)).to.equal(10);
      expect(await mine.balanceOf(bob.address)).to.equal(10);

      // claim wETHO
      expect(await wETHO.balanceOf(alice.address)).to.equal(0);
      expect(await wETHO.balanceOf(bob.address)).to.equal(0);
      await mineNetworkRewardDistributor
        .connect(alice)
        .claim(pidPETHM, wETHO.address, 20, mine.address, 20, claimIndex, signatureAliceETH);
      await mineNetworkRewardDistributor
        .connect(bob)
        .claim(pidPETHM, wETHO.address, 20, mine.address, 20, claimIndex, signatureBobETH);
      expect(await wETHO.balanceOf(alice.address)).to.equal(20);
      expect(await wETHO.balanceOf(bob.address)).to.equal(20);
      expect(await wETHO.balanceOf(mineNetworkRewardDistributor.address)).to.equal(20);
      expect(await mine.balanceOf(alice.address)).to.equal(30);
      expect(await mine.balanceOf(bob.address)).to.equal(30);

      // change the time and incrase claim index
      increaseTime(claimInterval);
      claimIndex++;
      await mineNetworkRewardDistributor.connect(maintainer).setClaimIndex(claimIndex);

      // deposit second rewards
      let wBTCOTotalRewardSecond = 50,
        wETHOTotalRewardSecond = 10,
        mineTotalRewardSecond = 100;

      await wBTCO.connect(rewardDepositor).approve(mineNetworkRewardDistributor.address, wBTCOTotalRewardSecond);
      await mineNetworkRewardDistributor.connect(rewardDepositor).deposit(wBTCO.address, wBTCOTotalRewardSecond);
      await wETHO.connect(rewardDepositor).approve(mineNetworkRewardDistributor.address, wETHOTotalRewardSecond);
      await mineNetworkRewardDistributor.connect(rewardDepositor).deposit(wETHO.address, wETHOTotalRewardSecond);
      await mine.connect(rewardDepositor).approve(mineNetworkRewardDistributor.address, mineTotalRewardSecond);
      await mineNetworkRewardDistributor.connect(rewardDepositor).deposit(mine.address, mineTotalRewardSecond);

      // mock BTC/ETH reward signature
      signatureAliceBTC = await getSignature(
        maintainer,
        alice.address,
        pidPBTCM,
        wBTCO.address,
        40,
        mine.address,
        40,
        claimIndex,
      );
      signatureBobBTC = await getSignature(
        maintainer,
        bob.address,
        pidPBTCM,
        wBTCO.address,
        20,
        mine.address,
        20,
        claimIndex,
      );
      signatureAliceETH = await getSignature(
        maintainer,
        alice.address,
        pidPETHM,
        wETHO.address,
        10,
        mine.address,
        10,
        claimIndex,
      );
      signatureBobETH = await getSignature(
        maintainer,
        bob.address,
        pidPETHM,
        wETHO.address,
        20,
        mine.address,
        20,
        claimIndex,
      );

      // claim wBTCO
      expect(await wBTCO.balanceOf(alice.address)).to.equal(10);
      expect(await wBTCO.balanceOf(bob.address)).to.equal(10);
      await mineNetworkRewardDistributor
        .connect(alice)
        .claim(pidPBTCM, wBTCO.address, 40, mine.address, 40, claimIndex, signatureAliceBTC);
      await mineNetworkRewardDistributor
        .connect(bob)
        .claim(pidPBTCM, wBTCO.address, 20, mine.address, 20, claimIndex, signatureBobBTC);
      expect(await wBTCO.balanceOf(alice.address)).to.equal(50);
      expect(await wBTCO.balanceOf(bob.address)).to.equal(30);
      expect(await wBTCO.balanceOf(mineNetworkRewardDistributor.address)).to.equal(0);
      expect(await mine.balanceOf(alice.address)).to.equal(70);
      expect(await mine.balanceOf(bob.address)).to.equal(50);

      // claim wETHO
      expect(await wETHO.balanceOf(alice.address)).to.equal(20);
      expect(await wETHO.balanceOf(bob.address)).to.equal(20);
      await mineNetworkRewardDistributor
        .connect(alice)
        .claim(pidPETHM, wETHO.address, 10, mine.address, 10, claimIndex, signatureAliceETH);
      await mineNetworkRewardDistributor
        .connect(bob)
        .claim(pidPETHM, wETHO.address, 20, mine.address, 20, claimIndex, signatureBobETH);
      expect(await wETHO.balanceOf(alice.address)).to.equal(30);
      expect(await wETHO.balanceOf(bob.address)).to.equal(40);
      expect(await wETHO.balanceOf(mineNetworkRewardDistributor.address)).to.equal(0);
      expect(await mine.balanceOf(alice.address)).to.equal(80);
      expect(await mine.balanceOf(bob.address)).to.equal(70);
    });

    it("Should not claim rewards with already used signature", async () => {
      // deposit first rewards
      let wBTCOTotalRewardSecond = 50,
        wETHOTotalRewardSecond = 20,
        mineTotalRewardSecond = 100;

      await wBTCO.connect(rewardDepositor).approve(mineNetworkRewardDistributor.address, wBTCOTotalRewardSecond);
      await mineNetworkRewardDistributor.connect(rewardDepositor).deposit(wBTCO.address, wBTCOTotalRewardSecond);
      await wETHO.connect(rewardDepositor).approve(mineNetworkRewardDistributor.address, wETHOTotalRewardSecond);
      await mineNetworkRewardDistributor.connect(rewardDepositor).deposit(wETHO.address, wETHOTotalRewardSecond);
      await mine.connect(rewardDepositor).approve(mineNetworkRewardDistributor.address, mineTotalRewardSecond);
      await mineNetworkRewardDistributor.connect(rewardDepositor).deposit(mine.address, mineTotalRewardSecond);

      // mock BTC/ETH reward signature
      signatureAliceBTC = await getSignature(
        maintainer,
        alice.address,
        pidPBTCM,
        wBTCO.address,
        40,
        mine.address,
        40,
        claimIndex,
      );
      signatureBobETH = await getSignature(
        maintainer,
        bob.address,
        pidPETHM,
        wETHO.address,
        20,
        mine.address,
        20,
        claimIndex,
      );

      // claim wBTCO, WETHO
      await mineNetworkRewardDistributor
        .connect(alice)
        .claim(pidPBTCM, wBTCO.address, 40, mine.address, 40, claimIndex, signatureAliceBTC);
      await mineNetworkRewardDistributor
        .connect(bob)
        .claim(pidPETHM, wETHO.address, 20, mine.address, 20, claimIndex, signatureBobETH);

      // retry with the used signature
      await expect(
        mineNetworkRewardDistributor
          .connect(alice)
          .claim(pidPBTCM, wBTCO.address, 40, mine.address, 40, claimIndex, signatureAliceBTC),
      ).to.be.revertedWith("Already used signature");
      await expect(
        mineNetworkRewardDistributor
          .connect(bob)
          .claim(pidPETHM, wETHO.address, 20, mine.address, 20, claimIndex, signatureBobETH),
      ).to.be.revertedWith("Already used signature");

      // retry after changing claim index
      await mineNetworkRewardDistributor.connect(maintainer).setClaimIndex(claimIndex);
      await expect(
        mineNetworkRewardDistributor
          .connect(alice)
          .claim(pidPBTCM, wBTCO.address, 40, mine.address, 40, claimIndex, signatureAliceBTC),
      ).to.be.revertedWith("Already used signature");
      await expect(
        mineNetworkRewardDistributor
          .connect(bob)
          .claim(pidPETHM, wETHO.address, 20, mine.address, 20, claimIndex, signatureBobETH),
      ).to.be.revertedWith("Already used signature");

      // retry after increasing the time
      increaseTime(claimInterval);
      await expect(
        mineNetworkRewardDistributor
          .connect(alice)
          .claim(pidPBTCM, wBTCO.address, 40, mine.address, 40, claimIndex, signatureAliceBTC),
      ).to.be.revertedWith("Already used signature");
      await expect(
        mineNetworkRewardDistributor
          .connect(bob)
          .claim(pidPETHM, wETHO.address, 20, mine.address, 20, claimIndex, signatureBobETH),
      ).to.be.revertedWith("Already used signature");
    });

    it("Should not claim rewards with invalid interval", async () => {
      // deposit first rewards
      let wBTCOTotalRewardFirst = 50,
        wETHOTotalRewardFirst = 20,
        mineTotalRewardFirst = 100;

      await wBTCO.connect(rewardDepositor).approve(mineNetworkRewardDistributor.address, wBTCOTotalRewardFirst);
      await mineNetworkRewardDistributor.connect(rewardDepositor).deposit(wBTCO.address, wBTCOTotalRewardFirst);
      await wETHO.connect(rewardDepositor).approve(mineNetworkRewardDistributor.address, wETHOTotalRewardFirst);
      await mineNetworkRewardDistributor.connect(rewardDepositor).deposit(wETHO.address, wETHOTotalRewardFirst);
      await mine.connect(rewardDepositor).approve(mineNetworkRewardDistributor.address, mineTotalRewardFirst);
      await mineNetworkRewardDistributor.connect(rewardDepositor).deposit(mine.address, mineTotalRewardFirst);

      // mock BTC/ETH reward signature using invalid claim index
      signatureAliceBTC = await getSignature(
        maintainer,
        alice.address,
        pidPBTCM,
        wBTCO.address,
        50,
        mine.address,
        50,
        claimIndex,
      );
      signatureBobETH = await getSignature(
        maintainer,
        bob.address,
        pidPETHM,
        wETHO.address,
        20,
        mine.address,
        20,
        claimIndex,
      );

      // claim wBTCO, WETHO
      await mineNetworkRewardDistributor
        .connect(alice)
        .claim(pidPBTCM, wBTCO.address, 50, mine.address, 50, claimIndex, signatureAliceBTC);
      await mineNetworkRewardDistributor
        .connect(bob)
        .claim(pidPETHM, wETHO.address, 20, mine.address, 20, claimIndex, signatureBobETH);

      // change the time and increase claim index
      increaseTime(claimInterval - 10);
      claimIndex++;
      await mineNetworkRewardDistributor.connect(maintainer).setClaimIndex(claimIndex);

      // deposit second rewards
      let wBTCOTotalRewardSecond = 10,
        wETHOTotalRewardSecond = 20,
        mineTotalRewardSecond = 100;

      await wBTCO.connect(rewardDepositor).approve(mineNetworkRewardDistributor.address, wBTCOTotalRewardSecond);
      await mineNetworkRewardDistributor.connect(rewardDepositor).deposit(wBTCO.address, wBTCOTotalRewardSecond);
      await wETHO.connect(rewardDepositor).approve(mineNetworkRewardDistributor.address, wETHOTotalRewardSecond);
      await mineNetworkRewardDistributor.connect(rewardDepositor).deposit(wETHO.address, wETHOTotalRewardSecond);
      await mine.connect(rewardDepositor).approve(mineNetworkRewardDistributor.address, mineTotalRewardSecond);
      await mineNetworkRewardDistributor.connect(rewardDepositor).deposit(mine.address, mineTotalRewardSecond);

      // mock BTC/ETH reward signature
      signatureAliceBTC = await getSignature(
        maintainer,
        alice.address,
        pidPBTCM,
        wBTCO.address,
        10,
        mine.address,
        10,
        claimIndex,
      );
      signatureBobETH = await getSignature(
        maintainer,
        bob.address,
        pidPETHM,
        wETHO.address,
        20,
        mine.address,
        20,
        claimIndex,
      );

      // claim wBTCO, WETHO
      await expect(
        mineNetworkRewardDistributor
          .connect(alice)
          .claim(pidPBTCM, wBTCO.address, 10, mine.address, 10, claimIndex, signatureAliceBTC),
      ).to.be.revertedWith("Invalid interval");
      await expect(
        mineNetworkRewardDistributor
          .connect(bob)
          .claim(pidPETHM, wETHO.address, 20, mine.address, 20, claimIndex, signatureBobETH),
      ).to.be.revertedWith("Invalid interval");
    });

    it("Should not claim rewards with invalid claim index", async () => {
      // deposit first rewards
      let wBTCOTotalRewardFirst = 50,
        wETHOTotalRewardFirst = 20,
        mineTotalRewardFirst = 100;

      await wBTCO.connect(rewardDepositor).approve(mineNetworkRewardDistributor.address, wBTCOTotalRewardFirst);
      await mineNetworkRewardDistributor.connect(rewardDepositor).deposit(wBTCO.address, wBTCOTotalRewardFirst);
      await wETHO.connect(rewardDepositor).approve(mineNetworkRewardDistributor.address, wETHOTotalRewardFirst);
      await mineNetworkRewardDistributor.connect(rewardDepositor).deposit(wETHO.address, wETHOTotalRewardFirst);
      await mine.connect(rewardDepositor).approve(mineNetworkRewardDistributor.address, mineTotalRewardFirst);
      await mineNetworkRewardDistributor.connect(rewardDepositor).deposit(mine.address, mineTotalRewardFirst);

      // set claim index
      claimIndex = 2;
      await mineNetworkRewardDistributor.connect(maintainer).setClaimIndex(claimIndex);

      // set invalid claim index
      claimIndex--;

      // mock BTC/ETH reward signature using invalid claim index
      signatureAliceBTC = await getSignature(
        maintainer,
        alice.address,
        pidPBTCM,
        wBTCO.address,
        60,
        mine.address,
        60,
        claimIndex,
      );
      signatureBobETH = await getSignature(
        maintainer,
        bob.address,
        pidPETHM,
        wETHO.address,
        30,
        mine.address,
        30,
        claimIndex,
      );

      // claim wBTCO, WETHO
      await expect(
        mineNetworkRewardDistributor
          .connect(alice)
          .claim(pidPBTCM, wBTCO.address, 60, mine.address, 60, claimIndex, signatureAliceBTC),
      ).to.be.revertedWith("Invalid claim index");
      await expect(
        mineNetworkRewardDistributor
          .connect(bob)
          .claim(pidPETHM, wETHO.address, 30, mine.address, 30, claimIndex, signatureBobETH),
      ).to.be.revertedWith("Invalid claim index");
    });

    it("Should not claim rewards with the signature made by invalid signer", async () => {
      // deposit first rewards
      let wBTCOTotalRewardFirst = 50,
        wETHOTotalRewardFirst = 20,
        mineTotalRewardFirst = 100;

      await wBTCO.connect(rewardDepositor).approve(mineNetworkRewardDistributor.address, wBTCOTotalRewardFirst);
      await mineNetworkRewardDistributor.connect(rewardDepositor).deposit(wBTCO.address, wBTCOTotalRewardFirst);
      await wETHO.connect(rewardDepositor).approve(mineNetworkRewardDistributor.address, wETHOTotalRewardFirst);
      await mineNetworkRewardDistributor.connect(rewardDepositor).deposit(wETHO.address, wETHOTotalRewardFirst);
      await mine.connect(rewardDepositor).approve(mineNetworkRewardDistributor.address, mineTotalRewardFirst);
      await mineNetworkRewardDistributor.connect(rewardDepositor).deposit(mine.address, mineTotalRewardFirst);

      // mock BTC/ETH reward signature using invalid claim index
      signatureAliceBTC = await getSignature(
        alice,
        alice.address,
        pidPBTCM,
        wBTCO.address,
        60,
        mine.address,
        60,
        claimIndex,
      );
      signatureBobETH = await getSignature(bob, bob.address, pidPETHM, wETHO.address, 30, mine.address, 30, claimIndex);

      // claim wBTCO, WETHO
      await expect(
        mineNetworkRewardDistributor
          .connect(alice)
          .claim(pidPBTCM, wBTCO.address, 60, mine.address, 60, claimIndex, signatureAliceBTC),
      ).to.be.revertedWith("Invalid signer");
      await expect(
        mineNetworkRewardDistributor
          .connect(bob)
          .claim(pidPETHM, wETHO.address, 30, mine.address, 30, claimIndex, signatureBobETH),
      ).to.be.revertedWith("Invalid signer");
    });

    it("Should not claim rewards with invalid pid", async () => {
      // deposit first rewards
      let wBTCOTotalRewardFirst = 50,
        wETHOTotalRewardFirst = 20,
        mineTotalRewardFirst = 100;

      await wBTCO.connect(rewardDepositor).approve(mineNetworkRewardDistributor.address, wBTCOTotalRewardFirst);
      await mineNetworkRewardDistributor.connect(rewardDepositor).deposit(wBTCO.address, wBTCOTotalRewardFirst);
      await wETHO.connect(rewardDepositor).approve(mineNetworkRewardDistributor.address, wETHOTotalRewardFirst);
      await mineNetworkRewardDistributor.connect(rewardDepositor).deposit(wETHO.address, wETHOTotalRewardFirst);
      await mine.connect(rewardDepositor).approve(mineNetworkRewardDistributor.address, mineTotalRewardFirst);
      await mineNetworkRewardDistributor.connect(rewardDepositor).deposit(mine.address, mineTotalRewardFirst);

      // mock BTC/ETH reward signature using invalid claim index
      signatureAliceBTC = await getSignature(
        maintainer,
        alice.address,
        pidPBTCM + 10,
        wBTCO.address,
        60,
        mine.address,
        60,
        claimIndex,
      );
      signatureBobETH = await getSignature(
        maintainer,
        bob.address,
        pidPETHM + 10,
        wETHO.address,
        30,
        mine.address,
        30,
        claimIndex,
      );

      // claim wBTCO, WETHO
      await expect(
        mineNetworkRewardDistributor
          .connect(alice)
          .claim(pidPBTCM + 10, wBTCO.address, 60, mine.address, 60, claimIndex, signatureAliceBTC),
      ).to.be.revertedWith("Invalid pid");
      await expect(
        mineNetworkRewardDistributor
          .connect(bob)
          .claim(pidPETHM + 10, wETHO.address, 30, mine.address, 30, claimIndex, signatureBobETH),
      ).to.be.revertedWith("Invalid pid");
    });

    it("Should not claim rewards with mismatched reward token", async () => {
      // deposit first rewards
      let wBTCOTotalRewardFirst = 50,
        wETHOTotalRewardFirst = 20,
        mineTotalRewardFirst = 100;

      await wBTCO.connect(rewardDepositor).approve(mineNetworkRewardDistributor.address, wBTCOTotalRewardFirst);
      await mineNetworkRewardDistributor.connect(rewardDepositor).deposit(wBTCO.address, wBTCOTotalRewardFirst);
      await wETHO.connect(rewardDepositor).approve(mineNetworkRewardDistributor.address, wETHOTotalRewardFirst);
      await mineNetworkRewardDistributor.connect(rewardDepositor).deposit(wETHO.address, wETHOTotalRewardFirst);
      await mine.connect(rewardDepositor).approve(mineNetworkRewardDistributor.address, mineTotalRewardFirst);
      await mineNetworkRewardDistributor.connect(rewardDepositor).deposit(mine.address, mineTotalRewardFirst);

      // mock BTC/ETH reward signature using invalid claim index
      signatureAliceBTC = await getSignature(
        maintainer,
        alice.address,
        pidPBTCM,
        wETHO.address,
        60,
        mine.address,
        60,
        claimIndex,
      );
      signatureBobETH = await getSignature(
        maintainer,
        bob.address,
        pidPETHM,
        wBTCO.address,
        30,
        mine.address,
        30,
        claimIndex,
      );

      // claim wBTCO, WETHO
      await expect(
        mineNetworkRewardDistributor
          .connect(alice)
          .claim(pidPBTCM, wETHO.address, 60, mine.address, 60, claimIndex, signatureAliceBTC),
      ).to.be.revertedWith("Mismatched reward token");
      await expect(
        mineNetworkRewardDistributor
          .connect(bob)
          .claim(pidPETHM, wBTCO.address, 30, mine.address, 30, claimIndex, signatureBobETH),
      ).to.be.revertedWith("Mismatched reward token");
    });

    it("Should not claim rewards with the exceeded amount", async () => {
      // deposit first rewards
      let wBTCOTotalRewardFirst = 50,
        wETHOTotalRewardFirst = 20,
        mineTotalRewardFirst = 100;

      await wBTCO.connect(rewardDepositor).approve(mineNetworkRewardDistributor.address, wBTCOTotalRewardFirst);
      await mineNetworkRewardDistributor.connect(rewardDepositor).deposit(wBTCO.address, wBTCOTotalRewardFirst);
      await wETHO.connect(rewardDepositor).approve(mineNetworkRewardDistributor.address, wETHOTotalRewardFirst);
      await mineNetworkRewardDistributor.connect(rewardDepositor).deposit(wETHO.address, wETHOTotalRewardFirst);
      await mine.connect(rewardDepositor).approve(mineNetworkRewardDistributor.address, mineTotalRewardFirst);
      await mineNetworkRewardDistributor.connect(rewardDepositor).deposit(mine.address, mineTotalRewardFirst);

      // mock BTC/ETH reward signature
      signatureAliceBTC = await getSignature(
        maintainer,
        alice.address,
        pidPBTCM,
        wBTCO.address,
        60,
        mine.address,
        60,
        claimIndex,
      );
      signatureBobETH = await getSignature(
        maintainer,
        bob.address,
        pidPETHM,
        wETHO.address,
        30,
        mine.address,
        30,
        claimIndex,
      );

      // claim wBTCO, WETHO
      await expect(
        mineNetworkRewardDistributor
          .connect(alice)
          .claim(pidPBTCM, wBTCO.address, 60, mine.address, 60, claimIndex, signatureAliceBTC),
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
      await expect(
        mineNetworkRewardDistributor
          .connect(bob)
          .claim(pidPETHM, wETHO.address, 30, mine.address, 30, claimIndex, signatureBobETH),
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });
  });
});
