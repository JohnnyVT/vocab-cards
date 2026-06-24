# 兒童英文單字卡 App — 規劃文件

> 狀態：草稿 v0.1，待 Johnny review
> 最後更新：2026-06-24

---

## 1. 產品目標

做一個給**小朋友學英文單字與簡單句子**的網頁應用，核心是「單字卡 + 短影片」，特色：

- **離線可播放**（沒網路也能用，適合家裡、車上、教室）
- **平板優先**（大按鈕、好點、橫向全螢幕、不容易誤觸跳出）
- **多語翻譯語音**：中文、日文、越南文、保加利亞文，可在設定切換

對象：學齡前 ~ 國小低年級的小朋友（家長/老師陪同操作）。

---

## 2. 核心使用流程

每張卡是一個「**圖片卡**」或「**影片卡**」，操作一致：

### 播放順序（共通）
按一次 ▶ 跑完整段：

```
媒體（圖片顯示 / 影片播放）
  → 英文語音 第 1 次（0.9x 稍慢）
  → 英文語音 第 2 次（0.7x 更慢，讓小朋友聽清楚每個音）
  → 翻譯語音 1 次（依設定語言，正常速）
```

### 圖片卡（例：一隻鳥）
1. 畫面顯示一張圖片（鳥）
2. 小朋友按大大的 ▶ 播放鈕
3. 英文「Bird」唸 2 次（0.9x → 0.7x）
4. 接著翻譯語音（依設定語言）：例如中文「鳥」
5. 可重複播放，或滑到下一張

### 影片卡（例：Let's play together!）
1. 畫面顯示一段短影片（用 Grok Text-to-Video 生成，例如：一個小朋友拿玩具邀請另一個小朋友一起玩）
2. 小朋友按 ▶ 播放鈕
3. 影片播放，英文「Let's play together!」唸 2 次（0.9x → 0.7x）
4. 影片/英文結束後播放翻譯語音
5. 可重播，或滑到下一張

### 共通互動
- **媒體下方顯示文字**：英文單字/句子（大字）＋ 該語言翻譯文字（依設定語言）
- **一張大卡片佔滿畫面**，一次只專注一張
- **單一大播放鈕** = 跑完整段流程（媒體 → 英文×2 → 翻譯）
- 另外有小按鈕：「🔊 再聽英文（含慢速）」「🌐 再聽翻譯」可單獨重播
- 換下一張：大箭頭按鈕 ＋ 左右滑動皆可

---

## 3. 功能範圍

### MVP（第一版，先做這些）
- [ ] 單字卡輪播（圖片卡 + 影片卡）
- [ ] 播放流程：媒體 → 英文語音 → 翻譯語音
- [ ] 翻譯語言切換（zh / ja / vi / bg）
- [ ] 離線可用（PWA，加到主畫面後沒網路也能玩）
- [ ] 平板橫向全螢幕 UI
- [ ] 卡片內容用一份 JSON 管理，方便日後增刪

### 之後再考慮（先不做）
- 學習進度／星星獎勵
- 家長後台、自訂卡組
- 互動測驗（看圖選字、聽音選圖）
- 語音跟讀錄音
- 雲端同步

---

## 4. 技術架構（建議）

維持與現有 landing page 一致的**純靜態**做法，不引入 build 流程：

| 項目 | 建議 | 理由 |
|------|------|------|
| 形態 | **PWA**（單頁 + manifest + Service Worker） | 「加到主畫面」像 App、可全螢幕、可離線 |
| 前端 | 原生 HTML/CSS/JS（或極輕量，無打包） | 跟現有 repo 一致、零建置、好維護 |
| 離線 | Service Worker + Cache API | 快取 app 殼 + 媒體資源 |
| 內容 | 一份 `cards.json` 描述卡組 | 內容與程式分離，非工程師也能改 |
| 媒體 | 圖片 `.webp/.jpg`、影片 `.mp4(H.264)`、語音 `.mp3` | 平板（iPad/Android）相容性最佳 |

> 平板相容性重點：iPad Safari 對影片 autoplay 有限制，必須由「使用者點擊」觸發播放（我們的流程本來就是點 ▶ 才播，沒問題）。

---

## 5. 語音方案 — ElevenLabs 預生成（已定）

英文 + 4 種翻譯語音都在**內容製作階段**用 **ElevenLabs** 生成 `.mp3` 打包，執行時完全離線播放。每張卡最多 5 個音檔（en + zh + ja + vi + bg）。

- **聲音**：挑一個**兒童/年輕、溫柔親切**的 voice profile（給小朋友聽）。理想是 5 種語言用同一個聲線一致；若某語言該聲線不支援，再各語言挑相近童聲。候選見 §5.1。
- **英文唸兩次、放慢（已定）**：英文 mp3 只生成 **1 個（正常速）**，播放時用 `audio.playbackRate` 調速 → 第 1 次 **0.9x**、第 2 次 **0.7x**，並設 `preservesPitch = true` 保留音高。
  - 好處：不必為慢速另存檔、不增加打包體積。
  - 若 0.7x 聽起來有破音/失真，再退而求其次：用 ElevenLabs 預生成一個慢速版英文 mp3。
- **模型**：用多語模型（如 `eleven_multilingual_v2`）涵蓋 en / zh / ja / vi / bg。
  - ⚠️ **需先驗證**：保加利亞文（bg）與越南文（vi）的發音品質與覆蓋。製作前先各跑一句試聽，不行再退而求其次（換聲線或該語言改其他來源）。
- **流程**：以 `cards.json` 的文字為來源，批次呼叫 ElevenLabs API → 輸出 `assets/audio/{lang}/{id}.mp3` → 人工抽聽確認 → 打包。
- 為什麼不用瀏覽器內建 TTS：iPad 上常需連網、越/保語音常缺、音質不可控 → 不適合離線兒童用。

### 5.1 各語言 Voice ID（已選定）

每種語言用各自挑選的聲音（解決口音問題）。模型：多數語言用 `eleven_multilingual_v2`；**中文改用 `eleven_turbo_v2_5` 並帶 `language_code:"zh"`**，避免單一中日共用漢字（如「鳥」）被誤判成日文（念成 tori）。設定見 `scripts/gen-audio.mjs` 的 `LANGS`。

| 語言 | Voice ID |
|------|----------|
| 英文 en | `2OEeJcYw2f3bWMzzjVMU` |
| 繁體中文 zh | `APSIkVZudNbPAwyPoeVO` |
| 日文 ja | `3321Alera3fXjEWjjbAX` |
| 越南文 vi | `IovBBFnLZ6QzJhFLLroy` |
| 保加利亞文 bg | `M1ydWt7KnBCiuv4CnEDC` |

> 產生 mp3 需要 **ElevenLabs API key**。生成腳本見 §13，key 設在環境變數 `ELEVENLABS_API_KEY`。

---

## 6. 影片生成 pipeline（Grok Text-to-Video）

影片在「**內容製作階段**」生成，**不是 App 執行時即時生成**（執行時要離線）。流程：

1. 寫好句子（例：「Let's play together!」）與分鏡描述（小朋友拿玩具邀請另一位）
2. 丟給 Grok Text-to-Video 生成短片（建議 3–6 秒、適齡、畫面安全）
3. 人工挑選/重生，確認內容適合兒童
4. 轉檔為 `.mp4`（H.264，低解析度以縮小體積）並做為卡片媒體
5. 影片**靜音或僅留環境音**，英文與翻譯語音用我們自己的 TTS 疊上去播放（流程可控、可切換語言）

> 注意：影片數量直接影響打包體積（見 §7 離線策略）。建議影片卡用在「句子」，單字多用圖片卡。

---

## 7. 內容規模與離線策略

### 規模
- **首版 5 個卡組、每組約 10 張、共約 50 張**
- **圖/影片比例依主題彈性調整**，不寫死。每張卡的 `type` 由 `cards.json` 決定，程式不假設固定數量。範例：
  - 數字（1–10）：**全圖片**
  - 顏色 / 食物：**多圖片**、少量或不用影片
  - 日常用語：**影片較多**（句子適合用情境短片）
  - 動物：圖片為主、代表性動作可用影片
- 語音：約 50 × 5 語言 = **~250 個 mp3**

### 體積估算（依比例會浮動）

| 資源 | 約數量 | 單檔 | 全部小計 |
|------|--------|------|----------|
| 影片 .mp4（3–6s, H.264 低解析） | ~10–15 支 | ~1–2 MB | 10–30 MB |
| 圖片 .webp | ~35–40 張 | ~60–100 KB | ~3 MB |
| 語音 .mp3（en+4 譯） | ~250 | ~30 KB | ~7.5 MB |
| **合計** | | | **約 20–40 MB** |

### 結論：首版「**5 組全部打包離線**」+ 架構保留「**下載更多卡組**」（已定）
- **首版**：5 組內容隨 App 一起打包，安裝後即全部離線可用，使用者不需任何下載動作。
- **App 殼 + 內建 5 組**：Service Worker 安裝時即快取。
- **可擴充設計**：卡組是獨立模組（各自一個 `cards.json` + 媒體資料夾），首頁列出已有卡組，並有一個「**＋ 下載更多卡組**」入口，未來新主題上架後使用者連網即可下載、存入快取後離線使用。
  - 卡組狀態：`內建 ✓` / `可下載` / `下載中…` / `已下載 ✓`
- 影片再壓縮空間：3–6 秒、≤720p、降 bitrate，可把單支壓到 ~1MB，全部壓到 ~20MB 上下，首次安裝負擔可接受。

---

## 8. 資料模型（內容用一份 JSON）

```jsonc
// cards.json
{
  "deckId": "starter-animals",
  "title": { "zh": "動物入門", "ja": "どうぶつ", "vi": "Động vật", "bg": "Животни" },
  "cards": [
    {
      "id": "bird",
      "type": "image",                       // image | video
      "media": "assets/img/bird.webp",
      "english": { "text": "Bird", "audio": "assets/audio/en/bird.mp3" },
      "translations": {
        "zh": { "text": "鳥",    "audio": "assets/audio/zh/bird.mp3" },
        "ja": { "text": "とり",  "audio": "assets/audio/ja/bird.mp3" },
        "vi": { "text": "Chim",  "audio": "assets/audio/vi/bird.mp3" },
        "bg": { "text": "Птица", "audio": "assets/audio/bg/bird.mp3" }
      }
    },
    {
      "id": "lets-play",
      "type": "video",
      "media": "assets/video/lets-play.mp4",
      "poster": "assets/img/lets-play.webp",  // 影片載入前的縮圖
      "english": { "text": "Let's play together!", "audio": "assets/audio/en/lets-play.mp3" },
      "translations": {
        "zh": { "text": "我們一起玩吧！", "audio": "assets/audio/zh/lets-play.mp3" },
        "ja": { "text": "いっしょに あそぼう！", "audio": "assets/audio/ja/lets-play.mp3" },
        "vi": { "text": "Cùng chơi nào!", "audio": "assets/audio/vi/lets-play.mp3" },
        "bg": { "text": "Хайде да играем заедно!", "audio": "assets/audio/bg/lets-play.mp3" }
      }
    }
  ]
}
```

加新卡片＝在 `cards.json` 加一筆 + 放對應媒體檔，不用改程式。

---

## 9. 平板 UX 設計重點

- **橫向全螢幕**，一次一張大卡，媒體佔滿視覺中心
- **超大圓形 ▶ 播放鈕**（≥ 96px），其他按鈕觸控區 ≥ 64px
- 配色明亮、童趣、字大、留白多，少文字干擾
- 換卡：左右大箭頭 ＋ 滑動手勢
- 設定（語言切換）藏在角落小齒輪，避免小朋友誤觸
- 全螢幕鎖定（fullscreen + 防止意外跳出），讓小朋友專心
- 播放時播放鈕有清楚的動畫/狀態回饋

---

## 10. 決策紀錄與待辦 ❓

已定：
- [x] **內容範圍**：首版 5 組、每組約 10 張、共約 50 張
- [x] **5 組主題**：動物 / 日常用語 / 顏色 / 食物 / 數字
- [x] **圖/影片比例**：不寫死，依主題彈性（數字全圖片、日常用語影片多…）
- [x] **語音**：ElevenLabs 預生成，挑兒童/溫柔童聲，多語模型涵蓋 5 語
- [x] **英文唸 2 次放慢**：0.9x → 0.7x，runtime 調速、保留音高
- [x] **離線**：首版 5 組全部打包離線；架構保留「下載更多卡組」擴充入口
- [x] **進度/家長功能**：MVP 不做

- [x] **卡面顯示文字**：媒體下方顯示英文＋翻譯文字
- [x] **首批範圍**：先只做「動物」這 1 組，跑通流程再擴充
- [x] **各語言 Voice ID**：見 §5.1

待你決定 / 待確認：
1. **ElevenLabs API key**：產生語音需要（設為環境變數 `ELEVENLABS_API_KEY`）。
2. **動物影片**：3 張影片卡的 Grok 生成需要 Grok 影片存取；可先用佔位圖跑流程。
3. **動物圖片**：7 張圖片來源（自備/圖庫/AI 生圖？）。
4. **部署位置**：放哪個網域/路徑？跟現有 landing page 同一個 repo 嗎？

---

## 11. 開發階段規劃（建議）

| 階段 | 產出 |
|------|------|
| P0 內容雛形 | 先做 1 個卡組（約 10 張，依主題配圖/影片），用 ElevenLabs 產英文＋4 語音檔，驗證流程後再做其餘 4 組 |
| P1 播放器 | 單卡播放流程（媒體→英文→翻譯）、重播、換卡、語言切換 |
| P2 PWA 離線 | manifest + Service Worker、加到主畫面、離線可玩 |
| P3 平板打磨 | 全螢幕、手勢、大按鈕、童趣視覺 |
| P4（選配） | 卡組下載管理、更多卡組、進度獎勵 |

---

## 12. 建議檔案結構

每個卡組是獨立模組（自己的 `cards.json` + 媒體夾），方便首版打包、也方便未來新增卡組讓使用者下載。

專案根目錄即 app（獨立專案：`/Users/fz/claude/kids-vocab-app`）。

```
kids-vocab-app/            # 專案根目錄
├── index.html              # 單頁 App
├── app.js                  # 播放邏輯、換卡、語言切換、卡組下載管理
├── styles.css
├── manifest.json           # PWA：名稱、圖示、橫向、全螢幕
├── sw.js                   # Service Worker：離線快取（殼 + 內建 5 組）
├── decks.json              # 卡組清單/註冊表：內建 5 組 + 可下載的擴充組
├── .env.example            # ElevenLabs key 範本（.env 由 .gitignore 忽略）
├── scripts/gen-audio.mjs   # ElevenLabs 批次語音生成
├── docs/                   # 規劃文件
└── content/
    ├── animals/
    │   ├── cards.json
    │   └── assets/
    │       ├── img/        # 圖片卡 / 影片縮圖 (.webp)
    │       ├── video/      # Grok 生成的短片 (.mp4)
    │       └── audio/{en,zh,ja,vi,bg}/   # ElevenLabs 語音 (.mp3)
    ├── daily/
    ├── colors/
    ├── food/
    └── numbers/
```

- `decks.json`：App 啟動讀此清單渲染首頁卡組；每筆含 `id / title(4語) / cover / bundled(true/false) / url`。首版 5 組 `bundled:true`；未來擴充組 `bundled:false` 並給下載 `url`。

---

## 13. 實作進度（動物組）

獨立專案 `/Users/fz/claude/kids-vocab-app`，已可在平板瀏覽器跑起來（首頁→卡組→單字卡流程、文字顯示、語言切換、語音播放、PWA 離線殼都通了）。

### 已完成
- `index.html` / `styles.css` / `app.js`：完整播放器（媒體 → 英文 0.9x → 英文 0.7x → 翻譯、上/下一張、滑動、語言切換）
- `manifest.json` / `sw.js` / `icon.svg`：PWA，可加到主畫面、離線殼快取
- `decks.json`：首頁卡組清單（動物 + 4 組「即將推出」佔位）
- `content/animals/cards.json`：動物組 10 張（7 單字圖片卡 + 3 簡單句影片卡），含 en/zh/ja/vi/bg 文字
- **語音：50 個 mp3 已生成並驗證播放**（10 卡 × 5 語言，ElevenLabs）
- `scripts/gen-audio.mjs`：批次生成腳本
- **圖片：7 張 `.webp` 已生成**（手寫扁平插畫 SVG → Chrome 點陣化 → cwebp，~6–10KB/張）
- **影片：3 段 `.mp4` + poster 已生成**（SVG 動畫 → Chrome 幀序列 → ffmpeg H.264 baseline，~20–31KB/支，無縫循環）
- `scripts/gen-images.mjs`、`scripts/gen-videos.mjs`：素材生成腳本（純本機、零金鑰）
- `app.js`：影片加 `v.loop = true`，旁白期間影片持續輕柔循環

> 目前圖片/影片為**自製占位插畫/動畫**（風格一致、適齡、完全離線）。日後拿到更好的素材（如 Grok 短片）時，直接覆蓋同名檔即可生效，不需改程式。

### 重新生成素材
```bash
cd /Users/fz/claude/kids-vocab-app
node scripts/gen-images.mjs    # 7 張動物圖 → content/animals/assets/img/<id>.webp
node scripts/gen-videos.mjs    # 3 段動畫 + poster（約 5 分鐘，Chrome 渲染 108 幀）
```
依賴：Chrome（點陣化）、`cwebp`、`ffmpeg`（皆已安裝於本機）。

### 產生語音 / API key 管理
key 只在「製作內容」時用來產生 mp3，**不會被打包進 app、執行時也不會用到**（app 純靜態離線）。

```bash
cd /Users/fz/claude/kids-vocab-app
cp .env.example .env          # 把真正的 key 填進 .env（已被 .gitignore 忽略）
node --env-file=.env scripts/gen-audio.mjs content/animals/cards.json
```
- key 放 `.env`（git 不追蹤），不要寫進任何會 commit 的檔案。
- 已存在的 mp3 會跳過；要重生某語言就刪掉該檔再跑。
- voice id 已內建於腳本（見 §5.1）；未來新卡組 → 新增 `cards.json` 文字後跑同一支腳本即可。

### 本機預覽
```bash
cd /Users/fz/claude/kids-vocab-app && python3 -m http.server 4321
# 開 http://localhost:4321
```

### 素材狀態（動物組已全部備齊占位）
1. ✅ **7 張動物圖片**（bird/cat/dog/fish/rabbit/elephant/duck）— 自製 SVG 插畫
2. ✅ **3 段短影片**（bird-fly / cat-sleep / dog-run）— 自製 SVG 動畫占位；之後可換成 Grok 短片
   - 動物組 10 張卡全部已可正常顯示與播放（已在 preview 驗證：圖片渲染、影片循環播放、無 console 錯誤）
