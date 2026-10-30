# git-handoff

**把 Git 變動整理成 Markdown 交接清單，讓不同 Repository 的開發者交換待辦與處理結果。**

[English](README.md) | 繁體中文

前端產生 `.md` → 透過 Telegram 等對話框傳給後端 → 後端匯入並更新待辦 → 產生回覆 `.md` 傳回。

目前是 **0.2 CLI MVP**，可在本機完成上述流程，不需要 AI 帳號，不會自動傳送任何文件。尚未發布至 npm。

## 現在可以做什麼

| 指令 | 功能 |
| --- | --- |
| `init` | 設定這個 repo 的專案名稱與文件語言 |
| `generate` | 列出 Git 變動檔案，擷取新增行的 TODO/FIXME 與自訂待辦 |
| `import` | 匯入收到的交接或回覆，檢查接收對象並依 ID 去重 |
| `list`／`show` | 查詢本機紀錄、待辦與收到的回覆 |
| `update` | 明確更新收到的待辦狀態及說明 |
| `reply` | 產生對應原始交接與待辦編號的回覆文件 |
| `export` | 將原始文件匯出為 Markdown 或 JSON |

**目前不會自動解釋程式碼語意、推斷 API 需求或判定工作完成。**「改動摘要」是檔案清單；待辦來自 `--note` 與新增行中的 TODO/FIXME。API 欄位、錯誤格式、驗收條件請用 `--note` 明確補充。

## 安裝

雙方都需要 Git、Node.js 22.18 以上：

```bash
git clone https://github.com/WatsonChen/git-handoff.git
cd git-handoff
npm ci
npm link
```

之後在一般 clone 的工具目錄內執行 `git pull --ff-only` 與 `npm ci` 可更新。若不使用 `npm link`，可用 `node /工具的絕對路徑/bin/handoff.js` 代替 `handoff`。

## 前端交接給後端，再接收回覆

### 1. 前端產生交接

在前端專案內操作，該 repo 需至少有一個 commit：

```bash
# 初始化只需執行一次；名稱需與接收方約定一致
handoff init --project shop-web --lang zh-TW

# 先完成程式改動；新檔案請先 git add
handoff generate --to shop-api --note "確認註冊 API 的請求、回應與錯誤欄位"
```

指令會顯示交接編號與 `handoffs/<交接編號>/改動.md` 的路徑。將 `.md` 透過 Telegram 傳給後端。上述備註是 `TASK-001`，擷取到的 TODO 會接在後面。

### 2. 後端匯入、處理並回覆

在後端專案內操作：

```bash
handoff init --project shop-api --lang zh-TW
handoff import /收到的檔案路徑/改動.md
handoff list
handoff show <原始交接編號>

# 實際完成並驗證後，再記錄狀態
handoff update <原始交接編號> --task TASK-001 --status done --note "已完成 POST /api/register；Email 重複回傳 409"

# 希望回覆的 HEAD 對應實作時，請先提交後端改動
handoff reply <原始交接編號> --note "請確認前端已處理 HTTP 409"
```

把產生的 `handoffs/<回覆編號>/回覆.md` 傳回前端。回覆會保留全部原始待辦編號、當前狀態、說明與後端 HEAD，但不會自動附上後端 diff。

### 3. 前端查看回覆

```bash
handoff import /收到的檔案路徑/回覆.md
handoff show <原始交接編號>
```

原始交接畫面會附上收到的回覆。多個 repo 的回覆分開保存；其中一方完成不代表其他方完成。同一方再次回覆會另存快照，依匯入順序顯示。

更短的步驟與常見問題見 [雙方試用指南](docs/TRY_IT.md)。可直接閱讀 [實際產出的交接](examples/handoff.md) 與 [回覆](examples/reply.md)。

## Git 比較範圍

```bash
# 預設：HEAD 到目前工作區，包含已暫存與未暫存的已追蹤變動
handoff generate --to shop-api

# 只有暫存區
handoff generate --staged --to shop-api --to mobile-app

# main 與 HEAD 的共同祖先到 HEAD，只有已提交變動
handoff generate --base main --to shop-api

# 自訂文件語言與檔案路徑；--note 可重複指定
handoff generate --to shop-api --lang en --note "確認錯誤欄位" --output ./handoff.md
```

`--base` 與 `--staged` 不可合用。新檔案需先暫存；重新命名視為刪除與新增。二進位或刪除檔案會列出檔名，不會從舊內容猜測待辦。

## 待辦狀態與本機紀錄

`update` 用於已匯入的交接：

```bash
handoff update <交接編號> --task TASK-001 --status in-progress
handoff update <交接編號> --task TASK-001 --status blocked --note "等待確認回應格式"
handoff update <交接編號> --task TASK-001 --status needs-clarification --note "Email 重複是否回傳 409？"
```

支援 `pending`、`in-progress`、`done`、`blocked`、`needs-clarification`。全部任務完成時回覆為 `completed`；沒有待辦時保持 `pending`。工具不會根據 Git 變動自行判定完成。

紀錄保存在每個 repo 根目錄的 `.git-handoff/records/`，包含發出的文件與收到的回覆。完成交接前請保留此目錄，勿手動修改；若只想保留在本機，可自行將 `.git-handoff/` 加進專案的 `.gitignore`。

原始交接是不可變的快照，接收方的回覆另外保存。`export` 匯出原始快照；要傳送更新後的狀態請用 `reply`。

## 設定

`init` 會在 Git 根目錄建立 `handoff.config.json`，不覆寫既有設定：

```json
{
  "project": "shop-web",
  "targets": ["shop-api", "mobile-app"],
  "output": "handoffs",
  "language": "zh-TW"
}
```

- `project` 需與寄件方使用的接收名稱一致；未設定時使用 repo 資料夾名稱。
- `--to` 可重複指定，並取代設定中的 targets。名稱只是交接標籤，不會連線其他 repo。
- `output` 相對 repo 根目錄，預設為 `handoffs`。
- `--output` 是相對執行目錄的檔案路徑，不覆寫既有檔案。
- `language` 支援 `zh-TW`、`en`，預設繁體中文；產生交接或回覆時可用 `--lang` 覆蓋。兩種語言預設檔名皆為 `改動.md`／`回覆.md`。

設定檔、設定的輸出目錄與 `.git-handoff/` 都不會被當成交接來源。

## 文件格式與匯出

新文件使用 `schema_version: 1`，檔頭保存寄件方、接收方、HEAD、待辦、備註等資料。回覆另有 `reply_to` 對應原始交接。工具以檔頭資料為準，內文是可閱讀的呈現；請使用指令更新，不要手動編輯生成文件。舊版 0.1 無 schema 的文件也能匯入，保留原待辦編號。

```bash
handoff export <交接編號> --format json --output ./handoff.json
handoff export <交接編號> --format markdown --output ./copy.md
```

兩種格式都能匯入。同 ID、相同資料會去重；同 ID、不同資料會拒絕匯入。回覆需對應已保存的原始交接、約定的接收方及原始待辦編號與文字。這些是流程檢查，不是寄件者身分驗證。

## 限制與後續

- TODO/FIXME 是新增行的文字比對，可能匹配字串或範例；不包含未變動與刪除的 TODO。
- 檔案清單不等於程式碼語意摘要；API 契約與驗收條件需由人提供。
- HEAD 無法還原未提交內容；完成狀態是開發者的回報，不代表工具驗證了實作或測試。
- 文件需手動傳送，沒有 Telegram、Notion、Slack、Asana 或 Jira API 整合。
- 匯入上限 2 MiB；分享前請檢查檔名與備註內容。
- 本機紀錄用於對應原始交接，單一 repo 請一次執行一個寫入操作。

目前優先確保 Markdown 內容正確、步驟清楚，並根據真實前後端試用調整。第三方整合與 AI 往後安排，見 [Roadmap](docs/ROADMAP.md)。

## 開發與回報

```bash
npm run check
npm test
```

[回報問題](https://github.com/WatsonChen/git-handoff/issues/new/choose) 時，請附預期及實際輸出。貢獻方式見 [CONTRIBUTING.md](CONTRIBUTING.md)。目前尚未選定開源授權。
