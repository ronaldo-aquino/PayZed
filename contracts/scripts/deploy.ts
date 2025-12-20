/// <reference types="node" />

import hre from "hardhat";
import { writeFileSync } from "fs";

async function main() {
  const { ethers, network } = hre;

  const [deployer] = await ethers.getSigners();

  console.log("Deploying PayZed contract...");
  console.log("Network:", network.name);
  console.log("Deployer address:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "USDC");

  if (balance === BigInt(0)) {
    console.warn("WARNING: Deployer wallet has no balance!");
    console.warn("   Get testnet tokens from: https://faucet.circle.com");
    throw new Error("Insufficient balance for deployment");
  }

  console.log("\nDeploying PayZedFees contract...");
  const PayZedFees = await ethers.getContractFactory("PayZedFees");
  const payzedFees = await PayZedFees.deploy();
  await payzedFees.waitForDeployment();
  const feesContractAddress = await payzedFees.getAddress();
  console.log("PayZedFees deployed at:", feesContractAddress);

  console.log("\nDeploying PayZed contract...");
  const PayZed = await ethers.getContractFactory("PayZed");
  const payzed = await PayZed.deploy(feesContractAddress);
  await payzed.waitForDeployment();

  console.log("\nConfiguring PayZed as allowed source in PayZedFees...");
  const payzedAddress = await payzed.getAddress();
  const setSourceTx = await payzedFees.setAllowedSource(payzedAddress, true);
  await setSourceTx.wait();
  console.log("PayZed configured as allowed source");

  const contractAddress = await payzed.getAddress();
  const deploymentTx = payzed.deploymentTransaction();

  if (!deploymentTx) {
    throw new Error("Contract deployment failed - no transaction found");
  }

  const receipt = await deploymentTx.wait();
  const txHash = receipt?.hash || deploymentTx.hash;

  console.log("\nPayZed deployed successfully!");
  console.log("Contract address:", contractAddress);
  console.log("Transaction hash:", txHash);
  console.log("Block explorer:", `https://testnet.arcscan.app/address/${contractAddress}`);

  const contractInfo = {
    address: contractAddress,
    feesContractAddress: feesContractAddress,
    network: network.name,
    chainId: network.config.chainId,
    deployedAt: new Date().toISOString(),
    transactionHash: txHash,
    deployer: deployer.address,
  };

  writeFileSync("./contract-address.json", JSON.stringify(contractInfo, null, 2));

  console.log("\nContract address saved to contract-address.json");

  if (network.name === "arcTestnet") {
    const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";
    const EURC_ADDRESS = "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a";

    console.log("\nInitializing allowed tokens...");
    try {
      const tx1 = await payzed.setAllowedToken(USDC_ADDRESS, true);
      await tx1.wait();
      console.log("✅ USDC allowed");

      const tx2 = await payzed.setAllowedToken(EURC_ADDRESS, true);
      await tx2.wait();
      console.log("✅ EURC allowed");
    } catch (error: any) {
      console.warn("Token initialization failed:", error.message);
      console.warn("   You can initialize tokens manually using: npm run initialize:tokens");
    }
  }

  if (network.name === "arcTestnet") {
    console.log("\nWaiting for block confirmations before verification...");
    await new Promise((resolve) => setTimeout(resolve, 10000));

    try {
      console.log("Verifying contract on ArcScan...");
      console.log("Verifying PayZedFees contract...");
      await hre.run("verify:verify", {
        address: feesContractAddress,
        contract: "contracts/sol/PayZedFees.sol:PayZedFees",
        constructorArguments: [],
      });
      console.log("PayZedFees verified!");

      console.log("Verifying PayZed contract...");
      await hre.run("verify:verify", {
        address: contractAddress,
        contract: "contracts/sol/PayZed.sol:PayZed",
        constructorArguments: [feesContractAddress],
      });
      console.log("Contract verified!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("Contract already verified");
      } else {
        console.warn("Contract verification failed:", error.message);
        console.warn(
          "   You can verify manually at: https://testnet.arcscan.app/address/" + contractAddress
        );
      }
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
