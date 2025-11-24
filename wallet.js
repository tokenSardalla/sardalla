/* Sardalla Wallet - wallet.js
   Adds:
   - Receive modal (hybrid Sardalla colors)
   - Send modal (full-screen Trust style)
   - Transaction history UI (Trust-style list)
   - Official BNB icon injection
   - Integrates with existing functions (create/import/save/load)
*/

/* CONFIG */
const SAR_CONTRACT = "0x851d720513fF135007dE95bd58B28514093bEb25";
const BSC_RPC = "https://bsc-dataseed.binance.org/";
const CHAIN_ID = 56;

const ERC20_ABI = [
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)"
];

const provider = new ethers.providers.JsonRpcProvider(BSC_RPC);

let activeWallet = null;
let mnemonicConfirmed = false;

/* STORAGE KEYS */
const KEY_KEYSTORES = "sardalla_keystores_v1";
const KEY_HISTORY = "sardalla_tx_history_v1";

/* SELECTOR HELPERS */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

/* TOAST */
function showToast(msg, time = 2200){
  const t = $("#toast");
  if(!t) return alert(msg);
  t.textContent = msg;
  t.style.display = "block";
  setTimeout(()=> t.style.display = "none", time);
}

/* LOAD / SAVE */
function loadKeystores(){ try { return JSON.parse(localStorage.getItem(KEY_KEYSTORES) || "[]"); } catch { return []; } }
function saveKeystores(a){ localStorage.setItem(KEY_KEYSTORES, JSON.stringify(a)); }

function loadHistory(){ try { return JSON.parse(localStorage.getItem(KEY_HISTORY) || "[]"); } catch { return []; } }
function saveHistory(h){ localStorage.setItem(KEY_HISTORY, JSON.stringify(h)); }
function addHistory(entry){
  const h = loadHistory();
  h.unshift(entry);
  saveHistory(h);
}

/* --------------------------------------------------------
   INITIAL RENDER / ICON FIX
   -------------------------------------------------------- */
window.addEventListener("load", ()=>{
  renderKeystoreList();
  injectOfficialIcons();
  // show last saved address if exists
  const arr = loadKeystores();
  if(arr.length > 0){
    $("#walletAddress").textContent = arr[arr.length-1].address || "—";
    $("#walletShortAddr").textContent = (arr[arr.length-1].address || "—").slice(0,6) + "…" + (arr[arr.length-1].address || "—").slice(-6);
  }
  refreshBalances();
});

/* Replace token icon with official BNB and add tiny network badge for each token row */
function injectOfficialIcons(){
  const bnbImg = "https://assets.coingecko.com/coins/images/825/large/binance-coin-logo.png";
  const bnbRow = $("#tokenBNB");
  if(bnbRow){
    const img = bnbRow.querySelector("img");
    if(img) img.src = bnbImg;
    // add network badge
    let badge = bnbRow.querySelector(".network-badge");
    if(!badge){
      badge = document.createElement("span");
      badge.className = "network-badge";
      badge.style.cssText = "margin-left:8px;font-size:11px;color:#ffd454;background:rgba(255,218,26,0.06);padding:4px 6px;border-radius:8px;";
      badge.textContent = "BNB Chain";
      bnbRow.querySelector(".token-info").appendChild(badge);
    }
  }
  // SAR row: add network badge small
  const sarRow = $("#tokenSAR");
  if(sarRow){
    let badge = sarRow.querySelector(".network-badge");
    if(!badge){
      badge = document.createElement("span");
      badge.className = "network-badge";
      badge.style.cssText = "margin-left:8px;font-size:11px;color:#ffd454;background:rgba(255,218,26,0.06);padding:4px 6px;border-radius:8px;";
      badge.textContent = "BEP-20";
      sarRow.querySelector(".token-info").appendChild(badge);
    }
  }
}

/* --------------------------------------------------------
   KEYSTORE LIST (left panel)
   -------------------------------------------------------- */
function renderKeystoreList(){
  const box = $("#walletList");
  if(!box) return;
  box.innerHTML = "";
  const arr = loadKeystores();
  if(arr.length === 0){
    box.innerHTML = `<div class="small-muted">No wallets saved</div>`;
    return;
  }
  arr.forEach((it, idx) => {
    const row = document.createElement("div");
    row.style.marginBottom = "12px";
    row.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between;">
        <div>
          <div style="font-weight:700">${escapeHtml(it.name)}</div>
          <div class="small-muted">${it.address.slice(0,6)}…${it.address.slice(-6)}</div>
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          <button class="btn outline" data-idx="${idx}" data-action="load">Load</button>
          <button class="btn" data-idx="${idx}" data-action="del">Delete</button>
        </div>
      </div>
    `;
    box.appendChild(row);
  });

  // events
  box.querySelectorAll("button").forEach(b=>{
    b.addEventListener("click", async (ev)=>{
      const idx = Number(b.dataset.idx);
      const action = b.dataset.action;
      const arr = loadKeystores();
      if(action === "load"){
        // open unlock modal (reuse existing modal if present)
        openUnlock(idx);
      } else if(action === "del"){
        if(!confirm("Delete this wallet?")) return;
        arr.splice(idx,1);
        saveKeystores(arr);
        renderKeystoreList();
        showToast("Deleted");
      }
    });
  });
}

/* --------------------------------------------------------
   UNLOCK (reuses any existing unlock UI if present)
   If unlocking UI not present, create a simple prompt modal
   -------------------------------------------------------- */
function openUnlock(idx){
  // If page has modalBackdrop/unlock inputs (older code), use them
  const modalBackdrop = $("#modalBackdrop");
  const unlockInput = $("#unlockPasswordInput");
  if(modalBackdrop && unlockInput){
    modalBackdrop.style.display = "flex";
    unlockInput.dataset.index = idx;
    unlockInput.value = "";
    return;
  }

  // otherwise fallback to prompt (not ideal)
  const arr = loadKeystores();
  const pwd = prompt("Keystore password:");
  if(!pwd) return showToast("Cancelled");
  try{
    const it = arr[idx];
    ethers.Wallet.fromEncryptedJson(it.keystore, pwd).then(w=>{
      activeWallet = w.connect(provider);
      onWalletLoadedFromUnlock(w);
    }).catch(e=>{
      showToast("Wrong password");
    });
  }catch(e){
    showToast("Unlock failed");
  }
}

/* callback after wallet unlocked or created */
function onWalletLoadedFromUnlock(w){
  $("#walletAddress").textContent = w.address;
  $("#walletShortAddr").textContent = w.address.slice(0,6) + "…" + w.address.slice(-6);
  $("#qrcode").innerHTML = "";
  try{ new QRCode("qrcode", w.address); }catch(e){}
  activeWallet = w.connect(provider);
  showToast("Wallet loaded");
  refreshBalances();
}

/* --------------------------------------------------------
   CREATE / CANCEL / MNEMONIC FLOW
   (keeps your existing UI behavior)
   -------------------------------------------------------- */
$("#createWalletBtn")?.addEventListener("click", ()=>{
  const w = ethers.Wallet.createRandom();
  activeWallet = w.connect(provider);

  $("#mnemonicBox").style.display = "block";
  $("#cancelCreateBtn").style.display = "block";
  $("#mnemonicDisplay").value = w.mnemonic.phrase;
  $("#showMnemonicBtn").style.display = "inline-block";

  $("#walletAddress").textContent = w.address;
  $("#walletShortAddr").textContent = w.address.slice(0,6) + "…" + w.address.slice(-6);
  $("#qrcode").innerHTML = "";
  try{ new QRCode("qrcode", w.address); }catch(e){}
});

$("#cancelCreateBtn")?.addEventListener("click", ()=>{
  $("#mnemonicBox").style.display = "none";
  $("#cancelCreateBtn").style.display = "none";
  activeWallet = null;
  mnemonicConfirmed = false;
  showToast("Creation cancelled");
});

$("#showMnemonicBtn")?.addEventListener("click", ()=>{
  $("#mnemonicDisplay").style.display = "block";
  $("#copyMnemonicBtn").style.display = "inline-block";
  $("#mnemonicOkBtn").style.display = "inline-block";
  $("#showMnemonicBtn").style.display = "none";
});

$("#copyMnemonicBtn")?.addEventListener("click", ()=> {
  navigator.clipboard.writeText($("#mnemonicDisplay").value);
  showToast("Copied");
});

$("#mnemonicOkBtn")?.addEventListener("click", ()=> {
  mnemonicConfirmed = true;
  $("#phraseSection").style.display = "none";
  $("#saveKeystoreBtn").disabled = false;
  $("#saveHint").style.display = "block";
  showToast("Confirmed. Now save keystore.");
});

/* Save keystore */
$("#saveKeystoreBtn")?.addEventListener("click", async ()=>{
  if(!activeWallet) return showToast("No wallet");
  if(!mnemonicConfirmed) return showToast("Confirm mnemonic first");
  const pwd = $("#saveKeystorePwd").value;
  if(!pwd || pwd.length < 8) return showToast("Password ≥ 8 chars");
  const arr = loadKeystores();
  if(arr.some(x=>x.address.toLowerCase() === activeWallet.address.toLowerCase())){
    showToast("Already saved");
    return;
  }
  try{
    $("#savingOverlay").style.display = "flex";
    const enc = await activeWallet.encrypt(pwd);
    arr.push({
      id: Date.now(),
      name: $("#walletNameInput").value || ("Wallet "+(arr.length+1)),
      address: activeWallet.address,
      keystore: enc
    });
    saveKeystores(arr);
    showToast("Saved");
    setTimeout(()=> { $("#savingOverlay").style.display = "none"; location.reload(); }, 700);
  }catch(e){
    $("#savingOverlay").style.display = "none";
    showToast("Encrypt failed");
  }
});

/* IMPORT modal events */
$("#openImportBtn")?.addEventListener("click", ()=> {
  $("#importModal").style.display = "flex";
});
$("#impCancelBtn")?.addEventListener("click", ()=> { $("#importModal").style.display = "none"; });

$("#impMnemonicBtn")?.addEventListener("click", async ()=>{
  const m = $("#impMnemonic").value.trim();
  if(!m || m.split(" ").length < 12) return showToast("Invalid seed");
  const pwd = $("#impMnemonicPwd").value;
  if(!pwd || pwd.length < 8) return showToast("Password ≥ 8 chars");
  try{
    const w = ethers.Wallet.fromMnemonic(m);
    const arr = loadKeystores();
    if(arr.some(x=>x.address.toLowerCase()===w.address.toLowerCase())) return showToast("Already saved");
    const enc = await w.encrypt(pwd);
    arr.push({ id:Date.now(), name: $("#impMnemonicName").value || ("Imported "+Date.now()), address: w.address, keystore: enc });
    saveKeystores(arr);
    showToast("Imported");
    setTimeout(()=> location.reload(), 500);
  }catch(e){ showToast("Import failed"); }
});

$("#impJsonBtn")?.addEventListener("click", ()=> {
  const json = $("#impJson").value.trim();
  if(!json) return showToast("Paste JSON");
  try{
    const p = JSON.parse(json);
    const addr = p.address.startsWith("0x") ? p.address : ("0x"+p.address);
    const arr = loadKeystores();
    if(arr.some(x=>x.address.toLowerCase()===addr.toLowerCase())) return showToast("Already saved");
    arr.push({ id:Date.now(), name: $("#impJsonName").value || ("Imported "+Date.now()), address: addr, keystore: json });
    saveKeystores(arr);
    showToast("Imported");
    setTimeout(()=> location.reload(), 500);
  }catch(e){ showToast("Bad JSON"); }
});

/* Clear all */
$("#clearAllBtn")?.addEventListener("click", ()=> {
  if(!confirm("Clear all saved wallets (localStorage)?")) return;
  localStorage.removeItem(KEY_KEYSTORES);
  location.reload();
});

/* --------------------------------------------------------
   BALANCES + FIAT
   -------------------------------------------------------- */
async function refreshBalances(){
  if(!activeWallet){
    $("#bnbBalance").textContent = "0";
    $("#sarBalance").textContent = "0";
    updateFiatValues();
    return;
  }
  try{
    const b = await provider.getBalance(activeWallet.address);
    $("#bnbBalance").textContent = parseFloat(ethers.utils.formatEther(b)).toFixed(6);
    const token = new ethers.Contract(SAR_CONTRACT, ERC20_ABI, provider);
    const dec = await token.decimals();
    const raw = await token.balanceOf(activeWallet.address);
    $("#sarBalance").textContent = parseFloat(ethers.utils.formatUnits(raw, dec)).toFixed(6);
  }catch(e){
    // keep values 0
    showToast("Balance update failed");
  }
  updateFiatValues();
}

/* get prices and update fiat display */
async function updateFiatValues(){
  let bnbPrice = 0;
  try{
    const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd");
    const j = await r.json();
    if(j && j.binancecoin && j.binancecoin.usd) bnbPrice = Number(j.binancecoin.usd);
  }catch(e){}
  // SAR price: not listed => 0 (you can provide a manual price override later)
  const sarPrice = 0;

  const bnbBal = parseFloat($("#bnbBalance").textContent || "0");
  const sarBal = parseFloat($("#sarBalance").textContent || "0");

  $("#bnbUSD").textContent = "$" + (bnbBal * bnbPrice).toFixed(2);
  $("#sarUSD").textContent = "$" + (sarBal * sarPrice).toFixed(2);

  const total = (bnbBal * bnbPrice) + (sarBal * sarPrice);
  $("#walletTotalUSD").textContent = "$" + (total || 0).toFixed(2);
}

/* run periodic refresh if wallet loaded */
setInterval(()=> { if(activeWallet) refreshBalances(); }, 15000);


/* --------------------------------------------------------
   SEND MODAL (full-screen Trust style)
   -------------------------------------------------------- */
function createSendModalIfNeeded(){
  if($("#sendModal")) return;
  const modal = document.createElement("div");
  modal.id = "sendModal";
  modal.style.cssText = `
    position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:4000;
    display:flex; align-items:center; justify-content:center;
  `;
  modal.innerHTML = `
    <div style="width:420px; max-width:96%; background:#0b2440; color:white; border-radius:12px; padding:18px; font-family:inherit;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div style="font-weight:700; font-size:18px;">Send</div>
        <button id="sendModalClose" class="btn">Close</button>
      </div>
      <div style="margin-top:12px;">
        <label style="font-size:12px; opacity:0.8;">Token</label>
        <select id="sendTokenSelect" style="width:100%; padding:10px; margin-top:8px;">
          <option value="BNB">BNB</option>
          <option value="SAR">SAR</option>
        </select>

        <label style="font-size:12px; opacity:0.8; margin-top:10px; display:block;">Recipient</label>
        <input id="sendRecipient" placeholder="0x..." style="width:100%; padding:10px; margin-top:6px;" />

        <label style="font-size:12px; opacity:0.8; margin-top:10px; display:block;">Amount</label>
        <input id="sendAmount" placeholder="0.0" style="width:100%; padding:10px; margin-top:6px;" />

        <div id="sendFeePreview" style="margin-top:10px; font-size:13px; opacity:0.9;">Fee estimate: -</div>

        <div style="display:flex; gap:8px; margin-top:14px;">
          <button id="sendConfirmBtn" class="btn primary" style="flex:1;">Confirm & Send</button>
          <button id="sendCancelBtn" class="btn outline" style="flex:1;">Cancel</button>
        </div>
      </div>
      <div id="sendStatus" style="margin-top:10px;font-size:13px;"></div>
    </div>
  `;
  document.body.appendChild(modal);

  $("#sendModalClose").addEventListener("click", ()=> { modal.style.display = "none"; });
  $("#sendCancelBtn").addEventListener("click", ()=> { modal.style.display = "none"; });

  // token change -> update fee estimate
  $("#sendTokenSelect").addEventListener("change", ()=> estimateFeePreview());
  $("#sendAmount").addEventListener("input", ()=> estimateFeePreview());

  $("#sendConfirmBtn").addEventListener("click", async ()=>{
    if(!activeWallet) return showToast("Load wallet first");
    const token = $("#sendTokenSelect").value;
    const to = $("#sendRecipient").value.trim();
    const amt = $("#sendAmount").value.trim();
    if(!ethers.utils.isAddress(to)) return showToast("Bad recipient");
    if(!amt || Number(amt) <= 0) return showToast("Invalid amount");

    $("#sendStatus").textContent = "Sending...";
    try{
      const signer = activeWallet.connect(provider);

      if(token === "BNB"){
        const tx = await signer.sendTransaction({ to, value: ethers.utils.parseEther(amt) });
        addHistory({ tx: tx.hash, type: "OUT", token, amount: amt, to, from: activeWallet.address, time: Date.now() });
        await tx.wait();
        showToast("BNB Sent");
      } else {
        const tokenContract = new ethers.Contract(SAR_CONTRACT, ERC20_ABI, signer);
        const dec = await tokenContract.decimals();
        const tx = await tokenContract.transfer(to, ethers.utils.parseUnits(amt, dec));
        addHistory({ tx: tx.hash, type: "OUT", token, amount: amt, to, from: activeWallet.address, time: Date.now() });
        await tx.wait();
        showToast("SAR Sent");
      }
      $("#sendStatus").textContent = "Confirmed";
      modal.style.display = "none";
      refreshBalances();
    }catch(err){
      console.error(err);
      $("#sendStatus").textContent = "Send failed: " + (err.message || err);
      showToast("Send failed");
    }
  });
}

async function estimateFeePreview(){
  const token = $("#sendTokenSelect").value;
  const amt = $("#sendAmount").value.trim();
  if(!amt || Number(amt) <= 0){
    $("#sendFeePreview").textContent = "Fee estimate: -";
    return;
  }
  // Estimate simple gas for BNB transfer or token transfer
  try{
    if(token === "BNB"){
      // value transfer ~21000 gas
      const gas = 21000;
      const gasPrice = await provider.getGasPrice();
      const ethFee = gasPrice.mul(gas);
      const feeBNB = Number(ethers.utils.formatEther(ethFee));
      $("#sendFeePreview").textContent = `Fee estimate: ${feeBNB.toFixed(6)} BNB (approx)`;
    } else {
      // token transfer gas ~ 70k-120k
      const gas = 100000;
      const gasPrice = await provider.getGasPrice();
      const ethFee = gasPrice.mul(gas);
      const feeBNB = Number(ethers.utils.formatEther(ethFee));
      $("#sendFeePreview").textContent = `Fee estimate: ${feeBNB.toFixed(6)} BNB (approx)`;
    }
  }catch(e){ $("#sendFeePreview").textContent = "Fee estimate: unavailable"; }
}

/* open send modal */
$("#openSendModalBtn")?.addEventListener("click", ()=>{
  createSendModalIfNeeded();
  $("#sendModal").style.display = "flex";
  estimateFeePreview();
});

/* --------------------------------------------------------
   RECEIVE MODAL (hybrid Sardalla)
   -------------------------------------------------------- */
function createReceiveModalIfNeeded(){
  if($("#receiveModal")) return;
  const modal = document.createElement("div");
  modal.id = "receiveModal";
  modal.style.cssText = "position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:4000; display:flex; align-items:center; justify-content:center;";

  modal.innerHTML = `
    <div style="width:360px; max-width:96%; background:linear-gradient(135deg,#05203A,#07233F); border-radius:14px; padding:20px; color:white;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div style="font-weight:700; font-size:18px;">Receive</div>
        <button id="receiveClose" class="btn">Close</button>
      </div>

      <div style="margin-top:14px; text-align:center;">
        <div id="receiveQrcode" style="margin:0 auto; width:200px; height:200px; background:#0b2b4b; padding:10px; border-radius:10px;"></div>
        <div style="margin-top:12px; font-size:12px; opacity:0.9;" id="receiveAddrShort">—</div>
        <div style="display:flex; gap:8px; justify-content:center; margin-top:10px;">
          <button id="receiveCopyBtn" class="btn outline">Copy</button>
          <button id="receiveShareBtn" class="btn">Share</button>
        </div>
        <div style="margin-top:12px; font-size:13px; opacity:0.85;">
          Send BNB for gas. Use BEP-20 compatible networks.
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  $("#receiveClose").addEventListener("click", ()=> modal.style.display = "none");
  $("#receiveCopyBtn").addEventListener("click", ()=> {
    if(!activeWallet) return showToast("Load wallet");
    navigator.clipboard.writeText(activeWallet.address);
    showToast("Address copied");
  });
  $("#receiveShareBtn").addEventListener("click", ()=> {
    if(!activeWallet) return showToast("Load wallet");
    const address = activeWallet.address;
    if(navigator.share){
      navigator.share({ title: "Sardalla address", text: address });
    } else {
      navigator.clipboard.writeText(address);
      showToast("Address copied for sharing");
    }
  });
}

$("#openReceiveModalBtn")?.addEventListener("click", ()=> {
  if(!activeWallet) return showToast("Load wallet first");
  createReceiveModalIfNeeded();
  $("#receiveModal").style.display = "flex";
  $("#receiveAddrShort").textContent = activeWallet.address.slice(0,8) + "…" + activeWallet.address.slice(-6);
  $("#receiveQrcode").innerHTML = "";
  try{ new QRCode("receiveQrcode", activeWallet.address); }catch(e){ console.warn(e); }
});

/* --------------------------------------------------------
   HISTORY (Trust-style list)
   -------------------------------------------------------- */
function renderHistoryModal(){
  // create if not exists
  if(!$("#historyModal")){
    const modal = document.createElement("div");
    modal.id = "historyModal";
    modal.style.cssText = "position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:4100; display:flex; align-items:center; justify-content:center;";
    modal.innerHTML = `
      <div style="width:640px; max-width:96%; max-height:80vh; overflow:auto; background:#071b33; border-radius:12px; padding:16px; color:white;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="font-weight:700; font-size:18px;">Transactions</div>
          <button id="historyClose" class="btn">Close</button>
        </div>
        <div id="historyList" style="margin-top:12px;"></div>
      </div>
    `;
    document.body.appendChild(modal);
    $("#historyClose").addEventListener("click", ()=> modal.style.display = "none");
  }
  const modal = $("#historyModal");
  const list = $("#historyList");
  const items = loadHistory();
  list.innerHTML = "";
  if(items.length === 0){
    list.innerHTML = `<div class="small-muted">No transactions yet</div>`;
  } else {
    items.forEach(it=>{
      const row = document.createElement("div");
      row.style.cssText = "display:flex; gap:12px; align-items:center; padding:10px 8px; border-bottom:1px solid rgba(255,255,255,0.04);";
      row.innerHTML = `
        <div style="width:46px; height:46px; border-radius:8px; background:rgba(255,255,255,0.03); display:flex; align-items:center; justify-content:center; font-weight:700;">
          ${escapeHtml((it.token||"").slice(0,2))}
        </div>
        <div style="flex:1;">
          <div style="display:flex; justify-content:space-between;">
            <div style="font-weight:700;">${escapeHtml(it.type === "OUT" ? "Sent" : "Received")} ${escapeHtml(it.token || "")}</div>
            <div class="small-muted">${new Date(it.time).toLocaleString()}</div>
          </div>
          <div style="display:flex; justify-content:space-between; margin-top:6px;">
            <div>${it.amount} ${it.token}</div>
            <div><a href="https://bscscan.com/tx/${it.tx}" target="_blank" style="color:#ffd454;">View on BscScan</a></div>
          </div>
        </div>
      `;
      list.appendChild(row);
    });
  }
  modal.style.display = "flex";
}

/* open history via button */
$("#viewHistoryBtn")?.addEventListener("click", ()=> {
  renderHistoryModal();
});

/* --------------------------------------------------------
   COPY ADDRESS (button on card)
   -------------------------------------------------------- */
$("#copyAddrBtn")?.addEventListener("click", ()=> {
  if(!activeWallet) return showToast("Load wallet first");
  navigator.clipboard.writeText(activeWallet.address);
  showToast("Address copied");
});

/* --------------------------------------------------------
   UTILS
   -------------------------------------------------------- */
function escapeHtml(s){
  if(!s) return "";
  return String(s).replace(/[&<>"']/g, (m)=> ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
}

/* Expose refresh function for console/testing */
window.sardallaRefresh = refreshBalances;




