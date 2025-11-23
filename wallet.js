/* Sardalla Wallet — Full version with cancel, overlay, auto-load, fixes */

(() => {

////////////////////////////////////////////////////////////////
// CONFIG
////////////////////////////////////////////////////////////////

const SAR = "0x851d720513fF135007dE95bd58B28514093bEb25";
const RPC = "https://bsc-dataseed.binance.org/";
const ABI = [
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)"
];
const STORAGE_KEY = "sardalla_keystores_v1";

let provider = new ethers.providers.JsonRpcProvider(RPC);
let activeWallet = null;
let tokenDecimals = 18;
let mnemonicConfirmed = false;
let pendingLoadIndex = null;

////////////////////////////////////////////////////////////////
// HELPERS
////////////////////////////////////////////////////////////////

const $ = (s) => document.querySelector(s);

function setStatus(msg, bad=false) {
  const el = $("#walletStatus");
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle("warn", bad);
}

function showToast(text, delay=2500) {
  const t = $("#toast");
  t.textContent = text;
  t.style.display = "block";
  setTimeout(() => t.style.display = "none", delay);
}

function loadKeystores() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveKeystores(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function truncate(addr) {
  return addr.slice(0,6) + "…" + addr.slice(-6);
}

////////////////////////////////////////////////////////////////
// RENDER LIST
////////////////////////////////////////////////////////////////

function renderKeystoreList() {
  const arr = loadKeystores();
  const el = $("#walletList");
  el.innerHTML = "";

  if (!arr.length) {
    el.innerHTML = `<div class="muted">No saved wallets.</div>`;
    return;
  }

  arr.forEach((item, i) => {

    const row = document.createElement("div");
    row.style.cssText = "display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;";

    const info = document.createElement("div");
    info.innerHTML = `
      <div style="font-weight:700">
        ${item.name} <span class="badge-saved">Saved</span>
      </div>
      <div class="muted" style="font-size:12px">${truncate(item.address)}</div>
    `;

    const btns = document.createElement("div");
    btns.style.display = "flex";
    btns.style.gap = "6px";

    const load = document.createElement("button");
    load.className = "btn outline";
    load.textContent = "Load";
    load.onclick = () => openUnlockModal(i);

    const dl = document.createElement("button");
    dl.className = "btn secondary";
    dl.textContent = "Download";
    dl.onclick = () => {
      const blob = new Blob([item.keystore], {type:"application/json"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sardalla_keystore_${item.address}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Keystore downloaded");
    };

    const del = document.createElement("button");
    del.className = "btn";
    del.textContent = "Delete";
    del.onclick = () => {
      if (!confirm("Delete wallet?")) return;
      const list = loadKeystores();
      list.splice(i,1);
      saveKeystores(list);
      renderKeystoreList();
      showToast("Wallet deleted");
    };

    btns.append(load, dl, del);
    row.append(info, btns);
    el.append(row);
  });
}

////////////////////////////////////////////////////////////////
// UNLOCK MODAL
////////////////////////////////////////////////////////////////

function openUnlockModal(i) {
  pendingLoadIndex = i;
  $("#unlockPasswordInput").value = "";
  $("#modalBackdrop").style.display = "flex";
}
$("#unlockCancel").onclick = () => {
  $("#modalBackdrop").style.display = "none";
};

$("#unlockConfirm").onclick = async () => {
  const pwd = $("#unlockPasswordInput").value;
  if (!pwd) return showToast("Enter password");

  const list = loadKeystores();
  const item = list[pendingLoadIndex];

  try {
    const w = await ethers.Wallet.fromEncryptedJson(item.keystore, pwd);
    activeWallet = w.connect(provider);

    $("#walletAddress").textContent = activeWallet.address;

    const q = document.getElementById("qrcode");
    if (q) {
      q.innerHTML = "";
      new QRCode(q, activeWallet.address);
    }
    $("#qrBlock")?.style?.setProperty("display","block");

    $("#modalBackdrop").style.display = "none";
    showToast("Wallet unlocked");
    refreshBalances();

  } catch {
    showToast("Wrong password");
  }
};

////////////////////////////////////////////////////////////////
// CREATE WALLET
////////////////////////////////////////////////////////////////

$("#createWalletBtn").onclick = () => {

  const w = ethers.Wallet.createRandom();
  activeWallet = w.connect(provider);
  mnemonicConfirmed = false;

  $("#mnemonicBox").style.display = "block";
  $("#cancelCreateBtn").style.display = "block";

  $("#mnemonicDisplay").value = w.mnemonic.phrase;
  $("#mnemonicDisplay").style.display = "none";

  $("#showMnemonicBtn").style.display = "inline-block";
  $("#copyMnemonicBtn").style.display = "none";
  $("#mnemonicOkBtn").style.display = "none";

  $("#saveKeystoreBtn").disabled = true;
  $("#saveHint").style.display = "none";

  $("#walletAddress").textContent = w.address;

  const q = document.getElementById("qrcode");
  if (q) {
    q.innerHTML = "";
    new QRCode(q, w.address);
  }

  refreshBalances();
  setStatus("Wallet created. Backup the phrase.");
};

$("#cancelCreateBtn").onclick = () => {
  $("#mnemonicBox").style.display = "none";
  $("#cancelCreateBtn").style.display = "none";
  mnemonicConfirmed = false;
  activeWallet = null;
  setStatus("Creation cancelled.");
};

////////////////////////////////////////////////////////////////
// MNEMONIC UI
////////////////////////////////////////////////////////////////

$("#showMnemonicBtn").onclick = () => {
  $("#mnemonicDisplay").style.display = "block";
  $("#copyMnemonicBtn").style.display = "inline-block";
  $("#mnemonicOkBtn").style.display = "inline-block";
  $("#showMnemonicBtn").style.display = "none";
};

$("#copyMnemonicBtn").onclick = () => {
  navigator.clipboard.writeText($("#mnemonicDisplay").value);
  showToast("Copied");
};

$("#mnemonicOkBtn").onclick = () => {
  mnemonicConfirmed = true;

  const ps = $("#phraseSection");
  ps.style.display = "none";

  $("#saveHint").style.display = "block";

  const btn = $("#saveKeystoreBtn");
  btn.disabled = false;
  btn.classList.add("highlight");

  showToast("Step 4: Save keystore");
};

////////////////////////////////////////////////////////////////
// SAVE KEYSTORE
////////////////////////////////////////////////////////////////

$("#saveKeystoreBtn").onclick = async () => {
  if (!activeWallet) return showToast("No wallet");

  if (!mnemonicConfirmed)
    return showToast("Confirm mnemonic first");

  const pwd = $("#saveKeystorePwd").value;
  if (!pwd || pwd.length < 8)
    return showToast("Password ≥ 8 chars");

  const name = $("#walletNameInput").value.trim() || ("Wallet " + Date.now());

  const list = loadKeystores();
  if (list.some(e => e.address.toLowerCase() === activeWallet.address.toLowerCase())) {
    showToast("Already saved");
    return setTimeout(() => location.reload(), 600);
  }

  $("#savingOverlay").style.display = "flex";

  try {
    const enc = await activeWallet.encrypt(pwd);

    list.push({ 
      id: Date.now(),
      name,
      address: activeWallet.address,
      keystore: enc 
    });
    saveKeystores(list);

    showToast("Saved ✓");
    setTimeout(() => location.reload(), 800);

  } catch {
    $("#savingOverlay").style.display = "none";
    showToast("Encrypt failed");
  }
};

////////////////////////////////////////////////////////////////
// IMPORT MNEMONIC
////////////////////////////////////////////////////////////////

$("#importMnemonicBtn").onclick = async () => {
  const m = $("#importMnemonic").value.trim();
  if (!m || m.split(" ").length < 12) return showToast("Invalid seed");

  const pwd = $("#importMnemonicPwd").value;
  if (!pwd || pwd.length < 8) return showToast("Password ≥ 8");

  const name = $("#importName").value.trim() || ("Imported " + Date.now());
  try {
    const w = ethers.Wallet.fromMnemonic(m);
    const list = loadKeystores();

    if (list.some(e => e.address.toLowerCase() === w.address.toLowerCase()))
      return showToast("Already saved");

    const enc = await w.encrypt(pwd);
    list.push({ id:Date.now(), name, address:w.address, keystore:enc });
    saveKeystores(list);

    showToast("Imported ✓");
    setTimeout(() => location.reload(), 600);

  } catch {
    showToast("Import failed");
  }
};

////////////////////////////////////////////////////////////////
// IMPORT JSON
////////////////////////////////////////////////////////////////

$("#importKeystoreBtn").onclick = () => {
  const json = $("#importJson").value.trim();
  if (!json) return showToast("Paste JSON");

  let parsed;
  try { parsed = JSON.parse(json); }
  catch { return showToast("Bad JSON"); }

  const name = $("#importJsonName").value.trim() || ("Imported " + Date.now());
  const address = parsed.address ? 
    (parsed.address.startsWith("0x") ? parsed.address : "0x"+parsed.address)
    : "";

  const list = loadKeystores();

  if (list.some(e => e.address.toLowerCase() === address.toLowerCase()))
    return showToast("Already saved");

  list.push({ id:Date.now(), name, address, keystore:json });
  saveKeystores(list);

  showToast("Saved ✓");
  setTimeout(() => location.reload(), 600);
};

////////////////////////////////////////////////////////////////
// CLEAR ALL
////////////////////////////////////////////////////////////////

$("#clearAllBtn").onclick = () => {
  if (!confirm("Delete all wallets?")) return;
  localStorage.removeItem(STORAGE_KEY);
  renderKeystoreList();
  showToast("All cleared");
};

////////////////////////////////////////////////////////////////
// BALANCES
////////////////////////////////////////////////////////////////

async function refreshBalances() {
  if (!activeWallet) {
    $("#bnbBalance").textContent = "0";
    $("#sarBalance").textContent = "0";
    return;
  }
  try {
    const b = await provider.getBalance(activeWallet.address);
    $("#bnbBalance").textContent = ethers.utils.formatEther(b);

    const c = new ethers.Contract(SAR, ABI, provider);
    tokenDecimals = await c.decimals();
    const raw = await c.balanceOf(activeWallet.address);
    $("#sarBalance").textContent = ethers.utils.formatUnits(raw, tokenDecimals);

  } catch {
    setStatus("Balance update failed", true);
  }
}

////////////////////////////////////////////////////////////////
// SEND
////////////////////////////////////////////////////////////////

$("#sendSarBtn").onclick = async () => {
  if (!activeWallet) return showToast("Load wallet first");

  const to = $("#sendTo").value.trim();
  const amt = $("#sendAmt").value.trim();

  if (!ethers.utils.isAddress(to)) return showToast("Bad address");
  if (!amt) return showToast("Amount?");

  try {
    const signer = activeWallet.connect(provider);
    const c = new ethers.Contract(SAR, ABI, signer);
    const tx = await c.transfer(to, ethers.utils.parseUnits(amt, tokenDecimals));
    showToast("Tx sent…");
    await tx.wait();
    showToast("Confirmed");
    refreshBalances();
  } catch {
    showToast("Send failed");
  }
};

////////////////////////////////////////////////////////////////
// AUTO-LOAD LAST WALLET ON PAGE LOAD
////////////////////////////////////////////////////////////////

window.addEventListener("load", () => {
  renderKeystoreList();

  const arr = loadKeystores();
  if (arr.length > 0) {
    $("#walletAddress").textContent = arr[arr.length - 1].address;
    setStatus("Wallet ready. Press LOAD to unlock.");
  }
});

})();



