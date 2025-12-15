/// <reference types="node" />

import hre from "hardhat";
import { writeFileSync } from "fs";

async function main() {
  const { ethers, network } = hre;

  const signers = await ethers.getSigners();
  if (signers.length === 0) {
    throw new Error("No signers available. Please set DEPLOYER_PRIVATE_KEY in .env.local");
  }

  const deployer = signers[0];

  console.log("Deploying InvopaySubscription contract...");
  console.log("Network:", network.name);
  console.log("Deployer address:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "ETH");

  if (balance === BigInt(0)) {
    console.warn("WARNING: Deployer wallet has no balance!");
    console.warn("   Get testnet tokens from: https://faucet.circle.com");
    throw new Error("Insufficient balance for deployment");
  }

  const InvopaySubscription = await ethers.getContractFactory("InvopaySubscription");

  console.log("\nDeploying contract...");
  const invopaySubscription = await InvopaySubscription.deploy();

  await invopaySubscription.waitForDeployment();

  const contractAddress = await invopaySubscription.getAddress();
  const deploymentTx = invopaySubscription.deploymentTransaction();

  if (!deploymentTx) {
    throw new Error("Contract deployment failed - no transaction found");
  }

  const receipt = await deploymentTx.wait();
  const txHash = receipt?.hash || deploymentTx.hash;

  console.log("\nInvopaySubscription deployed successfully!");
  console.log("Contract address:", contractAddress);
  console.log("Transaction hash:", txHash);
  console.log("Block explorer:", `https://testnet.arcscan.app/address/${contractAddress}`);

  const contractInfo = {
    address: contractAddress,
    network: network.name,
    chainId: network.config.chainId,
    deployedAt: new Date().toISOString(),
    transactionHash: txHash,
    deployer: deployer.address,
  };

  writeFileSync("./subscription-contract-address.json", JSON.stringify(contractInfo, null, 2));

  console.log("\nContract address saved to subscription-contract-address.json");

  if (network.name === "arcTestnet") {
    const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";
    const EURC_ADDRESS = "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a";

    console.log("\nInitializing allowed tokens...");
    try {
      const tx1 = await invopaySubscription.setAllowedToken(USDC_ADDRESS, true);
      await tx1.wait();
      console.log("✅ USDC allowed");

      const tx2 = await invopaySubscription.setAllowedToken(EURC_ADDRESS, true);
      await tx2.wait();
      console.log("✅ EURC allowed");
    } catch (error: any) {
      console.warn("Token initialization failed:", error.message);
    }
  }

  if (network.name === "arcTestnet") {
    console.log("\nWaiting for block confirmations before verification...");
    await new Promise((resolve) => setTimeout(resolve, 10000));

    try {
      console.log("Verifying contract on ArcScan...");
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [],
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

  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log(`Contract Address: ${contractAddress}`);
  console.log(`Network: ${network.name}`);
  console.log(`Transaction: ${txHash}`);
  console.log("\nAdd this to your .env.local file:");
  console.log(`NEXT_PUBLIC_INVOPAY_SUBSCRIPTION_CONTRACT_ADDRESS=${contractAddress}`);
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


