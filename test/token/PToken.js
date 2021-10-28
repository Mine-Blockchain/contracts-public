const { expect } = require("chai");
const { upgrades } = require("hardhat");
const { toRole } = require("../utils");

describe("PToken", () => {
  let pBTCM;

  const MINTER_ROLE = toRole("MINTER_ROLE");
  const BURNER_ROLE = toRole("BURNER_ROLE");
  const MINT_AMOUNT = 100;
  const BURN_AMOUNT = 50;

  beforeEach(async () => {
    [deployer, alice, bob] = await ethers.getSigners();

    const PToken = await ethers.getContractFactory("PToken");
    pBTCM = await upgrades.deployProxy(PToken, ["pBTCM", "pBTCM"]);
  });

  describe("Role", async () => {
    it("Should have correct name/symbol", async () => {
      expect(await pBTCM.name()).to.be.equal("pBTCM");
      expect(await pBTCM.symbol()).to.be.equal("pBTCM");
    });

    it("Should assign the default admin to the deployer", async () => {
      expect(await pBTCM.hasRole(pBTCM.DEFAULT_ADMIN_ROLE(), deployer.address)).to.equal(true);
    });

    it("Should get the role admin", async () => {
      let roleAdmin = await pBTCM.DEFAULT_ADMIN_ROLE();
      expect(await pBTCM.getRoleAdmin(MINTER_ROLE)).to.be.equal(roleAdmin);
    });

    it("Should not grant the role by non role admin", async () => {
      await expect(pBTCM.connect(bob).grantRole(MINTER_ROLE, alice.address)).to.be.reverted;
    });

    it("Should grant the role to another user by role admin", async () => {
      expect(await pBTCM.hasRole(MINTER_ROLE, alice.address)).to.equal(false);
      await pBTCM.grantRole(MINTER_ROLE, alice.address);
      expect(await pBTCM.hasRole(MINTER_ROLE, alice.address)).to.equal(true);
    });

    it("Should not revoke the role by non role admin", async () => {
      await expect(pBTCM.connect(bob).revokeRole(MINTER_ROLE, alice.address)).to.be.reverted;
    });

    it("Should revoke the role to another user by role admin", async () => {
      await pBTCM.grantRole(MINTER_ROLE, alice.address);
      expect(await pBTCM.hasRole(MINTER_ROLE, alice.address)).to.equal(true);
      await pBTCM.revokeRole(MINTER_ROLE, alice.address);
      expect(await pBTCM.hasRole(MINTER_ROLE, alice.address)).to.equal(false);
    });

    it("Should not renounce the role by non role owner", async () => {
      await pBTCM.grantRole(BURNER_ROLE, alice.address);
      await expect(pBTCM.renounceRole(BURNER_ROLE, alice.address)).to.be.revertedWith(
        "AccessControl: can only renounce roles for self",
      );
    });

    it("Should renounce the role by role owner", async () => {
      await pBTCM.grantRole(BURNER_ROLE, alice.address);
      expect(await pBTCM.connect(alice).hasRole(BURNER_ROLE, alice.address)).to.equal(true);
      await pBTCM.connect(alice).renounceRole(BURNER_ROLE, alice.address);
      expect(await pBTCM.connect(alice).hasRole(BURNER_ROLE, alice.address)).to.equal(false);
    });
  });

  describe("Mint/Burn tokens", async () => {
    beforeEach(async () => {
      await pBTCM.grantRole(MINTER_ROLE, alice.address);
      await pBTCM.grantRole(BURNER_ROLE, bob.address);
    });

    it("Should not mint token by non minter role owner", async () => {
      expect(await pBTCM.balanceOf(bob.address)).to.equal(0);
      await expect(pBTCM.mint(bob.address, MINT_AMOUNT)).to.be.reverted;
    });

    it("Should mint token by minter role owner", async () => {
      expect(await pBTCM.balanceOf(bob.address)).to.equal(0);
      await pBTCM.connect(alice).mint(bob.address, MINT_AMOUNT);
      expect(await pBTCM.balanceOf(bob.address)).to.equal(MINT_AMOUNT);
    });

    it("Should not burn his token by non burner role owner himself", async () => {
      await pBTCM.connect(alice).mint(bob.address, MINT_AMOUNT);
      await expect(pBTCM.connect(alice).burn(BURN_AMOUNT)).to.be.reverted;
    });

    it("Should burn his token by burner role owner himself", async () => {
      await pBTCM.connect(alice).mint(bob.address, MINT_AMOUNT);
      await pBTCM.connect(bob).burn(BURN_AMOUNT);
      let restAmount = MINT_AMOUNT - BURN_AMOUNT;
      expect(await pBTCM.balanceOf(bob.address)).to.equal(restAmount);
    });

    it("Should not burn another user's tokens by non burner role owner", async () => {
      await pBTCM.connect(alice).mint(alice.address, MINT_AMOUNT);
      await pBTCM.connect(alice).approve(bob.address, BURN_AMOUNT);
      await expect(pBTCM.connect(alice).burnFrom(alice.address, BURN_AMOUNT)).to.be.reverted;
    });

    it("Should not burn another user's tokens by non burner role owner", async () => {
      await pBTCM.connect(alice).mint(alice.address, MINT_AMOUNT);
      await expect(pBTCM.connect(bob).burnFrom(alice.address, BURN_AMOUNT)).to.be.revertedWith(
        "PToken: exceeds allowance",
      );
    });

    it("Should burn another user's tokens by burner role owner", async () => {
      await pBTCM.connect(alice).mint(alice.address, MINT_AMOUNT);
      await pBTCM.connect(alice).approve(bob.address, BURN_AMOUNT);
      await pBTCM.connect(bob).burnFrom(alice.address, BURN_AMOUNT);
      let restAmount = MINT_AMOUNT - BURN_AMOUNT;
      expect(await pBTCM.balanceOf(alice.address)).to.equal(restAmount);
    });
  });
});
