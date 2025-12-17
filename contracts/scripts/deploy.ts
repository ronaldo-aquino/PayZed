/// <reference types="node" />

import hre from "hardhat";
import { writeFileSync } from "fs";

async function main() {
  const { ethers, network } = hre;

  const [deployer] = await ethers.getSigners();

  console.log("Deploying Invopay contract...");
  console.log("Network:", network.name);
  console.log("Deployer address:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "USDC");

  if (balance === BigInt(0)) {
    console.warn("WARNING: Deployer wallet has no balance!");
    console.warn("   Get testnet tokens from: https://faucet.circle.com");
    throw new Error("Insufficient balance for deployment");
  }

  console.log("\nDeploying InvopayFees contract...");
  const InvopayFees = await ethers.getContractFactory("InvopayFees");
  const invopayFees = await InvopayFees.deploy();
  await invopayFees.waitForDeployment();
  const feesContractAddress = await invopayFees.getAddress();
  console.log("InvopayFees deployed at:", feesContractAddress);

  console.log("\nDeploying Invopay contract...");
  const Invopay = await ethers.getContractFactory("Invopay");
  const invopay = await Invopay.deploy(feesContractAddress);
  await invopay.waitForDeployment();

  console.log("\nConfiguring Invopay as allowed source in InvopayFees...");
  const invopayAddress = await invopay.getAddress();
  const setSourceTx = await invopayFees.setAllowedSource(invopayAddress, true);
  await setSourceTx.wait();
  console.log("Invopay configured as allowed source");

  const contractAddress = await invopay.getAddress();
  const deploymentTx = invopay.deploymentTransaction();

  if (!deploymentTx) {
    throw new Error("Contract deployment failed - no transaction found");
  }

  const receipt = await deploymentTx.wait();
  const txHash = receipt?.hash || deploymentTx.hash;

  console.log("\nInvopay deployed successfully!");
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
      const tx1 = await invopay.setAllowedToken(USDC_ADDRESS, true);
      await tx1.wait();
      console.log("✅ USDC allowed");

      const tx2 = await invopay.setAllowedToken(EURC_ADDRESS, true);
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
      console.log("Verifying InvopayFees contract...");
      await hre.run("verify:verify", {
        address: feesContractAddress,
        constructorArguments: [],
      });
      console.log("InvopayFees verified!");

      console.log("Verifying Invopay contract...");
      await hre.run("verify:verify", {
        address: contractAddress,
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
