# git-handoff

**把 Git 變動與 agent 整理的跨專案需求，產生成可交給另一端 agent 的 Markdown 文件。**

[English](README.md) | 繁體中文

前端 agent 完工 → 產生 `改動.md` → 你透過 Telegram 傳檔 → 後端 agent 讀取並修改 → 產生 `回覆.md` 傳回。

工程師自己開發也能使用。目前版本 **0.2.1**，尚未發布至 npm。工具在本機執行，不會自行呼叫 AI 或傳送文件。

## 哪些內容是自動產生的？

| 工作 | 負責者 |
| --- | --- |
| 辨識目前是哪個專案 | CLI，讀取 Git remote |
| 擷取變動檔案、新增行的 TODO/FIXME | CLI |
| 判斷後端需要補什麼、整理依據與驗收條件 | 前端 agent，或開發者 |
| 產生 Markdown、交接編號與回覆關聯 | CLI |
| 核對需求、實作、驗證並明確回報狀態 | 後端 agent，或開發者 |

**CLI 本身還不會推斷 API 需求或判定工作完成。** 但你的 agent 可以自行分析、填入 `--note` 並呼叫工具，不需要你逐條手打。需先在任務或 agent 指令中要求它完工後交接；目前沒有自動偵測 agent 完工或 push 的觸發機制。

見 [agent 對 agent 的操作指引與可直接使用的提示詞](docs/AGENT_WORKFLOW.md)。

## 1. 工具每台電腦安裝一次

需要 Git 與 Node.js 22.18 以上。把工具放在獨立的工具目錄，不必在每個前後端專案各 clone 一份：

```bash
# 先切換到你放工具的位置，再執行
git clone https://github.com/WatsonChen/git-handoff.git
cd git-handoff
npm ci
npm link
```

`npm link` 讓其他資料夾也能使用 `handoff`。這裡 clone 的是工具原始碼，**不是要被分析的前端或後端專案**。之後更新工具時，在這個一般 clone 內執行 `git pull --ff-only` 與 `npm ci`。

## 2. 切換到真正要交接的專案

```bash
cd /你的前端專案路徑
handoff info
```

`info` 會顯示目前 repo 根目錄與辨識出的名稱，例如 `Example/shop-web`，方便確認操作位置。

工具優先讀 `origin`；沒有 `origin` 時，使用唯一的 remote。HTTPS、SSH 會得到相同的 `owner/repo` 名稱。沒有可用 remote，或多個 remote 無法決定時，才使用資料夾名稱。這些資訊只讀取本機 Git 設定，不會連線伺服器。

**不必再用 `--project` 指定自己。** 後端也可以在自己的 repo 執行 `handoff info`，把顯示的名稱給前端當接收方。

## 3. 儲存預設接收方，選用且只需設定一次

```bash
# Example/shop-api 是對方，不是你目前所在的專案
handoff init --to Example/shop-api --lang zh-TW
```

後續不必重跑 `init`。重跑時會保留未指定的設定，只更新明確提供的選項；多個接收方可重複 `--to`。

`init` 不是必要步驟：不想存設定，也能直接用 `handoff generate --to Example/shop-api`。

## 4. 產生交接並傳檔

前端 agent 或你完成變動後，在前端 repo 執行：

```bash
handoff generate --note "需求：實作 POST /api/register；依據：src/api/auth.ts:18 已呼叫；驗收：成功與重複 Email 的回應格式經雙方確認"
```

一個 `--note` 是一個待辦，第一個為 `TASK-001`，擷取的 TODO 接在後面。內容應足夠讓沒有前端 repo 的人理解。指令會顯示 `handoffs/<交接編號>/改動.md` 路徑，把檔案丟給後端即可。

後端 agent 在**後端專案**裡操作；匯入不需要先初始化：

```bash
handoff info
handoff import /收到的檔案路徑/改動.md
handoff show <原始交接編號>

# 實際完成並驗證後才標記完成
handoff update <原始交接編號> --task TASK-001 --status done --note "已實作並測試；重複 Email 回傳 409"
handoff reply <原始交接編號> --note "請前端配合處理 HTTP 409"
```

後端把 `handoffs/<回覆編號>/回覆.md` 傳回，前端執行：

```bash
handoff import /收到的檔案路徑/回覆.md
handoff show <原始交接編號>
```

請替換 `<原始交接編號>` 整段文字，不要照打角括號。常見問題見 [雙方試用指南](docs/TRY_IT.md)，也可看 [交接範例](examples/handoff.md) 與 [回覆範例](examples/reply.md)。

## 選對 Git 比較範圍

```bash
handoff generate                         # HEAD 到工作區，包含已暫存與未暫存的已追蹤變動
handoff generate --staged                # 只有暫存區
handoff generate --base main             # main 與 HEAD 的共同祖先到 HEAD，只有已提交變動
handoff generate --base HEAD~1           # 只有最後一個 commit 的變動
handoff generate --to Example/shop-api --lang en --note "明確的需求" --output ./handoff.md
```

**commit 或 push 後，如果工作區乾淨，預設就沒有可擷取的變動。** 已提交的任務要用 `--base` 指定真正的起點。新檔案先 `git add`，`--base` 不可與 `--staged` 合用。`--note` 可重複使用。目前沒有安裝 push hook 或推送 script。

## 指令與待辦狀態

| 指令 | 功能 |
| --- | --- |
| `info` | 查看真正操作的 repo、來源辨識方式與預設接收方 |
| `init` | 儲存預設值；需要別名時才用 `--project` |
| `generate` | 根據指定 Git 範圍與明確需求產生交接 |
| `import` | 檢查並匯入收到的交接或回覆，依 ID 去重 |
| `list`／`show` | 查看本機紀錄與回覆 |
| `update` | 更新已匯入交接中的一個待辦 |
| `reply` | 產生保留原始待辦編號的回覆 |
| `export` | 將原始文件匯出成 JSON 或 Markdown |

待辦支援 `pending`、`in-progress`、`done`、`blocked`、`needs-clarification`。全部完成時回覆為 `completed`，沒有任務時保持 `pending`。遇到阻礙或不確定的需求，請在 `update`／`reply` 的 `--note` 說明。多個接收方的回覆分開保存，原始交接維持不變。

## 設定與舊版使用者

新設定通常不需要 `project`，讓工具持續自動辨識：

```json
{
  "targets": ["Example/shop-api"],
  "output": "handoffs",
  "language": "zh-TW"
}
```

- `output` 相對 Git 根目錄；`--output` 相對執行目錄，指向檔案且不覆寫既有產出。
- `language` 支援 `zh-TW`（預設）、`en`；生成時可用 `--lang` 覆蓋。兩種語言預設檔名都是 `改動.md`／`回覆.md`。
- `generate --to` 只改本次接收方；`init --to` 會更新保存的預設值。
- `project` 是選填別名，例如 `handoff init --project shop-web`；既有設定的名稱會繼續生效。
- 舊設定要切回自動辨識，可用 `handoff init --auto-project --to Example/shop-api`，先用 `info` 核對雙方名稱。正在往返的舊交接請先保留原別名，因為舊文件仍使用舊名稱。

本機紀錄在 `.git-handoff/records/`，請保留以對應回覆；若不想提交，可自行把 `.git-handoff/` 加入專案 `.gitignore`。紀錄、設定檔與設定的輸出目錄都不會被當成改動來源。

## 格式與限制

- 工具以文件檔頭的結構資料為準，內文是閱讀用呈現。請用指令更新，不要直接編輯生成文件。
- TODO 只比對新增行，也可能匹配字串或範例；改動摘要是檔案清單，不是完整 diff 或 AI 解釋。
- HEAD 不包含未提交內容；回覆不會自動附後端 diff，也不代表工具已驗證測試結果。
- `handoff export <交接編號> --format json --output ./handoff.json` 可匯出可再匯入的原始快照；更新後的待辦用 `reply` 傳送。
- 匯入上限 2 MiB。接收名稱區分大小寫，是流程檢查而非身分驗證；自動名稱省略主機，跨主機撞名時可用明確別名區分。
- 同 ID、相同資料會去重；同 ID、不同資料會拒絕。回覆需對應已保存的交接與原待辦編號、文字。
- 第三方串接、CLI 自行呼叫 AI，以及完工／push 自動觸發均往後安排。單一 repo 請一次執行一個寫入操作。

## 開發與回報

```bash
npm run check
npm test
```

[回報問題](https://github.com/WatsonChen/git-handoff/issues/new/choose) · [貢獻說明](CONTRIBUTING.md) · [Roadmap](docs/ROADMAP.md)

目前尚未選定開源授權。
