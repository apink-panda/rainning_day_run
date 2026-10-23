# GitHub Pages 自動部屬設定說明 (GitHub Pages CI/CD)

本專案已完整設定 **GitHub Actions 自動化 CI/CD 工作流程**。每次將程式碼推送到 `main` 分支時，GitHub Actions 會自動讀取 `.env.prod`、編譯靜態站點並自動部屬至 GitHub Pages。

---

## 🌐 部屬網址與自訂網域
* **目標網址**：`https://apink-panda.com/rainning_day_run`
* **自訂網域 (Custom Domain)**：`apink-panda.com`
* **次路徑 (Base Path)**：`/rainning_day_run`

---

## ⚙️ 核心設定檔案

### 1. `.env.prod`（生產環境設定檔）
已建立並加入 Git 版本控制，專門提供生產環境靜態匯出使用：
```env
# Production Environment for GitHub Pages (https://apink-panda.com/rainning_day_run)
NEXT_PUBLIC_BASE_PATH=/rainning_day_run
NEXT_PUBLIC_PANDA_RAIN_LEADERBOARD_URL=https://script.google.com/macros/s/AKfycbyayumZf8wB3CVNxxkVwGeTZcXyl73In2xyNY-MHEkMUuBjhgMFQJ2Cei5ojRSZtJsh8w/exec
```

### 2. `.github/workflows/deploy.yml`（自動部屬工作流程）
* **觸發條件**：每次推送到 `main` 分支，或在 GitHub Actions 頁面手動點擊「Run workflow」。
* **工作流程**：
  1. 自動載入 Node.js 22 並執行 `npm ci`。
  2. 套用 `.env.prod` 環境變數。
  3. 執行靜態頁面匯出與資源路徑前綴處理（`npm run build:pages`）。
  4. 自動建立 `.nojekyll`，防止 GitHub Pages 阻擋 `_next` 目錄。
  5. 自動建立 `CNAME`（指定 `apink-panda.com`）。
  6. 支援雙軌部屬：同時支援 GitHub 官方 **GitHub Actions 模式** 與 **gh-pages 分支模式**。

### 3. `lib/assetHelper.ts`（動態資源路徑轉換）
* 所有的圖檔（小熊貓 Sprite、逐格動畫、表情圖）與音效檔（BGM）皆已透過 `getAssetPath` 自動對接 `NEXT_PUBLIC_BASE_PATH`。
* 本地開發（`http://localhost:3000/`）與線上正式站（`https://apink-panda.com/rainning_day_run/`）皆可無縫載入資源。

---

## 🚀 推送至 GitHub 指令

遠端庫位址已設定完成（`git@github.com:apink-panda/rainning_day_run.git`）：

```bash
# 1. 確保在 main 分支
git branch -M main

# 2. 推送程式碼並觸發自動發布
git push -u origin main
```

---

## 📌 GitHub 專案後台檢查清單

1. **建立遠端 Repository**：
   * 請確認 GitHub 上已有 `apink-panda/rainning_day_run` 倉庫，且您具備 Push 權限。
2. **啟用 GitHub Pages**：
   * 進入該 Repository 的 **Settings** ➔ **Pages**。
   * **Build and deployment** ➔ **Source** 選擇 **GitHub Actions**（建議）。
   * **Custom domain** 設定為 `apink-panda.com`，並勾選 **Enforce HTTPS**。
3. **查看部屬進度**：
   * 進入專案的 **Actions** 標籤頁即可即時查看部屬狀態，完成後綠燈亮起即可造訪 `https://apink-panda.com/rainning_day_run`！
