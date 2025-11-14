/* LANGUAGE SYSTEM */

const dict = {
  en:{
    tagline:"A community-driven token on Binance Smart Chain",
    lead:"Sardalla (SAR) is a BEP-20 token focused on transparency, simplicity and open access through decentralized blockchain technology.",
    buy:"Buy SAR",
    liquidity:"Liquidity Info",
    contract:"View Contract",
    addwallet:"Add to Wallet",
    quick:"Quick Links",
    sell:"Sell SAR",
    aboutTitle:"About Sardalla",
    aboutBody:"Sardalla (SAR) is a BEP-20 token deployed on Binance Smart Chain. Its objective is to provide a transparent, community-led asset with verifiable supply and future experimental utilities.",
    tokenomicsTitle:"Tokenomics",
    whitepaperTitle:"Whitepaper",
    whitepaperLink:"Read Sardalla Whitepaper",
    teamTitle:"Project Model",
    teamBody:"Sardalla is a community-driven token with transparent development via public repositories. No centralized team.",
    nextTitle:"Next Steps",
    nextBody:"Contract verified. Liquidity locked. Roadmap published. Experimental utilities under development."
  },

  es:{
    tagline:"Un token impulsado por la comunidad en Binance Smart Chain",
    lead:"Sardalla (SAR) es un token BEP-20 centrado en la transparencia, simplicidad y acceso abierto mediante tecnología blockchain.",
    buy:"Comprar SAR",
    liquidity:"Info de Liquidez",
    contract:"Ver contrato",
    addwallet:"Añadir a Wallet",
    quick:"Enlaces rápidos",
    sell:"Vender SAR",
    aboutTitle:"Acerca de Sardalla",
    aboutBody:"Sardalla (SAR) es un token BEP-20 desplegado en Binance Smart Chain. Su objetivo es ofrecer un activo transparente, gestionado por la comunidad y con suministro verificable.",
    tokenomicsTitle:"Tokenomics",
    whitepaperTitle:"Whitepaper",
    whitepaperLink:"Leer Whitepaper",
    teamTitle:"Modelo del proyecto",
    teamBody:"Sardalla es un token comunitario con desarrollo transparente mediante repositorios públicos.",
    nextTitle:"Próximos pasos",
    nextBody:"Contrato verificado. Liquidez bloqueada. Roadmap publicado. Utilidades experimentales en desarrollo."
  },

  zh:{
    tagline:"一个由社区推动的 Binance Smart Chain 代币",
    lead:"Sardalla (SAR) 是一个专注透明性、简单性和开放访问的 BEP-20 区块链代币。",
    buy:"购买 SAR",
    liquidity:"流动性信息",
    contract:"查看合约",
    addwallet:"添加到钱包",
    quick:"快捷链接",
    sell:"卖出 SAR",
    aboutTitle:"关于 Sardalla",
    aboutBody:"Sardalla (SAR) 是部署在 Binance Smart Chain 上的 BEP-20 代币，旨在提供一个透明、社区驱动且供应可验证的资产。",
    tokenomicsTitle:"代币经济",
    whitepaperTitle:"白皮书",
    whitepaperLink:"阅读白皮书",
    teamTitle:"项目模式",
    teamBody:"Sardalla 通过公共代码库进行透明开发，无中心化团队。",
    nextTitle:"下一步",
    nextBody:"合约已验证。流动性已锁定。Roadmap 已发布。实验性功能开发中。"
  }
};

function setLang(lang){
  const t = dict[lang] || dict.en;
  document.querySelectorAll("[data-i18n]").forEach(el=>{
    const key = el.getAttribute("data-i18n");
    if(t[key]) el.textContent = t[key];
  });
  document.querySelectorAll(".lang button")
    .forEach(btn=>btn.classList.toggle("active",btn.dataset.lang===lang));

  localStorage.setItem("sardalla_lang", lang);
  document.documentElement.lang = lang;
}

document.querySelectorAll(".lang button")
  .forEach(btn => btn.addEventListener("click", () => setLang(btn.dataset.lang)));

setLang(localStorage.getItem("sardalla_lang") || "en");


/* ADD TO METAMASK */
async function addTokenToMetaMask(){
  if(window.ethereum){
    try{
      await ethereum.request({
        method:"wallet_watchAsset",
        params:{
          type:"ERC20",
          options:{
            address:"0x851D720513Ff135007DE95BD58b28514093BEb25",
            symbol:"SAR",
            decimals:18,
            image:"logo_sardalla_128px.webp"
          }
        }
      });
    } catch(err){
      console.error(err);
      alert("Error adding token");
    }
  } else {
    alert("MetaMask not detected");
  }
}
