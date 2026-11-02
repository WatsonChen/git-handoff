# 實際使用情境

[English](EXAMPLES.md) · [回到 README](../README.zh-TW.md)

以下業務情境是虛構範例，Markdown 檔案由 Sidepact CLI 在臨時 Git repo 實際產生。範例中的完成狀態與驗證說明是模擬開發者的回報，不代表 CLI 實作或測試了 API。

工具已安裝，且前後端在自己的實際專案各執行一次 `sidepact enable`，並讓 agent 讀取指引。**日常不必重貼所有指令、不必設定接收方**。下方 CLI 是 agent 在背後操作的範例，開發者自己操作時也能照用。

## 例一：前端需要頭像欄位，要交給後端配合

### 你對前端 agent 說

> 幫會員頁加上頭像，沒有頭像時顯示預設圖。

### 前端 agent 檢查並判斷

本情境中，agent 能查看前端需求與已追蹤的回應契約：

```ts
// contracts/profile.ts:1 — 本情境的既有契約
export type ProfileResponse = { name: string };

// src/profile.ts:3 — 會員頁需要的顯示資料
export type DisplayProfile = { name: string; avatarUrl: string | null };
```

判斷：**需要跨端**。要擴充目前已知的介面契約；實際後端是否已有其他頭像欄位，仍由接收方核對。Agent 不會只因前端缺欄位就斷言後端一定沒做。

Agent 準備一項完整待辦，包含需求、上述依據、建議型別與驗收條件，再操作：

```bash
# 在前端 repo；此例的任務改動尚未提交
sidepact generate --note "[required] 擴充 GET /api/me 頭像回應；依據：會員頁需要 avatarUrl，而既有契約只有 name；建議：string 或 null；驗收：有頭像與無頭像兩種情境；請後端核對實作"
```

Agent 最後回報的內容應類似：

> 需要後端配合。我已整理頭像回應契約需求；交接位於 `handoffs/<交接編號>/改動.md`。請把檔案交給後端，回應欄位與無頭像行為需雙方確認。

### 你實際拿到什麼

直接閱讀 [此情境產生的完整改動.md](../examples/avatar/改動.md)。這份文件的可讀部分包含：

```markdown
# 變動交接

接收方：未指定，由匯入此文件的專案接手。

## 本次改動

- src/profile.ts

## 待處理

- [ ] [TASK-001] \[required\] 需求：擴充 GET /api/me 的頭像回應契約；依據：src/profile.ts:3 需要 avatarUrl，但本情境的 contracts/profile.ts:1 尚未定義；建議：avatarUrl 為 string 或 null；驗收：有頭像與無頭像兩種情境均可顯示；接收方仍需核對實際後端實作 (pending)
```

上面節錄閱讀區塊；完整檔案還包含工具需要的檔頭資料。**請傳送完整 `.md` 檔，不要只複製畫面上的待辦文字。** 檔案已在前端專案裡，直接拖進 Telegram 即可，不必從網站下載。

### 後端如何接手

你把文件傳給後端，後端對自己的 agent 說：

> 請處理這份 Sidepact 交接，核對現有 API 後實作；完成並驗證後產生回覆，有不確定的地方先提問。

後端 agent 在後端 repo 操作：

```bash
sidepact import /收到的檔案/改動.md
sidepact show <原始交接編號>

# 完成實作與適當驗證後才記錄 done；把結果換成實際觀察
sidepact update <原始交接編號> --task TASK-001 --status done --note "實際回應欄位、型別、空值處理與已執行的驗證"
sidepact reply <原始交接編號> --note "前端應配合的處理與剩餘問題"
```

可閱讀 [完整回覆.md](../examples/avatar/回覆.md)。它保留相同的 `TASK-001`，並用 `reply_to` 指向原始交接；回覆檔有自己的新編號。

### 前端收到回覆

你把後端的 `回覆.md` 給前端 agent，請它匯入並核對：

```bash
sidepact import /收到的檔案/回覆.md
sidepact show <原始交接編號>
```

前端 agent 讀取後端實際回報，確認欄位一致、補上空值時的預設圖。這裡完成一輪「前端 → 後端 → 前端」。Sidepact 不會替另一端修改程式或自動傳送文件。

## 例二：只看到 mock，還不能確定後端缺欄位

### 你對前端 agent 說

> 幫會員頁加上頭像。

Agent 只看到：

```ts
// src/profile.ts:2
export const mockProfile = { name: "Example" };
```

看不到正式 API 回應或共同契約。這時應判斷為 **待確認**，而不是直接要求後端新增欄位。

Agent 產生問題：

```bash
sidepact generate --note "[needs-confirmation] GET /api/me 是否已有頭像欄位？目前只有前端 mock，無法確認正式 API；請確認欄位名稱、型別與無頭像行為，不要先假設需新增 avatarUrl"
```

完整文件見 [待確認情境的改動.md](../examples/confirmation/改動.md)。`[needs-confirmation]` 是 agent 提供的任務文字標記；初始待辦狀態仍是 `pending`，不是工具自動判定後端缺功能。

後端核對後，可能回覆「其實已有 `profileImage`，前端改用即可」，也可能確認需要新增。需進一步討論時，後端可先回報：

```bash
sidepact update <原始交接編號> --task TASK-001 --status needs-clarification --note "實際查到的契約與需要前端確認的問題"
sidepact reply <原始交接編號> --note "欄位核對結果與後續安排"
```

先取得事實，再決定哪一端修改，避免雙方 agent 根據不同假設各做一套。

## 例三：只改排版，不需要跨端

### 你對 agent 說

> 把會員頁按鈕置中，調整手機版間距。

Agent 核對 diff，發現只有 CSS 和排版，沒有新的 API、欄位、事件或外部能力需求。

它應回報：

> 無需跨端。本次僅調整排版，沿用既有介面，不產生交接文件。

**不應為這次任務執行 `sidepact generate`。** 判斷來自 agent，不是 CLI 自動分析 CSS。先前已存在的交接與歷史也不應被刪掉。

## 常見使用細節

- 所有 `<原始交接編號>` 都要換成實際 ID，不含角括號；agent 可從產出或 `sidepact list` 取得。
- 已 commit 的改動不能用乾淨工作區的預設比較；應使用 `--base <實際任務起點>`。此處 `<...>` 是佔位符。
- 新檔案需要依專案流程先 `git add`；Sidepact 不會自行暫存或提交。
- 每次生成都是新快照，不覆寫原交接；保存 `.sidepact/`（舊專案可能是 `.git-handoff/`）才能對應回覆。
- agent 若沒有載入規則，不會只因工具已安裝就知道要產生文件。確認 `sidepact agent-status`，並重新讀取指令或開新對話。
