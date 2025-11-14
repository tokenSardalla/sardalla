// -------------------------
// Multi-language dictionary
// -------------------------
const dict = {
  en:{
    tagline:"A community-driven token on Binance Smart Chain",
    lead:"Sardalla (SAR) is a BEP-20 token focused on transparency, simplicity and decentralized access.",
    buy:"Buy SAR",
    liquidity:"Liquidity Info",
    contract:"View Contract",
    addmm:"Add to MetaMask",
    quick:"Quick Links",
    sell:"Sell SAR",
    aboutTitle:"About Sardalla",
    aboutBody:"Sardalla (SAR) is a BEP-20 token deployed on Binance Smart Chain. Its objective is to explore multichain bridges, payments and governance.",
    tokenomicsTitle:"Tokenomics",
    whitepaperTitle:"Whitepaper",
    whitepaperLink:"Read Sardalla Whitepaper",
    teamTitle:"Team / About",
    teamBody:"Sardalla is a community token with transparent development via public repositories.",
    nextTitle:"Next Steps",
    nextBody:"Contract verified. Liquidity locked. Updates through official channels."
  },

  es:{
    tagline:"Un token impulsado por la comunidad en Binance Smart Chain",
    lead:"Sardalla (SAR) es un token BEP-20 centrado en la transparencia, la simplicidad y el acceso descentralizado.",
    buy:"Comprar SAR",
    liquidity:"Info de Liquidez",
    contract:"Ver Contrato",
    addmm:"Añadir a MetaMask",
    quick:"Enlaces rápidos",
    sell:"Vender SAR",
    aboutTitle:"Acerca de Sardalla",
    aboutBody:"Sardalla (SAR) es un token BEP-20 cuyo objetivo es explorar puentes multired, pagos y gobernanza comunitaria.",
    tokenomicsTitle:"Tokenomics",
    whitepaperTitle:"Whitepaper",
    whitepaperLink:"Leer el Whitepaper de Sardalla",
    teamTitle:"Equipo / Acerca de",
    teamBody:"Sardalla es un token comunitario con desarrollo transparente mediante repositorios públicos.",
    nextTitle:"Próximos pasos",
    nextBody:"Contrato verificado. Liquidez bloqueada. Actualizaciones en los canales oficiales."
  },

  zh:{
    tagline:"一个由社区推动的 Binance Smart Chain 代币",
    lead:"Sardalla (SAR) 是一个专注透明度和开放访问的 BEP-20 代币。",
    buy:"购买 SAR",
    liquidity:"流动性信息",
    contract:"查看合约",
    addmm:"添加到 MetaMask",
    quick:"快捷链接",
    sell:"卖出 SAR",
    aboutTitle:"关于 Sardalla",
    aboutBody:"Sardalla (SAR) 是一个部署在 BSC 上的 BEP-20 代币，旨在探索跨链桥和去中心化治理。",
    tokenomicsTitle:"代币经济",
    whitepaperTitle:"白皮书",
    whitepaperLink:"阅读 Sardalla 白皮书",
    teamTitle:"团队 / 关于",
    teamBody:"Sardalla 是一个社区代币，开发透明且开源。",
    nextTitle:"下一步",
    nextBody:"合约已验证，流动性已锁定，更新通过官方渠道发布。"
  }
};


// -------------------------
// Language selector
// -------------------------
const setLang = lang => {
  const t = dict[lang] || dict.en;
  document.querySelectorAll("[data-i18n]").forEach(el=>{
    const key = el.getAttribute("data-i18n");
    if(t[key]) el.textContent = t[key];
  });
  document.querySelectorAll(".lang button")
    .forEach(b=>b.classList.toggle("active",b.dataset.lang===lang));

  localStorage.setItem("sardalla_lang", lang);
  document.documentElement.lang = lang;
};

setLang(localStorage.getItem("sardalla_lang") || "en");

document.querySelectorAll(".lang button").forEach(btn=>{
  btn.addEventListener("click",()=>setLang(btn.dataset.lang));
});


// -------------------------
// Add Token to MetaMask
// -------------------------
document.getElementById("addMetaMask").addEventListener("click", async () => {
  if (!window.ethereum) {
    alert("MetaMask not detected");
    return;
  }

  try {
    await window.ethereum.request({
      method: "wallet_watchAsset",
      params: {
        type: "ERC20",
        options: {
          address: "0x851D720513Ff135007DE95BD58b28514093BEb25",
          symbol: "SAR",
          decimals: 18,
          image: "https://tokensardalla.github.io/sardalla/logo_sardalla_128px.webp"
        }
      }
    });
  } catch (err) {
    console.error(err);
    alert("Error adding token.");
  }
});
ataset.lang)));
