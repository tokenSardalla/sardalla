/* Sardalla Wallet - wallet.js (Version A)
   Integrates with wallet.html and your existing site.
*/

(() => {
  // CONFIG
  const SAR_CONTRACT = '0x851d720513fF135007dE95bd58B28514093bEb25';
  const BSC_RPC = 'https://bsc-dataseed.binance.org/';
  const CHAIN_ID = 56;
  const ERC20_ABI = [
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
    'function balanceOf(address) view returns (uint256)',
    'function transfer(address to, uint256 amount) returns (bool)'
  ];

  let provider = new ethers.providers.JsonRpcProvider(BSC_RPC, { name: 'bsc', chainId: CHAIN_ID });
  let currentWallet = null;
  let tokenDecimals = 18;
  let tokenSymbol = 'SAR';

  const $ = (sel) => document.querySelector(sel);
  const setText = (sel, txt) => { const el = $(sel); if(el) el.textContent = txt; };

  function ensureStatusBox(){
    let s = document.getElementById('walletStatus');
    if(!s){
      s = document.createElement('div');
      s.id = 'walletStatus';
      s.style.marginTop = '12px';
      s.style.fontFamily = 'monospace';
      s.style.fontSize = '13px';
      const container = document.querySelector('.wrap') || document.body;
      container.insertBefore(s, container.firstChild);
    }
    return s;
  }
  const statusEl = ensureStatusBox();
  function setStatus(msg, isError){ statusEl.textContent = msg; statusEl.style.color = isError ? '#ffcccc' : '#ddffcc'; }

  function downloadFile(content, filename){
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
  }

  function renderWallet(){
    const addr = currentWallet ? currentWallet.address : '';
    setText('#walletAddress', addr || '-');
  }

  // ---------------- MNEMONIC UX ------------------
  const mnemonicBox = document.getElementById("mnemonicBox");
  const mnemonicDisplay = document.getElementById("mnemonicDisplay");
  const showMnemonicBtn = document.getElementById("showMnemonicBtn");
  const copyMnemonicBtn = document.getElementById("copyMnemonicBtn");
  const mnemonicOkBtn = document.getElementById("mnemonicOkBtn");

  function showMnemonicUI(phrase) {
    mnemonicDisplay.value = phrase;
    mnemonicBox.style.display = "block";
    showMnemonicBtn.style.display = "inline-block";
    copyMnemonicBtn.style.display = "none";
    mnemonicOkBtn.style.display = "none";
  }

  showMnemonicBtn.addEventListener("click", () => {
    mnemonicDisplay.style.display = "block";
    copyMnemonicBtn.style.display = "inline-block";
    mnemonicOkBtn.style.display = "inline-block";
    showMnemonicBtn.style.display = "none";
  });

  copyMnemonicBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(mnemonicDisplay.value);
    setStatus("Mnemonic copied. Store it safely!");
  });

  mnemonicOkBtn.addEventListener("click", () => {
    mnemonicBox.style.display = "none";
    setStatus("Mnemonic confirmed. You can now use your wallet.");
  });
  // ------------------------------------------------

  $('#createWalletBtn').addEventListener('click', async ()=>{
    try{
      const w = ethers.Wallet.createRandom();
      currentWallet = w.connect(provider);
      setStatus('Wallet created. Save your mnemonic!');
      renderWallet();
      showMnemonicUI(w.mnemonic.phrase);
      await refreshBalances();
    }catch(e){ console.error(e); setStatus('Failed to create wallet: '+e.message, true); }
  });

  document.getElementById('downloadKeystore').addEventListener('click', async ()=>{
    try{
      if(!currentWallet) return setStatus('Create or import a wallet first', true);
      const pwd = document.getElementById('pwdEnc').value;
      if(!pwd || pwd.length < 8) return setStatus('Use a strong password (≥8 chars)', true);
      setStatus('Encrypting keystore...');
      const encrypted = await currentWallet.encrypt(pwd);
      const filename = `sardalla_keystore_${currentWallet.address}.json`;
      downloadFile(encrypted, filename);
      setStatus('Keystore downloaded.');
    }catch(e){ console.error(e); setStatus('Encryption failed: '+(e.message||e), true); }
  });

  document.getElementById('importKeystore').addEventListener('click', async ()=>{
    try{
      const json = document.getElementById('importJson').value.trim();
      const pwd = document.getElementById('importPwd').value;
      if(!json || !pwd) return setStatus('Provide keystore JSON and password', true);
      setStatus('Decrypting keystore...');
      const w = await ethers.Wallet.fromEncryptedJson(json, pwd);
      currentWallet = w.connect(provider);
      setStatus('Wallet imported.');
      renderWallet();
      refreshBalances();
    }catch(e){ console.error(e); setStatus('Import failed: '+(e.message||e), true); }
  });

  document.getElementById('importPkBtn').addEventListener('click', ()=>{
    try{
      const pk = document.getElementById('importPk').value.trim();
      if(!pk) return setStatus('Enter a private key', true);
      const normalized = pk.startsWith('0x') ? pk : ('0x'+pk);
      const w = new ethers.Wallet(normalized, provider);
      currentWallet = w;
      setStatus('Wallet imported from private key.');
      renderWallet();
      refreshBalances();
    }catch(e){ console.error(e); setStatus('Invalid private key'); }
  });

  async function refreshBalances(){
    try{
      if(!currentWallet) return;
      const addr = currentWallet.address;
      setText('#bnbBalance', ethers.utils.formatEther(await provider.getBalance(addr)));

      const c = new ethers.Contract(SAR_CONTRACT, ERC20_ABI, provider);
      tokenDecimals = await c.decimals();
      tokenSymbol = await c.symbol();
      const raw = await c.balanceOf(addr);
      setText('#sarBalance', ethers.utils.formatUnits(raw, tokenDecimals));

      setStatus('Balances refreshed.');
    }catch(e){ console.error(e); setStatus('Balance update failed', true); }
  }

  setInterval(()=>{ if(currentWallet) refreshBalances(); }, 15000);

  document.getElementById('sendSarBtn').addEventListener('click', async ()=>{
    try{
      if(!currentWallet) return setStatus('Load a wallet first', true);

      const to = document.getElementById('sendTo').value.trim();
      const amt = document.getElementById('sendAmt').value.trim();
      if(!ethers.utils.isAddress(to)) return setStatus('Invalid address');
      if(!amt || Number(amt) <= 0) return setStatus('Invalid amount');

      setStatus('Sending transaction...');
      const signer = currentWallet.connect(provider);
      const con = new ethers.Contract(SAR_CONTRACT, ERC20_ABI, signer);
      const tx = await con.transfer(to, ethers.utils.parseUnits(amt, tokenDecimals));

      setStatus('Waiting confirmation: '+tx.hash);
      await tx.wait();
      setStatus('Transaction confirmed.');
      refreshBalances();

    }catch(e){ console.error(e); setStatus('Send failed: '+e.message, true); }
  });

  renderWallet();
  setStatus('Ready — create or import a wallet.');

})();
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   