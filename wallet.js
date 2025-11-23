(() => {

  // CONFIG
  const SAR = "0x851d720513fF135007dE95bd58B28514093bEb25";
  const RPC = "https://bsc-dataseed.binance.org/";
  const ABI = [
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function balanceOf(address) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)"
  ];

  let provider = new ethers.providers.JsonRpcProvider(RPC);
  let wallet = null;
  let decimals = 18;

  // Helpers
  const $ = (s) => document.querySelector(s);
  const setStatus = (msg, bad=false) => {
    const box = $("#walletStatus");
    box.textContent = msg;
    box.classList.toggle("warn", bad);
    box.classList.toggle("ok", !bad);
  };

  // Create Wallet
  $("#createWalletBtn").onclick = async () => {
    try {
      wallet = ethers.Wallet.createRandom().connect(provider);
      setStatus("Wallet created. Save the recovery phrase!");

      // Show mnemonic block
      $("#mnemonicBox").style.display = "block";
      $("#mnemonicDisplay").value = wallet.mnemonic.phrase;

      // Hide phrase initially
      $("#mnemonicDisplay").style.display = "none";
      $("#copyMnemonicBtn").style.display = "none";
      $("#mnemonicOkBtn").style.display = "none";
      $("#showMnemonicBtn").style.display = "inline-block";

      // Address
      $("#walletAddress").textContent = wallet.address;

      // QR
      $("#qrBlock").style.display = "block";
      new QRCode(document.getElementById("qrcode"), wallet.address);

      refreshBalances();

    } catch (e) {
      console.error(e);
      setStatus("Error creating wallet", true);
    }
  };

  // Show mnemonic
  $("#showMnemonicBtn").onclick = () => {
    $("#mnemonicDisplay").style.display = "block";
    $("#copyMnemonicBtn").style.display = "inline-block";
    $("#mnemonicOkBtn").style.display = "inline-block";
    $("#showMnemonicBtn").style.display = "none";
  };

  // Copy mnemonic
  $("#copyMnemonicBtn").onclick = () => {
    navigator.clipboard.writeText($("#mnemonicDisplay").value);
    setStatus("Recovery phrase copied. Keep it safe!");
  };

  // Confirm mnemonic saved
  $("#mnemonicOkBtn").onclick = () => {
    $("#mnemonicBox").style.display = "none";
    setStatus("Mnemonic confirmed. Wallet ready.");
  };

  // Download keystore
  $("#downloadKeystore").onclick = async () => {
    if (!wallet) return setStatus("Create or import first", true);

    const pwd = $("#pwdEnc").value;
    if (pwd.length < 8) return setStatus("Password too short", true);

    setStatus("Encrypting keystore...");
    const json = await wallet.encrypt(pwd);

    const blob = new Blob([json], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sardalla_keystore_${wallet.address}.json`;
    a.click();

    setStatus("Keystore downloaded.");
  };

  // Import keystore
  $("#importKeystore").onclick = async () => {
    try {
      const json = $("#importJson").value;
      const pwd = $("#importPwd").value;
      const w = await ethers.Wallet.fromEncryptedJson(json, pwd);
      wallet = w.connect(provider);
      $("#walletAddress").textContent = wallet.address;
      setStatus("Wallet imported.");
      refreshBalances();
    } catch (e) {
      setStatus("Import failed", true);
    }
  };

  // Import private key
  $("#importPkBtn").onclick = () => {
    try {
      const pk = $("#importPk").value.trim();
      wallet = new ethers.Wallet(pk, provider);
      $("#walletAddress").textContent = wallet.address;
      setStatus("Private key imported.");
      refreshBalances();
    } catch {
      setStatus("Invalid private key", true);
    }
  };

  // Refresh balances
  async function refreshBalances() {
    if (!wallet) return;

    try {
      const bnb = await provider.getBalance(wallet.address);
      $("#bnbBalance").textContent = ethers.utils.formatEther(bnb);

      const c = new ethers.Contract(SAR, ABI, provider);
      decimals = await c.decimals();
      const balSAR = await c.balanceOf(wallet.address);
      $("#sarBalance").textContent = ethers.utils.formatUnits(balSAR, decimals);

      setStatus("Balances updated.");
    } catch (e) {
      setStatus("Error fetching balances", true);
    }
  }

  // Send SAR
  $("#sendSarBtn").onclick = async () => {
    if (!wallet) return setStatus("Load wallet first", true);

    try {
      const to = $("#sendTo").value;
      const amt = $("#sendAmt").value;
      const c = new ethers.Contract(SAR, ABI, wallet);
      const tx = await c.transfer(to, ethers.utils.parseUnits(amt, decimals));

      setStatus("Transaction sent: " + tx.hash);
      await tx.wait();
      setStatus("Transaction confirmed.");
      refreshBalances();

    } catch (e) {
      console.error(e);
      setStatus("Send failed", true);
    }
  };

})();
