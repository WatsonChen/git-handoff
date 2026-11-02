# Sidepact

**前後端與跨端 AI agent 的交接橋樑：透過可追蹤的 Markdown，共享需求、介面變更與處理結果。**

[English](README.md) | 繁體中文

前端 agent 完工 → 產生 `改動.md` → 你透過 Telegram 傳檔 → 後端 agent 讀取並修改 → 產生 `回覆.md` 傳回。

工程師自己開發也能使用。目前版本 **0.4.0**，尚未發布至 npm。工具在本機執行，不會自行呼叫 AI 或傳送文件。

## 哪些內容是自動產生的？

| 工作 | 負責者 |
| --- | --- |
| 辨識目前是哪個專案 | CLI，讀取 Git remote |
| 擷取變動檔案、新增行的 TODO/FIXME | CLI |
| 判斷後端需要補什麼、整理依據與驗收條件 | 前端 agent，或開發者 |
| 產生 Markdown、交接編號與回覆關聯 | CLI |
| 核對需求、實作、驗證並明確回報狀態 | 後端 agent，或開發者 |

**CLI 本身還不會推斷 API 需求或判定工作完成。** 但你的 agent 可以自行分析、填入 `--note` 並呼叫工具，不需要你逐條手打。在各端專案執行一次 `sidepact enable`，即可將跨端檢查規則加入 agent 指令檔。之後讓 agent 重新讀取指令或開啟新對話。這不是完工／push hook，而是由 agent 在任務結束時依規則檢查。

見 [agent 對 agent 的操作指引與可直接使用的提示詞](docs/AGENT_WORKFLOW.md)。

## 1. 工具每台電腦安裝一次

需要 Git 與 Node.js 22.18 以上。把工具放在獨立的工具目錄，不必在每個前後端專案各 clone 一份：

```bash
# 先切換到你放工具的位置，再執行
git clone https://github.com/WatsonChen/sidepact.git
cd sidepact
npm ci
npm link
```

`npm link` 讓其他資料夾也能使用 `sidepact`。這裡 clone 的是工具原始碼，**不是要被分析的前端或後端專案**。之後更新工具時，在這個一般 clone 內執行 `git pull --ff-only` 與 `npm ci`。

## 2. 在真正的專案裡產生交接

```bash
cd /你的前端專案路徑
```

在實際專案一次性啟用 agent 指引：

```bash
sidepact enable
```

之後照常請 agent 開發。讀取規則後，它應在任務結束回報 **無需跨端／需要跨端／待確認**：無跨端需求就簡短說明，有需求或問題才整理依據、驗收條件並產生交接，不必每次再貼整段提示詞。

`enable` 會沿用既有根目錄指令檔，沒有時建立 `AGENTS.md`；也可用 `--agent codex`、`--agent claude`、`--agent copilot` 指定工具。完整啟用、確認與停用方式見 [一次性設定指南](docs/AGENT_SETUP.md)。

**不用 init，不用指定自己，也不用設定接收方。** 工具自動從 Git remote 辨識來源，沒有可用 remote 時使用資料夾名稱。預設是未指定對象的交接，由匯入文件的專案接手；只有想檢查目前辨識結果時才需要 `sidepact info`。

前端 agent 或你完成變動後，在前端 repo 執行：

```bash
sidepact generate --note "需求：實作 POST /api/register；依據：src/api/auth.ts:18 已呼叫；驗收：成功與重複 Email 的回應格式經雙方確認"
```

一個 `--note` 是一個待辦，第一個為 `TASK-001`，擷取的 TODO 接在後面。內容應足夠讓沒有前端 repo 的人理解。指令會顯示 `handoffs/<交接編號>/改動.md` 路徑，把檔案丟給後端即可。

後端 agent 在**後端專案**裡操作；匯入不需要先初始化：

```bash
sidepact import /收到的檔案路徑/改動.md
sidepact show <原始交接編號>

# 實際完成並驗證後才標記完成
sidepact update <原始交接編號> --task TASK-001 --status done --note "已實作並測試；重複 Email 回傳 409"
sidepact reply <原始交接編號> --note "請前端配合處理 HTTP 409"
```

後端把 `handoffs/<回覆編號>/回覆.md` 傳回，前端執行：

```bash
sidepact import /收到的檔案路徑/回覆.md
sidepact show <原始交接編號>
```

請替換 `<原始交接編號>` 整段文字，不要照打角括號。常見問題見 [雙方試用指南](docs/TRY_IT.md)，也可看 [交接範例](examples/handoff.md) 與 [回覆範例](examples/reply.md)。

## 選對 Git 比較範圍

```bash
sidepact generate                         # HEAD 到工作區，包含已暫存與未暫存的已追蹤變動
sidepact generate --staged                # 只有暫存區
sidepact generate --base main             # main 與 HEAD 的共同祖先到 HEAD，只有已提交變動
sidepact generate --base HEAD~1           # 只有最後一個 commit 的變動
sidepact generate --to Example/shop-api --lang en --note "明確的需求" --output ./handoff.md
```

**commit 或 push 後，如果工作區乾淨，預設就沒有可擷取的變動。** 已提交的任務要用 `--base` 指定真正的起點。新檔案先 `git add`，`--base` 不可與 `--staged` 合用。`--note` 可重複使用。目前沒有安裝 push hook 或推送 script。

## 指令與待辦狀態

| 指令 | 功能 |
| --- | --- |
| `enable`／`disable` | 安裝或移除專案中的 handoff agent 指引區塊 |
| `agent-status` | 檢查指引區塊是否已安裝 |
| `info` | 查看真正操作的 repo、來源辨識方式與預設接收方 |
| `init` | 儲存預設值；需要別名時才用 `--project` |
| `generate` | 根據指定 Git 範圍與明確需求產生交接 |
| `import` | 檢查並匯入收到的交接或回覆，依 ID 去重 |
| `list`／`show` | 查看本機紀錄與回覆 |
| `update` | 更新已匯入交接中的一個待辦 |
| `reply` | 產生保留原始待辦編號的回覆 |
| `export` | 將原始文件匯出成 JSON 或 Markdown |

待辦支援 `pending`、`in-progress`、`done`、`blocked`、`needs-clarification`。全部完成時回覆為 `completed`，沒有任務時保持 `pending`。遇到阻礙或不確定的需求，請在 `update`／`reply` 的 `--note` 說明。多個接收方的回覆分開保存，原始交接維持不變。

## 從 git-handoff 改名

新指令是 `sidepact`。舊 `.git-handoff/` 紀錄與 `handoff.config.json` 仍可沿用；新專案使用 `.sidepact/` 與 `sidepact.config.json`。執行 `sidepact enable` 可原地更新舊 agent 指引。若曾使用 `npm link`，更新前請先看 [改名遷移指南](docs/MIGRATION.md)。

## 設定與舊版使用者

新設定通常不需要 `project`，讓工具持續自動辨識：

```json
{
  "targets": [],
  "output": "handoffs",
  "language": "zh-TW"
}
```

- `output` 相對 Git 根目錄；`--output` 相對執行目錄，指向檔案且不覆寫既有產出。
- `language` 支援 `zh-TW`（預設）、`en`；生成時可用 `--lang` 覆蓋。兩種語言預設檔名都是 `改動.md`／`回覆.md`。
- 接收方選填。不指定 `--to` 且沒有預設 targets 時，`to: []` 代表開放交接；匯入時記錄本機接手專案，不改寫原始文件。回覆自動指向原始寄件方。
- 需要限制對象時才用 `generate --to Example/shop-api`；`init --to Example/shop-api` 可保存預設值。既有預設值仍會生效，想改回開放交接時把設定中的 `targets` 改為 `[]`。
- `init` 是選用功能，重跑時保留未指定的設定。
- `project` 是選填別名，例如 `sidepact init --project shop-web`；既有設定的名稱會繼續生效。
- 舊設定要切回自動辨識，可用 `sidepact init --auto-project`，先用 `info` 核對雙方名稱。正在往返的舊交接請先保留原別名，因為舊文件仍使用舊名稱。

本機紀錄在 `.sidepact/records/`，請保留以對應回覆；若不想提交，可自行把 `.sidepact/` 加入專案 `.gitignore`。紀錄、設定檔與設定的輸出目錄都不會被當成改動來源。

## 格式與限制

- 工具以文件檔頭的結構資料為準，內文是閱讀用呈現。請用指令更新，不要直接編輯生成文件。
- TODO 只比對新增行，也可能匹配字串或範例；改動摘要是檔案清單，不是完整 diff 或 AI 解釋。
- HEAD 不包含未提交內容；回覆不會自動附後端 diff，也不代表工具已驗證測試結果。
- `sidepact export <交接編號> --format json --output ./handoff.json` 可匯出可再匯入的原始快照；更新後的待辦用 `reply` 傳送。
- 匯入上限 2 MiB。接收名稱區分大小寫，是流程檢查而非身分驗證；自動名稱省略主機，跨主機撞名時可用明確別名區分。
- 同 ID、相同資料會去重；同 ID、不同資料會拒絕。回覆需對應已保存的交接與原待辦編號、文字。明確指定對象的交接另檢查回覆者是否為指定接收方；開放交接則接受實際接手專案的回覆。
- 第三方串接、CLI 自行呼叫 AI，以及完工／push 自動觸發均往後安排。單一 repo 請一次執行一個寫入操作。

## 開發與回報

```bash
npm run check
npm test
```

[回報問題](https://github.com/WatsonChen/sidepact/issues/new/choose) · [貢獻說明](CONTRIBUTING.md) · [Roadmap](docs/ROADMAP.md) · [修改紀錄](CHANGELOG.md)

目前尚未選定開源授權。
