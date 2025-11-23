/* Sardalla keystore-manager — improved UX (modal unlock + saved badge + fixed hide) */
/* Keystores-only storage. App never stores mnemonics in clear. */

(() => {
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
  let activeWallet = null; // ethers.Wallet connected
  let tokenDecimals = 18;
  let mnemonicConfirmed = false; // user must confirm mnemonic
  let lastSavedKeystoreId = null; // ID of last saved keystore (to detect unsaved state)
  let pendingLoadIndex = null; // index requested to unlock via modal

  // Helpers
  const $ = (s) => document.querySelector(s);
  const setStatus = (msg, bad=false) => {
    const box = $("#walletStatus");
    if (!box) return;
    box.textContent = msg;
    box.classList.toggle("warn", bad);
    box.classList.toggle("ok", !bad);
  };

  // Toast helper
  function showToast(text, time = 2500) {
    const t = $("#toast");
    if (!t) return;
    t.textContent = text;
    t.style.display = "block";
    setTimeout(()=> {
      t.style.display = "none";
    }, time);
  }

  // localStorage helpers
  function loadKeystores() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn("parse error", e);
      return [];
    }
  }
  function saveKeystores(arr) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  }

  // Utility UI helpers
  function truncate(addr) { return addr ? addr.slice(0,6) + "…" + addr.slice(-6) : ""; }
  function createButton(text, cls = "btn") { const b = document.createElement("button"); b.className = cls; b.textContent = text; return b; }
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

  // Render saved keystores list (adds Saved badge)
  function renderKeystoreList() {
    const arr = loadKeystores();
    const el = $("#walletList");
    if (!el) return;
    el.innerHTML = "";
    if (arr.length === 0) {
      el.innerHTML = "<div class='muted'>No saved wallets (keystores).</div>";
      return;
    }
    arr.forEach((item, idx) => {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.justifyContent = "space-between";
      row.style.marginBottom = "8px";

      const info = document.createElement("div");
      info.style.flex = "1";
      // add badge "Saved"
      const savedBadge = (item.id ? `<span class="badge-saved">Saved</span>` : "");
      info.innerHTML = `<div style="font-weight:700">${escapeHtml(item.name || ('Wallet ' + (idx+1)))} ${savedBadge}</div>
                        <div class="muted" style="font-size:12px">${truncate(item.address)}</div>`;

      const actions = document.createElement("div");
      actions.style.display = "flex";
      actions.style.gap = "6px";

      const loadBtn = createButton("Load", "btn outline");
      loadBtn.onclick = () => openUnlockModal(idx);

      const downloadBtn = createButton("Download", "btn secondary");
      downloadBtn.onclick = () => downloadKeystore(item);

      const delBtn = createButton("Delete", "btn");
      delBtn.onclick = () => {
        if (!confirm("Delete this stored keystore from the browser?")) return;
        const a = loadKeystores();
        a.splice(idx,1);
        saveKeystores(a);
        renderKeystoreList();
        setStatus("Keystore deleted.");
        showToast("Keystore deleted.");
      };

      actions.appendChild(loadBtn);
      actions.appendChild(downloadBtn);
      actions.appendChild(delBtn);

      row.appendChild(info);
      row.appendChild(actions);
      el.appendChild(row);
    });
  }

  // Download keystore JSON (for export)
  function downloadKeystore(item) {
    const blob = new Blob([item.keystore], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sardalla_keystore_${item.address}.json`;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
    setStatus("Keystore downloaded.");
    showToast("Keystore downloaded.");
  }

  // OPEN unlock modal for index
  function openUnlockModal(idx) {
    pendingLoadIndex = idx;
    const mb = $("#modalBackdrop");
    if (!mb) return;
    $("#unlockPasswordInput").value = "";
    mb.style.display = "flex";
    $("#unlockPasswordInput").focus();
  }

  // CLOSE unlock modal
  function closeUnlockModal() {
    pendingLoadIndex = null;
    const mb = $("#modalBackdrop");
    if (!mb) return;
    mb.style.display = "none";
  }

  // HANDLE modal confirm -> decrypt keystore
  async function handleUnlockConfirm() {
    const pwd = $("#unlockPasswordInput").value;
    if (!pwd || pwd.length < 1) return setStatus("Enter password to unlock", true);
    const idx = pendingLoadIndex;
    if (idx === null || idx === undefined) return setStatus("No wallet selected", true);
    const list = loadKeystores();
    const item = list[idx];
    if (!item) return setStatus("Keystore not found", true);
    setStatus("Decrypting keystore...");
    try {
      const w = await ethers.Wallet.fromEncryptedJson(item.keystore, pwd);
      activeWallet = w.connect(provider);
      $("#walletAddress").textContent = activeWallet.address;
      // show QR
      $("#qrBlock") && ($("#qrBlock").style.display = "block");
      const qnode = document.getElementById("qrcode");
      if (qnode) { qnode.innerHTML = ""; new QRCode(qnode, activeWallet.address); }
      lastSavedKeystoreId = item.id;
      setStatus("Wallet unlocked in memory.");
      showToast("Wallet unlocked.");
      closeUnlockModal();
      await refreshBalances();
    } catch (e) {
      console.error(e);
      setStatus("Wrong password or invalid keystore", true);
    }
  }

  // Create new wallet (in-memory) and show mnemonic (not stored)
  $("#createWalletBtn").onclick = async () => {
    try {
      const w = ethers.Wallet.createRandom();
      activeWallet = w.connect(provider);
      mnemonicConfirmed = false;
      lastSavedKeystoreId = null;
      setStatus("Wallet generated. Save the keystore to store it.");
      // show mnemonic section (keep visible)
      $("#mnemonicBox").style.display = "block";
      $("#mnemonicDisplay").value = w.mnemonic.phrase;
      $("#mnemonicDisplay").style.display = "none";
      $("#copyMnemonicBtn").style.display = "none";
      $("#mnemonicOkBtn").style.display = "none";
      $("#showMnemonicBtn").style.display = "inline-block";

      // disable save button until confirmed
      const saveBtn = $("#saveKeystoreBtn");
      saveBtn.disabled = true;
      saveBtn.classList.remove("highlight");
      $("#saveHint").style.display = "none";

      $("#walletAddress").textContent = activeWallet.address;
      // QR
      $("#qrBlock") && ($("#qrBlock").style.display = "block");
      const qnode = document.getElementById("qrcode");
      if (qnode) { qnode.innerHTML = ""; new QRCode(qnode, activeWallet.address); }
      await refreshBalances();
    } catch (e) {
      console.error(e);
      setStatus("Error generating wallet", true);
    }
  };

  // mnemonic UI
  $("#showMnemonicBtn").onclick = () => {
    $("#mnemonicDisplay").style.display = "block";
    $("#copyMnemonicBtn").style.display = "inline-block";
    $("#mnemonicOkBtn").style.display = "inline-block";
    $("#showMnemonicBtn").style.display = "none";
  };
  $("#copyMnemonicBtn").onclick = () => {
    navigator.clipboard.writeText($("#mnemonicDisplay").value);
    setStatus("Mnemonic copied to clipboard. Store it safely offline.");
  };
  $("#mnemonicOkBtn").onclick = () => {
    mnemonicConfirmed = true;
    $("#mnemonicBox").style.display = "block"; // keep visible so user can save
    $("#saveHint").style.display = "block";
    const saveBtn = $("#saveKeystoreBtn");
    saveBtn.disabled = false;
    // add visual highlight to attract user
    saveBtn.classList.add("highlight");
    setStatus("Mnemonic confirmed. Now encrypt & save the keystore (required).");
    showToast("Step 4: Encrypt & Save Keystore (required)");
  };

  // Save keystore: encrypt current activeWallet with provided password and store
  $("#saveKeystoreBtn").onclick = async () => {
    if (!activeWallet || !activeWallet.mnemonic) return setStatus("No wallet generated to save", true);
    if (!mnemonicConfirmed) return setStatus("Confirm the mnemonic first (Show Phrase → I Saved It)", true);
    const pwd = $("#saveKeystorePwd").value;
    if (!pwd || pwd.length < 8) return setStatus("Choose a password ≥ 8 characters", true);
    const name = $("#walletNameInput").value.trim() || (`Wallet ${Date.now()}`);
    setStatus("Encrypting keystore (this may take a few seconds)...");
    try {
      const encrypted = await activeWallet.encrypt(pwd);
      const entry = { id: Date.now(), name, address: activeWallet.address, keystore: encrypted, createdAt: new Date().toISOString() };
      const arr = loadKeystores();
      arr.push(entry);
      saveKeystores(arr);
      renderKeystoreList();
      setStatus("Keystore encrypted & saved locally.");
      showToast("Keystore saved ✔");
      lastSavedKeystoreId = entry.id;
      // UX cleanup
      $("#saveKeystorePwd").value = "";
      $("#walletNameInput").value = "";
      const saveBtn = $("#saveKeystoreBtn");
      saveBtn.disabled = true;
      saveBtn.classList.remove("highlight");
      $("#saveHint").style.display = "none";
      mnemonicConfirmed = false;
    } catch (e) {
      console.error(e);
      setStatus("Encryption failed", true);
    }
  };

  // Download mnemonic as .txt (user may want to save seed offline)
  $("#downloadMnemonicBtn").onclick = () => {
    if (!activeWallet || !activeWallet.mnemonic) return setStatus("No mnemonic available", true);
    const txt = activeWallet.mnemonic.phrase;
    const blob = new Blob([txt], {type: "text/plain"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sardalla_mnemonic_${activeWallet.address}.txt`;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
    setStatus("Mnemonic downloaded. Store it offline.");
    showToast("Mnemonic downloaded. Store offline.");
  };

  // Import mnemonic: convert to keystore by asking for a password, then save
  $("#importMnemonicBtn").onclick = async () => {
    try {
      const m = $("#importMnemonic").value.trim();
      if (!m || m.split(" ").length < 12) return setStatus("Invalid mnemonic", true);
      const pwd = $("#importMnemonicPwd").value;
      if (!pwd || pwd.length < 8) return setStatus("Choose a password ≥ 8 characters", true);
      const name = $("#importName").value.trim() || `Imported ${Date.now()}`;
      const w = ethers.Wallet.fromMnemonic(m);
      setStatus("Encrypting keystore from mnemonic...");
      const enc = await w.encrypt(pwd);
      const entry = { id: Date.now(), name, address: w.address, keystore: enc, createdAt: new Date().toISOString() };
      const arr = loadKeystores();
      arr.push(entry);
      saveKeystores(arr);
      renderKeystoreList();
      setStatus("Imported mnemonic converted to keystore and saved.");
      showToast("Mnemonic imported & keystore saved.");
      // clear inputs
      $("#importMnemonic").value = "";
      $("#importMnemonicPwd").value = "";
      $("#importName").value = "";
    } catch (e) {
      console.error(e);
      setStatus("Import failed", true);
    }
  };

  // Import existing keystore JSON (user pastes encrypted JSON) — saved directly, ask for a name
  $("#importKeystoreBtn").onclick = () => {
    try {
      const json = $("#importJson").value.trim();
      if (!json) return setStatus("Paste keystore JSON", true);
      let parsed;
      try { parsed = JSON.parse(json); } catch (e) { return setStatus("Invalid JSON", true); }
      const name = $("#importJsonName").value.trim() || `Imported ${Date.now()}`;
      const address = parsed.address ? (parsed.address.startsWith("0x") ? parsed.address : "0x" + parsed.address) : "";
      const entry = { id: Date.now(), name, address, keystore: json, createdAt: new Date().toISOString() };
      const arr = loadKeystores();
      arr.push(entry);
      saveKeystores(arr);
      renderKeystoreList();
      setStatus("Keystore JSON saved locally.");
      showToast("Keystore imported & saved.");
      $("#importJson").value = "";
      $("#importJsonName").value = "";
    } catch (e) {
      console.error(e);
      setStatus("Failed to import keystore", true);
    }
  };

  // Clear all stored keystores
  $("#clearAllBtn").onclick = () => {
    if (!confirm("Delete ALL stored keystores from this browser? This cannot be undone.")) return;
    localStorage.removeItem(STORAGE_KEY);
    renderKeystoreList();
    setStatus("All keystores cleared.");
    showToast("All keystores cleared.");
  };

  // Refresh balances for activeWallet
  async function refreshBalances() {
    if (!activeWallet) { $("#bnbBalance").textContent = "0"; $("#sarBalance").textContent = "0"; return; }
    try {
      const b = await provider.getBalance(activeWallet.address);
      $("#bnbBalance").textContent = ethers.utils.formatEther(b);

      const c = new ethers.Contract(SAR, ABI, provider);
      tokenDecimals = await c.decimals();
      const raw = await c.balanceOf(activeWallet.address);
      $("#sarBalance").textContent = ethers.utils.formatUnits(raw, tokenDecimals);

      setStatus("Balances updated.");
    } catch (e) {
      console.error(e);
      setStatus("Balance update failed", true);
    }
  }

  // Send SAR using activeWallet (must be unlocked by loading keystore earlier)
  $("#sendSarBtn").onclick = async () => {
    if (!activeWallet) return setStatus("Load/unlock a wallet first", true);
    try {
      const to = $("#sendTo").value.trim();
      const amt = $("#sendAmt").value.trim();
      if (!ethers.utils.isAddress(to)) return setStatus("Invalid recipient", true);
      if (!amt || Number(amt) <= 0) return setStatus("Invalid amount", true);

      const signer = activeWallet.connect(provider);
      const token = new ethers.Contract(SAR, ABI, signer);
      const tx = await token.transfer(to, ethers.utils.parseUnits(amt, tokenDecimals));
      setStatus("Transaction sent: " + tx.hash);
      showToast("Transaction sent. Waiting confirmation...");
      await tx.wait();
      setStatus("Transaction confirmed.");
      showToast("Transaction confirmed.");
      refreshBalances();
    } catch (e) {
      console.error(e);
      setStatus("Send failed", true);
    }
  };

  // Modal buttons
  $("#unlockConfirm").onclick = () => handleUnlockConfirm();
  $("#unlockCancel").onclick = () => closeUnlockModal();

  // Page unload warning: if there's an active generated wallet that hasn't been saved, warn user
  window.addEventListener("beforeunload", function (e) {
    if (activeWallet && lastSavedKeystoreId === null) {
      const msg = "You have generated a wallet and not saved its keystore. If you leave, it will be lost.";
      (e || window.event).returnValue = msg;
      return msg;
    }
    return undefined;
  });

  // On start
  renderKeystoreList();
  setStatus("Ready — keystore-only storage. Mnemonics are NOT stored in the browser.");

})();


