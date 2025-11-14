const dict = {
  en:{
    tagline:"A community-driven token on Binance Smart Chain",
    lead:"Sardalla (SAR) is a BEP-20 token focused on transparency, simplicity and open access through decentralized blockchain technology.",
    buy:"Buy SAR",
    liquidity:"Liquidity Info",
    contract:"View Contract",
    quick:"Quick Links",
    sell:"Sell SAR",
    aboutTitle:"About Sardalla",
    aboutBody:"Sardalla (SAR) is a BEP-20 token deployed on Binance Smart Chain. Its objective is to provide a transparent, community-led asset with a simple structure and fully verifiable supply.",
    tokenomicsTitle:"Tokenomics",
    whitepaperTitle:"Whitepaper",
    whitepaperLink:"Read Sardalla Whitepaper",
    teamTitle:"Team / About",
    teamBody:"Sardalla is a community token with transparent development through public repositories. Contact available via Telegram or official email.",
    nextTitle:"Next Steps",
    nextBody:"Contract verified on BscScan. Liquidity locked and project updates communicated through official channels."
  },

  es:{
    tagline:"Un token impulsado por la comunidad en Binance Smart Chain",
    lead:"Sardalla (SAR) es un token BEP-20 centrado en la transparencia, la simplicidad y el acceso abierto mediante tecnología blockchain.",
    buy:"Comprar SAR",
    liquidity:"Info de Liquidez",
    contract:"Ver Contrato",
    quick:"Enlaces rápidos",
    sell:"Vender SAR",
    aboutTitle:"Acerca de Sardalla",
    aboutBody:"Sardalla (SAR) es un token BEP-20 desplegado en Binance Smart Chain. Su objetivo es ofrecer un activo transparente, gestionado por la comunidad y con suministro totalmente verificable.",
    tokenomicsTitle:"Tokenomics",
    whitepaperTitle:"Whitepaper",
    whitepaperLink:"Leer el Whitepaper de Sardalla",
    teamTitle:"Equipo / Sobre nosotros",
    teamBody:"Sardalla es un token comunitario con desarrollo transparente mediante repositorios públicos. Contacto disponible por Telegram o email oficial.",
    nextTitle:"Próximos pasos",
    nextBody:"Contrato verificado en BscScan. Liquidez bloqueada y actualizaciones comunicadas por canales oficiales."
  },

  zh:{
    tagline:"一个由社区推动的 Binance Smart Chain 代币",
    lead:"Sardalla (SAR) 是一个专注透明、简单和开放访问的 BEP-20 区块链代币。",
    buy:"购买 SAR",
    liquidity:"流动性信息",
    contract:"查看合约",
    quick:"快捷链接",
    sell:"卖出 SAR",
    aboutTitle:"关于 Sardalla",
    aboutBody:"Sardalla (SAR) 是在 Binance Smart Chain 部署的 BEP-20 代币。它的目标是提供一个透明、社区驱动且供应完全可验证的资产。",
    tokenomicsTitle:"代币经济",
    whitepaperTitle:"白皮书",
    whitepaperLink:"阅读 Sardalla 白皮书",
    teamTitle:"团队 / 关于",
    teamBody:"Sardalla 是一个社区代币，通过公共代码库实现透明开发。可通过 Telegram 或官方邮箱联系。",
    nextTitle:"下一步",
    nextBody:"合约已经在 BscScan 验证。流动性已锁定，项目更新将通过官方渠道发布。"
  }
};

function setLang(lang){
  const t = dict[lang] || dict.en;
  document.querySelectorAll("[data-i18n]").forEach(e=>{
    const k=e.getAttribute("data-i18n");
    if(t[k]) e.textContent=t[k];
  });
  document.querySelectorAll(".lang button").forEach(b=>{
    b.classList.toggle("active",b.dataset.lang===lang);
  });
  localStorage.setItem("sardalla_lang",lang);
  document.documentElement.lang = lang;
}

setLang(localStorage.getItem("sardalla_lang") || "en");

document.querySelectorAll(".lang button")
.forEach(btn=>btn.addEventListener("click",()=>setLang(btn.dataset.lang)));
