# 水窪跳跳｜熊貓雨衣隊 🐼🌧️ (Apink Rain Running Game)

[![Deploy to GitHub Pages](https://github.com/apink-panda/rainning_day_run/actions/workflows/deploy.yml/badge.svg)](https://github.com/apink-panda/rainning_day_run/actions/workflows/deploy.yml)
[![Live Site](https://img.shields.io/badge/Live-Game-brightgreen)](https://apink-panda.com/rainning_day_run/)
[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC_BY--NC--SA_4.0-lightgrey.svg)](./LICENSE)

> [!IMPORTANT]
> **本專案為粉絲自製內容，僅供社群交流分享，嚴禁任何形式之商業營利用途。**
> **This project is a fan-made creation for community sharing only. COMMERCIAL USE IS STRICTLY PROHIBITED.**

這是一個專為 Apink 與 Pink Panda 打造的雨天奔跑跳躍互動小遊戲《水窪跳跳｜熊貓雨衣隊》（Apink Rain Running Game）。
玩家可選擇五位成員代表的小熊貓角色，在雨天賽道上跳躍跨過水窪、翻轉突破障礙、收集雨天道具，並在奔跑中收集字母解鎖 Apink 經典名曲與幸運歌曲加成！

---

## 🌟 核心特色 (Core Features)

*   **🐼 官方成員專屬逐格動畫 (Character Sprites)**
    *   收錄 5 隻專屬代表色小熊貓：恩地（MEUNGDOONG）、初瓏（RONGDOONG）、南珠（JOODOONG）、普美（BOMDOONG）、夏榮（BANGDOONG）。
    *   全自製高幀率奔跑、跳躍與空中二段翻轉動畫。
*   **💿 Apink 名曲集字系統 (Song Quests)**
    *   每局隨機輪播 5 首 Apink 經典歌曲 + 1 首神秘幸運歌曲（收錄歷代主打歌與熱門回歸曲）。
    *   跑道上隨機出現音符字母泡泡，集齊完整單字即可獲得結算分數大幅加乘！
*   **🌧️ 動態天氣與無上限波次 (Weather & Dynamic Waves)**
    *   4 種動態天氣場景即時輪替：白天下雨 🌦️、夕暮微雨 🌅、狂風暴雨 ⛈️、霓虹夜雨 🌙。
    *   波次難度隨時間遞增，考驗玩家極限反應速度。
*   **☂️ 豐富道具機制 (Power-Ups & Buffs)**
    *   **☂️ 雨傘護盾**：抵擋一次水窪或石頭碰撞。
    *   **💖 活力愛心**：立即回復 1 顆愛心生命值。
    *   **🌈 彩虹衝刺**：進入無敵狂飆狀態，橫掃障礙物。
    *   **✦ 星光徽章**：額外加分獎勵。
*   **🏆 全球即時排行榜 (Global Leaderboard)**
    *   支援玩家自訂暱稱提交最高紀錄。
    *   智慧偵測個人最佳紀錄（Personal Best），更新歷史新高。
*   **🎵 沉浸式音效系統 (Immersive Audio)**
    *   支援即時靜音/開啟聲音開關。
    *   精心調校的跳躍、翻轉、撿拾道具音效與雨天背景音樂。

---

## 🛠 技術堆疊 (Tech Stack)

*   **Frontend**: Next.js (Vinext), React 19, TypeScript
*   **Styling**: Vanilla CSS, Glassmorphism UI
*   **Game Engine**: 自研 `requestAnimationFrame` 遊戲循環、物理重力與精準碰撞偵測系統
*   **Backend / Storage**: Google Apps Script API, Google Sheets
*   **Automation & Deployment**: GitHub Actions (CI/CD), GitHub Pages (`gh-pages`), Cloudflare CDN

---

## ⚠️ 免責聲明與授權 (Disclaimer & License)

*   **Content**: This repository is for non-commercial fan creation purposes only. All video content and IP belong to their respective owners (IST Entertainment, etc.).
*   **Code**: The source code of this project is licensed under [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)](./LICENSE).
    *   **姓名標示 (BY)**：使用或修改程式碼時請標註原作者。
    *   **非商業性 (NC)**：禁止任何營利用途。
    *   **相同方式分享 (SA)**：衍生作品必須以同等授權開源。
