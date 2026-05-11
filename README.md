# 🤖 每日 AI 资讯日报

> 精选全球 AI 领域最新动态，技术前沿、学术论文、新产品、行业热点，每日 10 条，帮你快速把握 AI 脉搏。

![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/USERNAME/REPO/daily-update.yml?label=每日爬虫)
![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-已部署-green)
![License](https://img.shields.io/badge/license-MIT-blue)

## ✨ 特性

- 🕷️ **自动爬虫**：每日自动抓取 GitHub Trending、arXiv 论文、Hugging Face 模型、AI 热点新闻
- 🤖 **AI 整理**：自动生成标题、摘要、分类标签，自动去重
- 📅 **固定 10 条**：每天 exactly 10 条，分类明确
- 🔄 **自动更新**：GitHub Actions 每日自动运行，无需人工操作
- 📱 **响应式设计**：完美适配手机、平板、电脑
- 🌙 **深色模式**：支持一键切换深色/浅色主题
- 📂 **零数据库**：使用 JSON 文件存储，轻量简单

## 📋 内容分类

| 分类 | 数量 | 颜色 | 来源 |
|------|------|------|------|
| 技术动态 | 2 条 | 🔵 蓝色 | GitHub Trending |
| AI 论文 | 3 条 | 🟣 紫色 | arXiv |
| 新产品 | 3 条 | 🟢 绿色 | Hugging Face |
| 行业热点 | 2 条 | 🟠 橙色 | Hacker News |

## 🛠️ 技术栈

- **爬虫**：Python (requests)
- **前端**：纯 HTML + CSS + JavaScript（无框架）
- **自动化**：GitHub Actions
- **部署**：GitHub Pages
- **存储**：JSON 文件（无数据库）

## 🚀 快速开始

### 本地运行爬虫

```bash
pip install -r requirements.txt
python src/crawler.py
```

### 本地预览网站

```bash
# 使用 Python 启动简单 HTTP 服务器
cd static
python -m http.server 8000
# 访问 http://localhost:8000
```

## 📂 项目结构

```
.
├── .github/workflows/   # GitHub Actions 工作流
│   └── daily-update.yml
├── data/                 # 数据目录（Git 跟踪）
│   ├── latest.json       # 最新日报
│   └── archive/         # 历史日报归档
│       ├── index.json    # 归档索引
│       └── YYYY-MM-DD.json
├── src/                  # Python 爬虫脚本
│   ├── crawler.py        # 主爬虫
│   └── gen_archive_index.py  # 归档索引生成器
├── static/               # 前端静态文件（GitHub Pages 部署此目录）
│   ├── index.html       # 首页（今日日报）
│   ├── archive.html     # 历史日报列表
│   ├── about.html       # 关于页面
│   ├── css/style.css    # 全局样式
│   └── js/
│       ├── app.js       # 首页逻辑
│       ├── archive.js   # 历史页逻辑
│       └── about.js     # 关于页逻辑
└── requirements.txt      # Python 依赖
```

## ⚙️ GitHub Actions 自动更新

爬虫通过 GitHub Actions 每日自动运行：

- **运行时间**：每天 UTC 00:00（北京时间 08:00）
- **运行内容**：执行 `src/crawler.py` 抓取最新 AI 资讯
- **自动部署**：更新 `data/` 目录后自动推送到仓库，GitHub Pages 同步更新
- **手动触发**：在 GitHub Actions 页面点击 "Run workflow" 可手动运行

## 📖 数据来源

- 🐙 **GitHub Trending**：热门 AI 开源项目
- 📄 **arXiv**：最新 AI/ML 学术论文
- 🤗 **Hugging Face**：最新 AI 模型和工具
- 🔥 **Hacker News**：AI 行业热点讨论

## 📜 开源协议

MIT License - 欢迎使用和贡献！

## 🙏 致谢

灵感来源于 [Thysrael/Horizon](https://github.com/Thysrael/Horizon)，本项目对其进行了轻量化改造，更专注于简洁和易部署。
