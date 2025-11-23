/* Sardalla multi-wallet (mnemonic stored in localStorage) */
/* WARNING: storing mnemonics in localStorage is insecure. Users should export and store them offline. */

(() => {
  const SAR = "0x851d720513fF135007dE95bd58B28514093bEb25";
  const RPC = "https://bsc-dataseed.binance.org/";
  const ABI = [
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function balanceOf(address) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)"
  ];
  const STORAGE_KEY = "sardalla_wallets_v1"; // localStorage key

  let provider = new ethers.providers.JsonRpcProvider(RPC);
  let activeWallet = null; // ethers.Wallet connected
  let tokenDecimals = 18;

  // Helpers
  const $ = (s) => document.querySelector(s);
  const setStatus = (msg, bad=false) => {
    const box = $("#walletStatus");
    box.textContent = msg;
    box.classList.toggle("warn", bad);
    box.classList.toggle("ok", !bad);
  };

  // LocalStorage helpers
  function loadStoredWallets() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch (e) {
      console.warn("Failed to parse wallets", e);
      return [];
    }
  }
  function saveStoredWallets(arr) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  }

  // Render wallet list UI
  function renderWalletList() {
    const list = loadStoredWallets();
    const el = $("#walletList");
    el.innerHTML = "";
    if (list.length === 0) {
      el.innerHTML = "<div class='muted'>No wallets saved yet.</div>";
      return;
    }
    list.forEach((w, idx) => {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.justifyContent = "space-between";
      row.style.marginBottom = "8px";

      const info = document.createElement("div");
      info.style.flex = "1";
      info.innerHTML = `<div style="font-weight:700">${escapeHtml(w.name || `Wallet ${idx+1}`)}</div>
                        <div class="muted" style="font-size:12px">${truncate(w.address)}</div>`;

      const actions = document.createElement("div");
      actions.style.display = "flex";
      actions.style.gap = "6px";

      const loadBtn = document.createElement("button");
      loadBtn.className = "btn outline";
      loadBtn.textContent = "Load";
      loadBtn.onclick = () => loadWalletFromStorage(idx);

      const exportBtn = document.createElement("button");
      exportBtn.className = "btn secondary";
      exportBtn.textContent = "Export";
      exportBtn.onclick = () => exportMnemonic(idx);

      const delBtn = document.createElement("button");
      delBtn.className = "btn";
      delBtn.textContent = "Delete";
      delBtn.onclick = () => {
        if (!confirm("Delete this wallet from this browser? This action cannot be undone.")) return;
        deleteWallet(idx);
      };

      actions.appendChild(loadBtn);
      actions.appendChild(exportBtn);
      actions.appendChild(delBtn);

      row.appendChild(info);
      row.appendChild(actions);
      el.appendChild(row);
    });
  }

  // Utility functions
  function truncate(addr) {
    if (!addr) return "";
    return addr.slice(0,6) + "…" + addr.slice(-6);
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  // Create wallet flow
  $("#createWalletBtn").onclick = async () => {
    try {
      const w = ethers.Wallet.createRandom();
      activeWallet = w.connect(provider);
      setStatus("Wallet generated. Please save the recovery phrase NOW.");
      // show mnemonic UI
      $("#mnemonicBox").style.display = "block";
      $("#mnemonicDisplay").value = w.mnemonic.phrase;
      $("#mnemonicDisplay").style.display = "none";
      $("#copyMnemonicBtn").style.display = "none";
      $("#mnemonicOkBtn").style.display = "none";
      $("#showMnemonicBtn").style.display = "inline-block";
      // show address and QR
      $("#walletAddress").textContent = activeWallet.address;
      $("#qrBlock").style.display = "block";
      // render QR (replace previous)
      const qnode = document.getElementById("qrcode");
      qnode.innerHTML = "";
      new QRCode(qnode, activeWallet.address);
      // refresh balances (initial)
      await refreshBalances();
    } catch (e) {
      console.error(e);
      setStatus("Error creating wallet", true);
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
    setStatus("Mnemonic copied to clipboard. Keep it safe.");
  };
  $("#mnemonicOkBtn").onclick = () => {
    $("#mnemonicBox").style.display = "none";
    setStatus("Mnemonic confirmed. You can save it to the wallet list or download it.");
  };

  // Save mnemonic to localStorage (user chose B: plaintext mnemonic)
  $("#saveMnemonicBtn").onclick = () => {
    if (!activeWallet || !activeWallet.mnemonic) return setStatus("No wallet to save", true);
    const name = $("#walletNameInput").value.trim() || `Wallet ${Date.now()}`;
    const entry = {
      id: Date.now(),
      name,
      mnemonic: activeWallet.mnemonic.phrase,
      address: activeWallet.address,
      createdAt: new Date().toISOString()
    };
    const arr = loadStoredWallets();
    arr.push(entry);
    saveStoredWallets(arr);
    renderWalletList();
    setStatus("Wallet saved locally (mnemonic stored in browser).");
  };

  // Download mnemonic as .txt
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
  };

  // Import mnemonic pasted by user
  $("#importMnemonicBtn").onclick = () => {
    try {
      const m = $("#importMnemonic").value.trim();
      if (!m || m.split(" ").length < 12) return setStatus("Invalid mnemonic", true);
      const w = ethers.Wallet.fromMnemonic(m).connect(provider);
      // Save to storage immediately (because user chose B)
      const name = $("#importName").value.trim() || `Imported ${Date.now()}`;
      const entry = {
        id: Date.now(),
        name,
        mnemonic: m,
        address: w.address,
        createdAt: new Date().toISOString()
      };
      const arr = loadStoredWallets();
      arr.push(entry);
      saveStoredWallets(arr);
      renderWalletList();
      setStatus("Mnemonic imported and saved locally.");
    } catch (e) {
      console.error(e);
      setStatus("Failed to import mnemonic", true);
    }
  };

  // load wallet from stored list index
  async function loadWalletFromStorage(idx) {
    const arr = loadStoredWallets();
    const item = arr[idx];
    if (!item) return setStatus("Wallet not found", true);
    try {
      const w = ethers.Wallet.fromMnemonic(item.mnemonic).connect(provider);
      activeWallet = w;
      $("#walletAddress").textContent = w.address;
      // show QR
      $("#qrBlock").style.display = "block";
      const qnode = document.getElementById("qrcode");
      qnode.innerHTML = "";
      new QRCode(qnode, w.address);
      // set mnemonic in display (hidden by default)
      $("#mnemonicDisplay").value = item.mnemonic;
      $("#mnemonicDisplay").style.display = "none";
      $("#copyMnemonicBtn").style.display = "none";
      $("#mnemonicOkBtn").style.display = "none";
      $("#showMnemonicBtn").style.display = "inline-block";
      setStatus(`Wallet loaded: ${item.name}`);
      await refreshBalances();
    } catch (e) {
      console.error(e);
      setStatus("Failed to load wallet", true);
    }
  }

  // Export mnemonic (copy to clipboard and also show prompt)
  function exportMnemonic(idx) {
    const arr = loadStoredWallets();
    const item = arr[idx];
    if (!item) return setStatus("Wallet not found", true);
    navigator.clipboard.writeText(item.mnemonic);
    setStatus("Mnemonic copied to clipboard. Consider downloading or exporting securely.");
  }

  // Delete wallet from storage
  function deleteWallet(idx) {
    const arr = loadStoredWallets();
    if (!arr[idx]) return;
    arr.splice(idx,1);
    saveStoredWallets(arr);
    renderWalletList();
    setStatus("Wallet deleted from this browser.");
  }

  // Clear all wallets (dangerous)
  $("#clearAllBtn").onclick = () => {
    if (!confirm("Delete ALL saved wallets from this browser? This cannot be undone.")) return;
    localStorage.removeItem(STORAGE_KEY);
    renderWalletList();
    setStatus("All wallets cleared.");
  };

  // Import keystore JSON (optional)
  $("#importKeystore").onclick = async () => {
    try {
      const json = $("#importJson").value.trim();
      const pwd = $("#importPwd").value;
      if (!json || !pwd) return setStatus("Provide keystore JSON and password", true);
      const w = await ethers.Wallet.fromEncryptedJson(json, pwd);
      activeWallet = w.connect(provider);
      $("#walletAddress").textContent = activeWallet.address;
      setStatus("Keystore imported (loaded in memory).");
      // don't auto-save keystore here because user wanted option B (mnemonic), but we could store the mnemonic if we had it.
      await refreshBalances();
    } catch (e) {
      console.error(e);
      setStatus("Failed to import keystore", true);
    }
  };

  // Import private key
  $("#importPkBtn").onclick = () => {
    try {
      const pk = $("#importPk").value.trim();
      if (!pk) return setStatus("Enter private key", true);
      const w = new ethers.Wallet(pk, provider);
      activeWallet = w;
      $("#walletAddress").textContent = w.address;
      setStatus("Private key imported (loaded).");
      refreshBalances();
    } catch (e) {
      console.error(e);
      setStatus("Invalid private key", true);
    }
  };

  // Refresh balances
  async function refreshBalances() {
    if (!activeWallet) return;
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

  // Send SAR (uses activeWallet as signer)
  $("#sendSarBtn").onclick = async () => {
    if (!activeWallet) return setStatus("Load a wallet first", true);
    try {
      const to = $("#sendTo").value.trim();
      const amt = $("#sendAmt").value.trim();
      if (!ethers.utils.isAddress(to)) return setStatus("Invalid recipient", true);
      if (!amt || Number(amt) <= 0) return setStatus("Invalid amount", true);

      const signer = activeWallet.connect(provider);
      const token = new ethers.Contract(SAR, ABI, signer);
      const tx = await token.transfer(to, ethers.utils.parseUnits(amt, tokenDecimals));
      setStatus("Transaction sent: " + tx.hash);
      await tx.wait();
      setStatus("Transaction confirmed.");
      refreshBalances();
    } catch (e) {
      console.error(e);
      setStatus("Send failed", true);
    }
  };

  // On load
  renderWalletList();
  setStatus("Ready — create or import wallets. (mnemonics stored locally)");

})();
