const contractAddress = "0xFC1EFf670a9A208b0ABb52a12775dA1134048437";

const abi = [
  "function submitTransaction(address,uint256,bytes) returns(uint256)",
  "function confirmTransaction(uint256)",
  "function executeTransaction(uint256)",
  "function revokeConfirmation(uint256)",
  "function getTransactionCount(bool,bool) view returns(uint256)",
  "function transactions(uint256) view returns(address destination,uint256 value,bytes data,bool executed)",
  "function getConfirmationCount(uint256) view returns(uint256)",
  "function confirmations(uint256,address) view returns(bool)",
  "function required() view returns(uint256)",
];
let provider;
let signer;
let contract;

async function connectWallet() {
  if (!window.ethereum) {
    alert("Vui lòng cài MetaMask");
    return;
  }

  provider = new ethers.providers.Web3Provider(window.ethereum);

  await provider.send("eth_requestAccounts", []);

  signer = provider.getSigner();

  const address = await signer.getAddress();

  document.getElementById("address").innerText = address;

  const balance = await provider.getBalance(address);

  document.getElementById("balance").innerText =
    ethers.utils.formatEther(balance) + " ETH";

  contract = new ethers.Contract(contractAddress, abi, signer);

  loadTransactions();
}

async function submitTransaction() {
  try {
    const to = document.getElementById("to").value;
    const amount = document.getElementById("amount").value;

    const tx = await contract.submitTransaction(
      to,
      ethers.utils.parseEther(amount),
      "0x",
    );

    await tx.wait();

    alert("Đã tạo giao dịch");

    setTimeout(loadTransactions, 2000);
  } catch (err) {
    console.log(err);
    alert(err.reason || err.message);
  }
}

async function confirmTransactionById(id) {
  try {
    const tx = await contract.confirmTransaction(id);

    await tx.wait();

    alert("Đã xác nhận");

    setTimeout(loadTransactions, 2000);
  } catch (err) {
    console.log(err);
    alert(err.reason || err.message);
  }
}

async function executeTransactionById(id) {
  try {
    const tx = await contract.executeTransaction(id);

    await tx.wait();

    alert("Đã thực thi");

    setTimeout(loadTransactions, 2000);
  } catch (err) {
    console.log(err);
    alert(err.reason || err.message);
  }
}

async function loadTransactions() {
  if (!contract) return;

  const count = (await contract.getTransactionCount(true, true)).toNumber();

  document.getElementById("totalTx").innerText = count;

  const required = (await contract.required()).toNumber();
  let executed = 0;
  let pending = 0;

  const table = document.getElementById("txTable");

  table.innerHTML = "";

  for (let i = 0; i < count; i++) {
    const tx = await contract.transactions(i);

    const destination = tx.destination;

    const value = ethers.utils.formatEther(tx.value);

    const confirmations = (await contract.getConfirmationCount(i)).toNumber();

    const confirmText = confirmations + "/" + required;

    const executedStatus = tx.executed;

    let status = "";
    let action = "";

    if (executedStatus) {
      status = "🟢 Đã thực thi";

      executed++;

      action = `<span style="color:gray">Hoàn tất</span>`;
    } else {
      status = "🟡 Chờ xác nhận";

      pending++;

      action = `
      <button class="action-btn" onclick="confirmTransactionById(${i})">
      Confirm
      </button>

      <button class="action-btn" onclick="executeTransactionById(${i})">
      Execute
      </button>
      `;
    }

    const row = `
    <tr>
      <td>${i}</td>
      <td>${destination}</td>
      <td>${value}</td>
      <td>${confirmText}</td>
      <td>${status}</td>
      <td>${action}</td>
    </tr>
    `;

    table.innerHTML += row;
  }

  document.getElementById("doneTx").innerText = executed;

  document.getElementById("pendingTx").innerText = pending;
}
