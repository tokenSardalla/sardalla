# Sardalla (SAR) — Technical Whitepaper v1.0 (English Edition)

**Verified contract:** `0x851D720513Ff135007DE95BD58b28514093BEb25`  
**Verified BEP-20 token on BNB Smart Chain (BSC)**

## 1. Introduction

Sardalla (SAR) is a BEP-20 token deployed on the BNB Smart Chain (BSC).  
It is designed as a payment medium within decentralized ecosystems and as an experimental foundation for future DeFi services, tools, bridges and community-driven governance models.

## 2. Technical Specifications

- **Name:** Sardalla  
- **Symbol:** SAR  
- **Contract:** `0x851D720513Ff135007DE95BD58b28514093BEb25`  
- **Network:** BNB Smart Chain (BEP-20)  
- **Total supply:** 1,000,000,000 SAR  
- **Additional minting:** Disabled  
- **Burn function:** Enabled  
- **Auditability:** Fully verified and publicly accessible on BscScan  

## 3. Solidity Contract Snippets

```
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

## 4. Security & Transparency

- The smart contract is fully verified on BscScan.  
- It contains **no hidden mint**, **no hidden fees**, **no blacklist mechanisms**, and **no privileged owner-only transfers**.  
- Ownership can be renounced to promote decentralization and strengthen community trust.  

## 5. Bridges & Multi-Chain Expansion

Sardalla (SAR) is designed to integrate with cross-chain bridges, enabling the creation of wrapped versions (*wSAR*) on other EVM-compatible networks such as:

- Ethereum  
- Polygon  
- Avalanche  
- Arbitrum  
- Optimism  

This multi-chain vision aims to expand the token’s usability, accessibility, and liquidity opportunities.

## 6. Philosophy

> “Sardalla does not make promises — it builds.”

A simple and transparent approach: no hype, no unrealistic roadmaps, just code, community, and reliable development.

## 7. Community & Contact

- **Official Website:** https://tokensardalla.github.io/sardalla/  
- **Telegram:** https://t.me/tokensardalla  
- **X (Twitter):** https://x.com/tokensardalla  
- **GitHub Repository:** https://github.com/tokenSardalla/sardalla  
- **Email:** tokensardalla@hotmail.com  

© 2025 Sardalla Project — Decentralized BEP-20 asset developed in Asturias, Spain.
