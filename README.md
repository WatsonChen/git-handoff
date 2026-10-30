# git-handoff

把 Git 變動整理成 Markdown 交接文件，讓前端、後端、App 與其他 Repository 交換改動及待辦。

目前是 CLI MVP：可產生文件，不需要 API Key，不會將原始碼傳送到外部服務。

## 開發與安裝

需要 Git 與 Node.js 22.18 以上。

```bash
git clone https://github.com/WatsonChen/git-handoff.git
cd git-handoff
npm ci
npm run check
npm test
npm link
```

尚未發布至 npm；請使用上述本機安裝方式。

## 使用

在要交接的專案內操作：

```bash
handoff init
handoff generate --to shop-api --note "請確認註冊 API 的錯誤格式"
handoff generate --staged --to shop-api --to mobile-app
handoff generate --base main --to shop-api
handoff generate --to shop-api --output ./交接/改動.md
```

預設輸出 `handoffs/<唯一交接編號>/改動.md`。將文件傳給對應專案即可；工具不會自動傳送或修改其他 repo。既有檔案不會被覆寫。

`init` 在 Git 根目錄建立 `handoff.config.json`，可手動編輯：

```json
{
  "project": "shop-web",
  "targets": ["shop-api", "mobile-app"],
  "output": "handoffs"
}
```

`--to` 可重複指定，並取代設定檔的 targets。`output` 相對 repo 根目錄；`--output` 相對目前執行目錄。

## 比較範圍

| 模式 | 內容 |
| --- | --- |
| 預設 | HEAD 到目前工作區，包含已暫存與未暫存的已追蹤檔案 |
| `--staged` | HEAD 到暫存區 |
| `--base main` | main 與 HEAD 的共同祖先到 HEAD，適合功能分支 |

新檔案需先 `git add`；repo 需至少有一個 commit。設定檔與預設交接輸出目錄不列入交接。重新命名以刪除及新增呈現。

## 文件內容與限制

- 唯一交接編號、來源專案、多個接收專案、HEAD commit 與比較模式。
- 變動檔案清單。
- 使用者 `--note` 與差異新增行內 TODO/FIXME，整理為有編號的待辦。
- 待確認與來源說明。

本版沒有 AI 語意摘要或 API 推斷。TODO/FIXME 掃描為文字比對，可能包含字串或文件範例；不是完整的專案待辦清單。請人工補充 API 契約、資料結構與驗收條件。

工作區／暫存區變動可能尚未提交，文件中的 HEAD 不足以還原這些內容；交接前建議先提交變動。產出的文件可能包含內部檔名或待辦文字，傳送前請閱讀。

## 接下來

- `import`：匯入文件並依交接編號去重。
- `reply`：針對交接與待辦編號回覆處理結果。
- 可選的 AI 摘要與 API 契約差異分析。
- GitHub PR 工作流程整合。

歡迎透過 Issues 討論需求與回報問題。授權條款尚待專案擁有者選定。
