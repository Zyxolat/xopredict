const hre = require("hardhat");

async function main() {
  console.log("================================================================================");
  console.log("   LOCAL HARDHAT PERSISTENT DEPLOYMENT                                          ");
  console.log("================================================================================\n");

  const signers = await hre.ethers.getSigners();
  const deployer = signers[0];
  console.log(`Deployer address: ${deployer.address}`);

  const ORACLE_FEE = hre.ethers.parseEther("0.01");

  // 1. Deploy MockUSDM
  console.log("Deploying MockUSDM...");
  const MockUSDM = await hre.ethers.getContractFactory("MockUSDM");
  const usdm = await MockUSDM.deploy();
  await usdm.waitForDeployment();
  const usdmAddress = await usdm.getAddress();
  console.log(`✅ MockUSDM deployed at: ${usdmAddress}`);

  // 2. Deploy MockWitnetRandomness
  console.log("Deploying MockWitnetRandomness...");
  const MockWitnet = await hre.ethers.getContractFactory("MockWitnetRandomness");
  const witnet = await MockWitnet.deploy(ORACLE_FEE);
  await witnet.waitForDeployment();
  const witnetAddress = await witnet.getAddress();
  console.log(`✅ MockWitnetRandomness deployed at: ${witnetAddress}`);

  // 3. Deploy Xolat
  console.log("Deploying Xolat...");
  const Xolat = await hre.ethers.getContractFactory("Xolat");
  const xolat = await Xolat.deploy(usdmAddress, witnetAddress);
  await xolat.waitForDeployment();
  const xolatAddress = await xolat.getAddress();
  console.log(`✅ Xolat contract deployed at: ${xolatAddress}`);

  // 4. Fund test signers with USDm
  console.log("\nMinting USDm & approving Xolat contract for test accounts...");
  const MINT_AMOUNT = hre.ethers.parseUnits("1000000", 18); // 1,000,000 USDm
  for (const signer of signers.slice(0, 5)) {
    await usdm.mint(signer.address, MINT_AMOUNT);
    await usdm.connect(signer).approve(xolatAddress, hre.ethers.MaxUint256);
    console.log(`  - Funded ${signer.address} with 1,000,000 USDm`);
  }

  console.log("\n================================================================================");
  console.log("   DEPLOYMENT COMPLETE                                                         ");
  console.log("================================================================================");
  console.log(`NEXT_PUBLIC_USDM_TOKEN_ADDRESS=${usdmAddress}`);
  console.log(`NEXT_PUBLIC_XOLAT_CONTRACT_ADDRESS=${xolatAddress}`);
  console.log(`WITNET_RANDOMNESS_ADDRESS=${witnetAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
