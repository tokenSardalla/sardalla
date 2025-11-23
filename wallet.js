// Configuración de Sardalla (SAR)
const SAR_TOKEN = {
  address: "0x851D720513Ff135007DE95BD58b28514093BEb25",
  symbol: "SAR",
  decimals: 18,
  image: "https://tokensardalla.github.io/sardalla/logo_sardalla_128px.webp",
};

const BSC_CHAIN_ID = "0x38"; // 56 en decimal

// Diccionario EN / ES para la interfaz
const I18N = {
  en: {
    title: "Sardalla Web Wallet",
    subtitle:
      "Connect your wallet to view your BNB and Sardalla (SAR) balance on BNB Smart Chain.",
    statusDisconnected: "Wallet not connected.",
    statusConnected: "Wallet connected.",
    statusWrongNet: "Wrong network. Please switch to BNB Smart Chain (BSC).",
    yourAddress: "Your address",
    receiveLabel: "Receive SAR / BNB",
    disclaimer:
      "Make sure you are connected to BNB Smart Chain (BSC) in your wallet.",
    balancesTitle: "Balances",
    gasInfo: "Used as gas on BNB Smart Chain.",
    contractLabel: "Token Contract",
    addToMetaMask: "Add SAR to MetaMask",
    buyLink: "Buy / Swap SAR on PancakeSwap",
    liquidityLink: "View Liquidity Info",
    backToSite: "← Back to Sardalla main site",
  },
  es: {
    title: "Sardalla Web Wallet",
    subtitle:
      "Conecta tu wallet para ver tu balance de BNB y Sardalla (SAR) en BNB Smart Chain.",
    statusDisconnected: "Wallet no conectada.",
    statusConnected: "Wallet conectada.",
    statusWrongNet: "Red incorrecta. Cambia a BNB Smart Chain (BSC).",
    yourAddress: "Tu dirección",
    receiveLabel: "Recibir SAR / BNB",
    disclaimer:
      "Asegúrate de estar conectado a BNB Smart Chain (BSC) en tu wallet.",
    balancesTitle: "Balances",
    gasInfo: "Usado como gas en BNB Smart Chain.",
    contractLabel: "Contrato del token",
    addToMetaMask: "Añadir SAR a MetaMask",
    buyLink: "Comprar / hacer swap de SAR en PancakeSwap",
    liquidityLink: "Ver info de liquidez",
    backToSite: "← Volver a la web principal de Sardalla",
  },
};

let currentLang = localStorage.getItem("sardalla_wallet_lang") || "en";
let provider;
let signer;
let userAddress;

// Mini ABI para BEP-20/ERC-20
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

function setLanguage(lang) {
  currentLang = I18N[lang] ? lang : "en";
  localStorage.setItem("sardalla_wallet_lang", currentLang);

  const dict = I18N[currentLang];
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (dict[key]) el.textContent = dict[key];
  });

  document.documentElement.lang = currentLang;
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.id === `lang-${currentLang}`);
  });
}

async function connectWallet() {
  const statusRow = document.getElementById("statusRow");
  const statusText = document.getElementById("statusText");

  if (!window.ethereum) {
    alert(
      currentLang === "es"
        ? "MetaMask u otra wallet compatible con Ethereum no está instalada."
        : "MetaMask or another Ethereum-compatible wallet is not installed."
    );
    return;
  }

  try {
    const chainId = await window.ethereum.request({ method: "eth_chainId" });
    if (chainId !== BSC_CHAIN_ID) {
      statusRow.classList.remove("ok");
      statusRow.classList.add("warn");
      statusText.textContent = I18N[currentLang].statusWrongNet;

      // Intentar cambiar de red
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: BSC_CHAIN_ID }],
        });
      } catch (switchError) {
        // El usuario puede cambiar manualmente
      }
    } else {
      statusRow.classList.remove("warn");
      statusRow.classList.add("ok");
      statusText.textContent = I18N[currentLang].statusConnected;
    }

    // Solicitar cuentas
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    userAddress = accounts[0];

    document.getElementById("userAddress").textContent = userAddress;

    // QR
    renderQR(userAddress);

    // Provider & signer
    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();

    // Cargar balances
    await loadBalances();
  } catch (err) {
    console.error(err);
    alert(
      currentLang === "es"
        ? "Error al conectar la wallet."
        : "Failed to connect wallet."
    );
  }
}

async function loadBalances() {
  if (!provider || !userAddress) return;

  try {
    // BNB
    const balanceWei = await provider.getBalance(userAddress);
    const bnb = Number(ethers.formatEther(balanceWei));
    document.getElementById("bnbBalance").textContent = bnb.toFixed(4);

    // SAR
    const sarContract = new ethers.Contract(
      SAR_TOKEN.address,
      ERC20_ABI,
      provider
    );
    const sarBalanceRaw = await sarContract.balanceOf(userAddress);
    const sar = Number(
      ethers.formatUnits(sarBalanceRaw, SAR_TOKEN.decimals)
    );
    document.getElementById("sarBalance").textContent = sar.toFixed(4);
  } catch (err) {
    console.error("Error loading balances", err);
  }
}

function renderQR(address) {
  const container = document.getElementById("qrcode");
  container.innerHTML = "";
  if (!address) return;

  new QRCode(container, {
    text: address,
    width: 128,
    height: 128,
    colorDark: "#ffffff",
    colorLight: "rgba(0,0,0,0)",
    correctLevel: QRCode.CorrectLevel.H,
  });
}

async function addTokenToMetaMask() {
  if (!window.ethereum) {
    alert(
      currentLang === "es"
        ? "MetaMask no está disponible en este navegador."
        : "MetaMask is not available in this browser."
    );
    return;
  }

  try {
    const wasAdded = await window.ethereum.request({
      method: "wallet_watchAsset",
      params: {
        type: "ERC20",
        options: {
          address: SAR_TOKEN.address,
          symbol: SAR_TOKEN.symbol,
          decimals: SAR_TOKEN.decimals,
          image: SAR_TOKEN.image,
        },
      },
    });

    if (wasAdded) {
      alert(
        currentLang === "es"
          ? "✅ Sardalla (SAR) añadido a MetaMask."
          : "✅ Sardalla (SAR) has been added to MetaMask."
      );
    }
  } catch (err) {
    console.error(err);
    alert(
      currentLang === "es"
        ? "Error al intentar añadir el token."
        : "Failed to add token."
    );
  }
}

function copyAddress() {
  if (!userAddress) return;
  navigator.clipboard
    .writeText(userAddress)
    .then(() => {
      // Pequeña confirmación visual
      const btn = document.getElementById("copyAddressBtn");
      const original = btn.textContent;
      btn.textContent = "✔";
      setTimeout(() => (btn.textContent = original), 800);
    })
    .catch(() => {});
}

// Inicialización
document.addEventListener("DOMContentLoaded", () => {
  // Idioma
  setLanguage(currentLang);

  document.getElementById("lang-en").addEventListener("click", () => {
    setLanguage("en");
  });
  document.getElementById("lang-es").addEventListener("click", () => {
    setLanguage("es");
  });

  // Botones principales
  document
    .getElementById("connectBtn")
    .addEventListener("click", connectWallet);
  document
    .getElementById("addTokenBtn")
    .addEventListener("click", addTokenToMetaMask);
  document
    .getElementById("copyAddressBtn")
    .addEventListener("click", copyAddress);

  // Si la cuenta cambia o cambia la red, recargamos datos
  if (window.ethereum) {
    window.ethereum.on("accountsChanged", (accounts) => {
      if (accounts && accounts[0]) {
        userAddress = accounts[0];
        document.getElementById("userAddress").textContent = userAddress;
        renderQR(userAddress);
        loadBalances();
      }
    });

    window.ethereum.on("chainChanged", () => {
      // recargar para simplificar
      window.location.reload();
    });
  }
});
