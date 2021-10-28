const { expect } = require("chai");
const { upgrades } = require("hardhat");
const { toRole } = require("../utils");

describe("WToken", () => {
  let wBTCO;

  const MINTER_ROLE = toRole("MINTER_ROLE");
  const BURNER_ROLE = toRole("BURNER_ROLE");
  const MINT_AMOUNT = 100;
  const BURN_AMOUNT = 50;

  beforeEach(async () => {
    [deployer, alice, bob] = await ethers.getSigners();

    const WToken = await ethers.getContractFactory("WToken");
    wBTCO = await upgrades.deployProxy(WToken, ["wBTCO", "wBTCO"]);
  });

  describe("Role", async () => {
    it("Should have correct name/symbol", async () => {
      expect(await wBTCO.name()).to.be.equal("wBTCO");
      expect(await wBTCO.symbol()).to.be.equal("wBTCO");
    });

    it("Should assign the default admin to the deployer", async () => {
      expect(await wBTCO.hasRole(wBTCO.DEFAULT_ADMIN_ROLE(), deployer.address)).to.equal(true);
    });

    it("Should get the role admin", async () => {
      let roleAdmin = await wBTCO.DEFAULT_ADMIN_ROLE();
      expect(await wBTCO.getRoleAdmin(MINTER_ROLE)).to.be.equal(roleAdmin);
    });

    it("Should not grant the role by non role admin", async () => {
      await expect(wBTCO.connect(bob).grantRole(MINTER_ROLE, alice.address)).to.be.reverted;
    });

    it("Should grant the role to another user by role admin", async () => {
      expect(await wBTCO.hasRole(MINTER_ROLE, alice.address)).to.equal(false);
      await wBTCO.grantRole(MINTER_ROLE, alice.address);
      expect(await wBTCO.hasRole(MINTER_ROLE, alice.address)).to.equal(true);
    });

    it("Should not revoke the role by non role admin", async () => {
      await expect(wBTCO.connect(bob).revokeRole(MINTER_ROLE, alice.address)).to.be.reverted;
    });

    it("Should revoke the role to another user by role admin", async () => {
      await wBTCO.grantRole(MINTER_ROLE, alice.address);
      expect(await wBTCO.hasRole(MINTER_ROLE, alice.address)).to.equal(true);
      await wBTCO.revokeRole(MINTER_ROLE, alice.address);
      expect(await wBTCO.hasRole(MINTER_ROLE, alice.address)).to.equal(false);
    });

    it("Should not renounce the role by non role owner", async () => {
      await wBTCO.grantRole(BURNER_ROLE, alice.address);
      await expect(wBTCO.renounceRole(BURNER_ROLE, alice.address)).to.be.revertedWith(
        "AccessControl: can only renounce roles for self",
      );
    });

    it("Should renounce the role by role owner", async () => {
      await wBTCO.grantRole(BURNER_ROLE, alice.address);
      expect(await wBTCO.connect(alice).hasRole(BURNER_ROLE, alice.address)).to.equal(true);
      await wBTCO.connect(alice).renounceRole(BURNER_ROLE, alice.address);
      expect(await wBTCO.connect(alice).hasRole(BURNER_ROLE, alice.address)).to.equal(false);
    });
  });

  describe("Mint/Burn tokens", async () => {
    beforeEach(async () => {
      await wBTCO.grantRole(MINTER_ROLE, alice.address);
      await wBTCO.grantRole(BURNER_ROLE, bob.address);
    });

    it("Should not mint token by non minter role owner", async () => {
      expect(await wBTCO.balanceOf(bob.address)).to.equal(0);
      await expect(wBTCO.mint(bob.address, MINT_AMOUNT)).to.be.reverted;
    });

    it("Should mint token by minter role owner", async () => {
      expect(await wBTCO.balanceOf(bob.address)).to.equal(0);
      await wBTCO.connect(alice).mint(bob.address, MINT_AMOUNT);
      expect(await wBTCO.balanceOf(bob.address)).to.equal(MINT_AMOUNT);
    });

    it("Should not burn his token by non burner role owner himself", async () => {
      await wBTCO.connect(alice).mint(bob.address, MINT_AMOUNT);
      await expect(wBTCO.connect(alice).burn(BURN_AMOUNT)).to.be.reverted;
    });

    it("Should burn his token by burner role owner himself", async () => {
      await wBTCO.connect(alice).mint(bob.address, MINT_AMOUNT);
      await wBTCO.connect(bob).burn(BURN_AMOUNT);
      let restAmount = MINT_AMOUNT - BURN_AMOUNT;
      expect(await wBTCO.balanceOf(bob.address)).to.equal(restAmount);
    });

    it("Should not burn another user's tokens by non burner role owner", async () => {
      await wBTCO.connect(alice).mint(alice.address, MINT_AMOUNT);
      await wBTCO.connect(alice).approve(bob.address, BURN_AMOUNT);
      await expect(wBTCO.connect(alice).burnFrom(alice.address, BURN_AMOUNT)).to.be.reverted;
    });

    it("Should not burn another user's tokens by non burner role owner", async () => {
      await wBTCO.connect(alice).mint(alice.address, MINT_AMOUNT);
      await expect(wBTCO.connect(bob).burnFrom(alice.address, BURN_AMOUNT)).to.be.revertedWith(
        "WToken: exceeds allowance",
      );
    });

    it("Should burn another user's tokens by burner role owner", async () => {
      await wBTCO.connect(alice).mint(alice.address, MINT_AMOUNT);
      await wBTCO.connect(alice).approve(bob.address, BURN_AMOUNT);
      await wBTCO.connect(bob).burnFrom(alice.address, BURN_AMOUNT);
      let restAmount = MINT_AMOUNT - BURN_AMOUNT;
      expect(await wBTCO.balanceOf(alice.address)).to.equal(restAmount);
    });
  });
});
