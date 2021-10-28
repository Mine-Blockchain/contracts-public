const { expect } = require("chai");
const { upgrades } = require("hardhat");
const { toRole } = require("../utils");

describe("MINEToken", () => {
  let mineToken;

  const MINTER_ROLE = toRole("MINTER_ROLE");
  const BURNER_ROLE = toRole("BURNER_ROLE");
  const MINT_AMOUNT = 100;
  const BURN_AMOUNT = 50;

  beforeEach(async () => {
    [deployer, alice, bob] = await ethers.getSigners();

    const MINEToken = await ethers.getContractFactory("MINEToken");
    mineToken = await upgrades.deployProxy(MINEToken, ["MINE", "MINE"]);
  });

  describe("Role", async () => {
    it("Should have correct name/symbol", async () => {
      expect(await mineToken.name()).to.be.equal("MINE");
      expect(await mineToken.symbol()).to.be.equal("MINE");
    });

    it("Should assign the default admin to the deployer", async () => {
      expect(await mineToken.hasRole(mineToken.DEFAULT_ADMIN_ROLE(), deployer.address)).to.equal(true);
    });

    it("Should get the role admin", async () => {
      let roleAdmin = await mineToken.DEFAULT_ADMIN_ROLE();
      expect(await mineToken.getRoleAdmin(MINTER_ROLE)).to.be.equal(roleAdmin);
    });

    it("Should not grant the role by non role admin", async () => {
      await expect(mineToken.connect(bob).grantRole(MINTER_ROLE, alice.address)).to.be.reverted;
    });

    it("Should grant the role to another user by role admin", async () => {
      expect(await mineToken.hasRole(MINTER_ROLE, alice.address)).to.equal(false);
      await mineToken.grantRole(MINTER_ROLE, alice.address);
      expect(await mineToken.hasRole(MINTER_ROLE, alice.address)).to.equal(true);
    });

    it("Should not revoke the role by non role admin", async () => {
      await expect(mineToken.connect(bob).revokeRole(MINTER_ROLE, alice.address)).to.be.reverted;
    });

    it("Should revoke the role to another user by role admin", async () => {
      await mineToken.grantRole(MINTER_ROLE, alice.address);
      expect(await mineToken.hasRole(MINTER_ROLE, alice.address)).to.equal(true);
      await mineToken.revokeRole(MINTER_ROLE, alice.address);
      expect(await mineToken.hasRole(MINTER_ROLE, alice.address)).to.equal(false);
    });

    it("Should not renounce the role by non role owner", async () => {
      await mineToken.grantRole(BURNER_ROLE, alice.address);
      await expect(mineToken.renounceRole(BURNER_ROLE, alice.address)).to.be.revertedWith(
        "AccessControl: can only renounce roles for self",
      );
    });

    it("Should renounce the role by role owner", async () => {
      await mineToken.grantRole(BURNER_ROLE, alice.address);
      expect(await mineToken.connect(alice).hasRole(BURNER_ROLE, alice.address)).to.equal(true);
      await mineToken.connect(alice).renounceRole(BURNER_ROLE, alice.address);
      expect(await mineToken.connect(alice).hasRole(BURNER_ROLE, alice.address)).to.equal(false);
    });
  });

  describe("Mint/Burn tokens", async () => {
    beforeEach(async () => {
      await mineToken.grantRole(MINTER_ROLE, alice.address);
      await mineToken.grantRole(BURNER_ROLE, bob.address);
    });

    it("Should not mint token by non minter role owner", async () => {
      expect(await mineToken.balanceOf(bob.address)).to.equal(0);
      await expect(mineToken.mint(bob.address, MINT_AMOUNT)).to.be.reverted;
    });

    it("Should mint token by minter role owner", async () => {
      expect(await mineToken.balanceOf(bob.address)).to.equal(0);
      await mineToken.connect(alice).mint(bob.address, MINT_AMOUNT);
      expect(await mineToken.balanceOf(bob.address)).to.equal(MINT_AMOUNT);
    });

    it("Should not burn his token by non burner role owner himself", async () => {
      await mineToken.connect(alice).mint(bob.address, MINT_AMOUNT);
      await expect(mineToken.connect(alice).burn(BURN_AMOUNT)).to.be.reverted;
    });

    it("Should burn his token by burner role owner himself", async () => {
      await mineToken.connect(alice).mint(bob.address, MINT_AMOUNT);
      await mineToken.connect(bob).burn(BURN_AMOUNT);
      let restAmount = MINT_AMOUNT - BURN_AMOUNT;
      expect(await mineToken.balanceOf(bob.address)).to.equal(restAmount);
    });

    it("Should not burn another user's tokens by non burner role owner", async () => {
      await mineToken.connect(alice).mint(alice.address, MINT_AMOUNT);
      await mineToken.connect(alice).approve(bob.address, BURN_AMOUNT);
      await expect(mineToken.connect(alice).burnFrom(alice.address, BURN_AMOUNT)).to.be.reverted;
    });

    it("Should not burn another user's tokens by non burner role owner", async () => {
      await mineToken.connect(alice).mint(alice.address, MINT_AMOUNT);
      await expect(mineToken.connect(bob).burnFrom(alice.address, BURN_AMOUNT)).to.be.revertedWith(
        "MINEToken: exceeds allowance",
      );
    });

    it("Should burn another user's tokens by burner role owner", async () => {
      await mineToken.connect(alice).mint(alice.address, MINT_AMOUNT);
      await mineToken.connect(alice).approve(bob.address, BURN_AMOUNT);
      await mineToken.connect(bob).burnFrom(alice.address, BURN_AMOUNT);
      let restAmount = MINT_AMOUNT - BURN_AMOUNT;
      expect(await mineToken.balanceOf(alice.address)).to.equal(restAmount);
    });
  });
});
