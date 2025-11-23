/* Sardalla Wallet - wallet.js (Version A)
   Integrates with wallet.html (created in canvas) and your existing site files.

   NOTE: your current site files are available locally at these paths (as uploaded):
   - /mnt/data/index.html
   - /mnt/data/styles.css
   - /mnt/data/app.js

   We'll reference the deployed SAR contract: 0x851d720513fF135007dE95bd58B28514093bEb25
   This script runs entirely client-side (autocustodia). The private key never leaves the browser
   unless the user explicitly downloads or pastes it somewhere.

   Prereqs in wallet.html:
   <script src="https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js"></script>
   <script src="wallet.js"></script>

   Security reminder (please show prominently on the page):
   - NEVER share your mnemonic or private key.
   - Prefer encrypted keystore files + strong password.
   - This wallet stores keys in memory only; refreshing the page will clear them unless you save.
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

  // State
  let provider = new ethers.providers.JsonRpcProvider(BSC_RPC, { name: 'bsc', chainId: CHAIN_ID });
  let currentWallet = null; // ethers.Wallet (connected)
  let tokenDecimals = 18;
  let tokenSymbol = 'SAR';

  // DOM helpers
  const $ = (sel) => document.querySelector(sel);
  const setText = (sel, txt) => { const el = $(sel); if(el) el.textContent = txt; };

  // Ensure a status box exists (create if not)
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

  // Utility: download file
  function downloadFile(content, filename){
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
  }

  // Display wallet info in UI
  function renderWallet(){
    const addr = currentWallet ? currentWallet.address : '';
    setText('#walletAddress', addr || '-');
    const m = currentWallet && currentWallet.mnemonic ? currentWallet.mnemonic.phrase : '';
    const mta = document.getElementById('mnemonic');
    if(mta) mta.value = m || '';
  }

  // Create new wallet
  $('#createWalletBtn').addEventListener('click', async ()=>{
    try{
      const w = ethers.Wallet.createRandom();
      // store wallet in memory only; connect to provider for read/send
      currentWallet = w.connect(provider);
      setStatus('Wallet created in-memory. Save the mnemonic securely.');
      renderWallet();
      await refreshBalances();
    }catch(e){ console.error(e); setStatus('Failed to create wallet: '+e.message, true); }
  });

  // Encrypt and download keystore
  document.getElementById('downloadKeystore').addEventListener('click', async ()=>{
    try{
      if(!currentWallet) return setStatus('Create or import a wallet first', true);
      const pwd = document.getElementById('pwdEnc').value;
      if(!pwd || pwd.length < 8) return setStatus('Use a strong password (≥8 chars)', true);
      setStatus('Encrypting keystore (this can take a few seconds)...');
      const encrypted = await currentWallet.encrypt(pwd);
      const filename = `sardalla_keystore_${currentWallet.address}.json`;
      downloadFile(encrypted, filename);
      setStatus('Keystore encrypted and downloaded. Keep it safe offline.');
    }catch(e){ console.error(e); setStatus('Encryption failed: '+(e.message||e), true); }
  });

  // Import from keystore JSON
  document.getElementById('importKeystore').addEventListener('click', async ()=>{
    try{
      const json = document.getElementById('importJson').value.trim();
      const pwd = document.getElementById('importPwd').value;
      if(!json || !pwd) return setStatus('Provide keystore JSON and password', true);
      setStatus('Decrypting keystore...');
      const w = await ethers.Wallet.fromEncryptedJson(json, pwd);
      currentWallet = w.connect(provider);
      setStatus('Wallet imported from keystore (in-memory).');
      renderWallet();
      await refreshBalances();
    }catch(e){ console.error(e); setStatus('Import failed: '+(e.message||e), true); }
  });

  // Import from private key
  document.getElementById('importPkBtn').addEventListener('click', ()=>{
    try{
      const pk = document.getElementById('importPk').value.trim();
      if(!pk) return setStatus('Enter a private key', true);
      // Accept with or without 0x
      const normalized = pk.startsWith('0x') ? pk : ('0x'+pk);
      try{
        const w = new ethers.Wallet(normalized, provider);
        currentWallet = w; // already connected to provider
        setStatus('Wallet imported from private key (in-memory).');
        renderWallet();
        refreshBalances();
      }catch(err){ throw new Error('Invalid private key'); }
    }catch(e){ console.error(e); setStatus('Import failed: '+(e.message||e), true); }
  });

  // Refresh balances (BNB + SAR)
  async function refreshBalances(){
    try{
      if(!currentWallet) return;
      const addr = currentWallet.address;
      setText('#walletAddress', addr);

      const bnb = await provider.getBalance(addr);
      setText('#bnbBalance', ethers.utils.formatEther(bnb));

      // read token decimals and symbol once
      const tokenContract = new ethers.Contract(SAR_CONTRACT, ERC20_ABI, provider);
      try{
        tokenDecimals = await tokenContract.decimals();
        tokenSymbol = await tokenContract.symbol();
      }catch(e){ console.warn('Could not read token metadata', e); }

      const raw = await tokenContract.balanceOf(addr);
      const formatted = ethers.utils.formatUnits(raw, tokenDecimals);
      setText('#sarBalance', formatted + ' ' + tokenSymbol);

      setStatus('Balances refreshed.');
    }catch(e){ console.error(e); setStatus('Failed to refresh balances: '+(e.message||e), true); }
  }

  // Periodically refresh balances if wallet present
  setInterval(()=>{ if(currentWallet) refreshBalances(); }, 15000);

  // Send SAR
  document.getElementById('sendSarBtn').addEventListener('click', async ()=>{
    try{
      if(!currentWallet) return setStatus('Load a wallet first', true);
      const to = document.getElementById('sendTo').value.trim();
      const amt = document.getElementById('sendAmt').value.trim();
      if(!ethers.utils.isAddress(to)) return setStatus('Invalid recipient address', true);
      if(!amt || Number(amt) <= 0) return setStatus('Invalid amount', true);

      setStatus('Preparing transaction...');
      const signer = currentWallet.connect(provider);
      const tokenWithSigner = new ethers.Contract(SAR_CONTRACT, ERC20_ABI, signer);
      const amount = ethers.utils.parseUnits(amt, tokenDecimals);
      const tx = await tokenWithSigner.transfer(to, amount);
      setStatus('Transaction sent: '+tx.hash + ' — waiting confirmation...');
      await tx.wait();
      setStatus('Transaction confirmed: '+tx.hash);
      await refreshBalances();
    }catch(e){ console.error(e); setStatus('Send failed: '+(e.message||e), true); }
  });

  // If the page includes a pre-filled mnemonic textarea (user pasted a mnemonic), allow creating wallet from it
  const mnemonicE                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             