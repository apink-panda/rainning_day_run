# 音效與背景音樂版權與來源說明 (Audio Credits & Licensing)

本專案《水窪跳跳｜熊貓雨衣隊》中所使用的音效與背景音樂均為 **合法、免費且可公開播放／使用** 的免版稅資源與程式即時合成音效。

---

## 1. 🎵 背景音樂 (BGM)
- **曲名**：*Empty Mind*
- **檔案路徑**：`public/audio/rain-bgm.mp3`
- **原創創作者**：**Lofi_hour** (Lofi Hour)
- **來源平台**：[Pixabay Music - Empty Mind (ID: 118973)](https://pixabay.com/music/empty-mind-118973/)
- **授權條款**：**Pixabay Content License (Royalty-Free / 免版稅授權)**
  - ✅ **可公開播放**：允許在網頁、遊戲、YouTube 影片、直播中公開播放。
  - ✅ **商業與非商業皆可使用**：無須支付授權費用。
  - ✅ **無需強制標註來源**（Attribution not required，但標註創作者以表達感謝）。
  - ❌ 禁止單獨提取此音訊檔案進行重新轉售或作為素材庫發佈。

---

## 2. 🔊 遊戲即時音效 (Sound Effects)
- **跳躍音效 (Jump & Flip)**
- **踩到障礙物與水花音效 (Obstacle Hit & Water Splash)**
- **道具拾取音效 (Shield, Heal, Rainbow, Star)**
- **Apink 歌曲單字字母拾取音效 (Letter Pickup & Lucky Chime)**
- **歌曲達成慶祝音效 (Song Complete Fanfare)**
- **波次提升與 Game Over 音效 (Wave Up & Game Over)**

### 來源說明：
- **實作方式**：由前端代碼 (`lib/audioManager.ts`) 透過瀏覽器標準 **Web Audio API** 即時振盪器與濾波器合成（`OscillatorNode`, `BiquadFilterNode`, `GainNode`）。
- **版權歸屬**：程式自製動態合成音，**不包含任何第三方的商用取樣音訊檔**，完全無版權侵權風險，延遲為 0ms，可安心公開播放與部署。
