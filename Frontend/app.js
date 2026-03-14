const contractAddress = "0xcD6a42782d230D7c13A74ddec5dD140e55499Df9";

const abi = [
  "function submitTransaction(address destination, uint value, bytes data) returns (uint)",
  "function confirmTransaction(uint transactionId)",
  "function executeTransaction(uint transactionId)",
  "function getTransactionCount(bool pending, bool executed) view returns (uint)",
  "function getOwners() view returns (address[])",
];

let provider;
let signer;
let contract;

async function connectWallet() {
  if (!window.ethereum) {
    alert("Please install MetaMask");
    return;
  }

  provider = new ethers.providers.Web3Provider(window.ethereum);

  await provider.send("eth_requestAccounts", []);

  signer = provider.getSigner();

  const address = await signer.getAddress();

  document.getElementById("address").innerText = "Address: " + address;

  const balance = await provider.getBalance(address);

  document.getElementById("balance").innerText =
    "Balance: " + ethers.utils.formatEther(balance) + " ETH";

  contract = new ethers.Contract(contractAddress, abi, signer);

  console.log("Contract connected");
}

async function submitTransaction() {
  const to = document.getElementById("to").value;
  const amount = document.getElementById("amount").value;

  const tx = await contract.submitTransaction(
    to,
    ethers.utils.parseEther(amount),
    "0x",
  );

  await tx.wait();

  alert("Transaction submitted");
}

async function confirmTransaction() {
  const txId = document.getElementById("txid").value;

  const tx = await contract.confirmTransaction(txId);

  await tx.wait();

  alert("Transaction confirmed");
}

async function executeTransaction() {
  const txId = document.getElementById("txid").value;

  const tx = await contract.executeTransaction(txId);

  await tx.wait();

  alert("Transaction executed");
}
