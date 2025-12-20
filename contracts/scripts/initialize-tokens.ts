/// <reference types="node" />

import hre from "hardhat";
import { readFileSync } from "fs";

async function main() {
  const { ethers, network } = hre;

  let contractAddress: string | undefined = process.env.CONTRACT_ADDRESS;
  
  if (!contractAddress) {
    try {
      const contractInfo = JSON.parse(readFileSync("./contract-address.json", "utf-8"));
      contractAddress = contractInfo.address;
    } catch (error) {
      throw new Error("CONTRACT_ADDRESS environment variable is required or contract-address.json must exist");
    }
  }

  if (!contractAddress) {
    throw new Error("Contract address is required");
  }

  const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";
  const EURC_ADDRESS = "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a";

  const [deployer] = await ethers.getSigners();
  console.log("Initializing allowed tokens...");
  console.log("Network:", network.name);
  console.log("Contract address:", contractAddress);
  console.log("Deployer address:", deployer.address);

  const PayZed = await ethers.getContractFactory("PayZed");
  const contract = PayZed.attach(contractAddress);

  console.log("\nSetting USDC as allowed token...");
  const tx1 = await contract.setAllowedToken(USDC_ADDRESS, true);
  await tx1.wait();
  console.log("✅ USDC allowed");

  console.log("\nSetting EURC as allowed token...");
  const tx2 = await contract.setAllowedToken(EURC_ADDRESS, true);
  await tx2.wait();
  console.log("✅ EURC allowed");

  console.log("\n✅ Token initialization complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

