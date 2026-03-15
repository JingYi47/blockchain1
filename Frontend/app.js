const contractAddress = "0xFC1EFf670a9A208b0ABb52a12775dA1134048437";
const channelAddress = "0x3f690D2265A57b248B3B25c16eE73cC7Ce34119F";

const contractAbi = [
  "function submitTransaction(address,uint256,bytes) returns(uint256)",
  "function confirmTransaction(uint256)",
  "function executeTransaction(uint256)",
  "function getTransactionCount(bool,bool) view returns(uint256)",
  "function transactions(uint256) view returns(address,uint256,bytes,bool)",
  "function getConfirmationCount(uint256) view returns(uint256)",
  "function required() view returns(uint256)",
];

const channelAbi = [
  "function closeChannel(uint256 amount,uint256 nonce,bytes signature)",
  "function getMessageHash(uint256 amount,uint256 nonce) view returns(bytes32)",

  "function sender() view returns(address)",
  "function receiver() view returns(address)",
  "function deposit() view returns(uint256)",
  "function isClosed() view returns(bool)",
];
let provider;
let signer;
let contract;
let channelContract;
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

  contract = new ethers.Contract(contractAddress, contractAbi, signer);

  channelContract = new ethers.Contract(channelAddress, channelAbi, signer);
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

    // const destination = tx.destination;

    // const value = ethers.utils.formatEther(tx.value);
    const destination = tx[0];
    const value = ethers.utils.formatEther(tx[1]);
    const executedStatus = tx[3];

    const confirmations = (await contract.getConfirmationCount(i)).toNumber();

    const confirmText = confirmations + "/" + required;

    // const executedStatus = tx.executed;

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
async function signPayment() {
  try {
    const amount = document.getElementById("payAmount").value;
    const nonce = parseInt(document.getElementById("nonce").value);

    const amountWei = ethers.utils.parseEther(amount);

    const messageHash = ethers.utils.solidityKeccak256(
      ["address", "uint256", "uint256"],
      [channelAddress, amountWei, nonce],
    );

    console.log("MessageHash:", messageHash);

    const signature = await signer.signMessage(
      ethers.utils.arrayify(messageHash),
    );

    console.log("Signature:", signature);

    document.getElementById("signature").value = signature;

    alert("Đã ký giao dịch off-chain");
  } catch (err) {
    console.log(err);
    alert(err.message);
  }
}
async function closeChannel() {
  try {
    const amount = document.getElementById("payAmount").value;
    const nonce = parseInt(document.getElementById("nonce").value);
    const signature = document.getElementById("signature").value;

    const tx = await channelContract.closeChannel(
      ethers.utils.parseEther(amount),
      nonce,
      signature,
    );

    await tx.wait();

    alert("Thanh toán micropayment thành công");
  } catch (err) {
    console.log(err);
    alert(err.reason || err.message);
  }
}
async function verifySignature() {
  try {
    const amount = document.getElementById("payAmount").value;
    const nonce = parseInt(document.getElementById("nonce").value);
    const signature = document.getElementById("signature").value;
    const amountWei = ethers.utils.parseEther(amount);

    const messageHash = ethers.utils.solidityKeccak256(
      ["address", "uint256", "uint256"],
      [channelAddress, amountWei, nonce],
    );

    console.log("Message hash cần verify:", messageHash);

    // Lấy địa chỉ đã ký
    const recoveredAddress = ethers.utils.verifyMessage(
      ethers.utils.arrayify(messageHash),
      signature,
    );
    const sender = await channelContract.sender();

    console.log("Địa chỉ đã ký:", recoveredAddress);
    console.log("Địa chỉ hiện tại:", await signer.getAddress());

    if (recoveredAddress.toLowerCase() === sender.toLowerCase()) {
      console.log("✅ Signature hợp lệ!");
      alert("✅ Signature hợp lệ! Người ký đúng là sender");
    } else {
      console.log("❌ Signature không hợp lệ!");
      alert("❌ Signature không hợp lệ!");
    }
  } catch (err) {
    console.log(err);
  }
}
async function checkChannelInfo() {
  try {
    console.log("=== THÔNG TIN CHANNEL ===");
    console.log("Địa chỉ contract:", channelAddress);

    // Gọi các biến public từ contract
    const sender = await channelContract.sender();
    const receiver = await channelContract.receiver();
    const deposit = await channelContract.deposit();
    const isClosed = await channelContract.isClosed();

    console.log("Sender (Account 1):", sender);
    console.log("Receiver (Account 2):", receiver);
    console.log("Deposit:", ethers.utils.formatEther(deposit), "ETH");
    console.log("isClosed:", isClosed);
    console.log("Current account:", await signer.getAddress());

    if (isClosed) {
      alert("Channel đã đóng rồi!");
    }
  } catch (err) {
    console.log("Lỗi khi check channel:", err);
  }
}
