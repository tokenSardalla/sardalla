# 🧠 Sardalla (SAR) — Whitepaper Técnico v1.0

**Contrato verificado:** [0x851D720513Ff135007DE95BD58b28514093BEb25](https://bscscan.com/token/0x851D720513Ff135007DE95BD58b28514093beb25)  
**Token verificado en BscScan — BEP-20 en BNB Smart Chain**

---

## 1. Introducción

Sardalla (SAR) es un token BEP-20 desarrollado en la red BNB Smart Chain (BSC).  
Está diseñado como medio de pago en ecosistemas descentralizados y base experimental para proyectos DeFi.

---

## 2. Especificaciones Técnicas

- **Nombre:** Sardalla  
- **Símbolo:** SAR  
- **Contrato:** `0x851D720513Ff135007DE95BD58b28514093BEb25`  
- **Red:** BNB Smart Chain (BEP-20)  
- **Supply total:** 1,000,000,000 SAR  
- **Mint adicional:** Desactivado  
- **Función Burn:** Disponible  
- **Auditable:** Código verificado públicamente

---

## 3. Fragmentos del Contrato Solidity

```solidity
function totalSupply() public view returns (uint256) {
    return _totalSupply;
}

function transfer(address recipient, uint256 amount) public returns (bool) {
    _transfer(msg.sender, recipient, amount);
    return true;
}

function burn(uint256 amount) public virtual {
    _burn(msg.sender, amount);
}
```

---

## 4. Seguridad y Transparencia

- El contrato ha sido verificado en BscScan.  
- No existen funciones ocultas de *mint*, *fee* o *blacklist*.  
- La propiedad puede ser renunciada para evitar centralización.  

---

## 5. Bridges y Expansión

Sardalla se ha diseñado para integrarse con puentes (bridges) hacia otras redes EVM compatibles,  
permitiendo versiones *wrapped* (wSAR) en Ethereum, Polygon o Avalanche.  

---

## 6. Filosofía

> “Sardalla no promete, construye.”

---

## 7. Comunidad y Contacto

- 🌐 [Web oficial](https://tokensardalla.github.io/sardalla/)  
- 💬 [Telegram](https://t.me/tokensardalla)  
- 🐦 [X (Twitter)](https://x.com/tokensardalla)  
- 💾 [GitHub](https://github.com/tokenSardalla/sardalla)  
- ✉️ tokensardalla@hotmail.com  

---

© 2025 Sardalla Project — Proyecto descentralizado BEP-20 desarrollado en Asturias  
