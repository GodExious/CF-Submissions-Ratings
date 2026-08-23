<h1 align="center">更新日志</h1>

<p align="center">
  <a href="CHANGELOG.md">English</a> | <strong>简体中文</strong>
</p>

本项目的所有重要更改都将记录在此文件中。

---

### v1.4.1
`2026-08-23 18:00`

- 更改了时间格式，从 `yyyy-mm-dd hh:mm` 切换为 `yyyy/mm/dd hh:mm`，使其更加直观。

---

### v1.4.0
`2026-08-23 17:33`

- 优化了 contest 页面的难度分展示/AC状态展示
- 优化了 hacks 页面的难度分展示
- 优化了 submissions/status 页面的时间格式化和表格布局
- 在 problem 的 tag 增加了题目 rating 颜色显示

---

### v1.3.5
`2026-08-22 23:50`

- 在 `submissions` 页面和 `status` 页面直接显示题目的难度分数，并根据难度带有相应的色彩高亮。
- 题目分数数据通过 Codeforces 官方 API 获取，每天仅在本地更新一次缓存，不会发送过多的网络请求。
