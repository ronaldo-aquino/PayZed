/// <reference types="node" />

import hre from "hardhat";
import { readFileSync } from "fs";

async function main() {
  const { network } = hre;

  // Read contract address from file
  let contractAddress: string;
  try {
    const contractInfo = JSON.parse(readFileSync("./contract-address.json", "utf-8"));
    contractAddress = contractInfo.address;
    console.log("Contract address from contract-address.json:", contractAddress);
  } catch (error) {
    console.error("Error reading contract-address.json");
    console.error("Please provide the contract address as an argument:");
    console.error("  npm run verify:contract <CONTRACT_ADDRESS>");
    process.exit(1);
  }

  if (network.name !== "arcTestnet") {
    console.warn("Warning: This script is designed for arcTestnet");
    console.warn(`Current network: ${network.name}`);
  }

  console.log("\nVerifying contract on ArcScan...");
  console.log("Network:", network.name);
  console.log("Contract address:", contractAddress);

  try {
    // Read fees contract address from file
    let feesContractAddress: string;
    try {
      const contractInfo = JSON.parse(readFileSync("./contract-address.json", "utf-8"));
      feesContractAddress = contractInfo.feesContractAddress;
    } catch (error) {
      console.error("Error reading feesContractAddress from contract-address.json");
      feesContractAddress = "";
    }

    console.log("Verifying PayZed contract...");
    await hre.run("verify:verify", {
      address: contractAddress,
      contract: "sol/PayZed.sol:PayZed",
      constructorArguments: feesContractAddress ? [feesContractAddress] : [],
    });
    console.log("\n✅ Contract verified successfully!");
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("\n✅ Contract is already verified!");
      console.log("   You can view it at: https://testnet.arcscan.app/address/" + contractAddress);
    } else {
      console.error("\n❌ Contract verification failed:");
      console.error("   Error:", error.message);
      console.error("\n   You can verify manually at:");
      console.error("   https://testnet.arcscan.app/address/" + contractAddress);
      process.exit(1);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

