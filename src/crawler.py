#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI 资讯爬虫模块
每日抓取 10 条 AI 内容：
- GitHub Trending AI (技术动态 2条)
- arXiv 论文 (AI论文 3条)
- Hugging Face 模型 (新产品 3条)
- AI 热点新闻 (行业热点 2条)
"""

import json
import time
import hashlib
import requests
from datetime import datetime, timezone, timedelta
from pathlib import Path

# =============================================================================
# 配置
# =============================================================================
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

DATA_DIR = Path(__file__).parent.parent / "static" / "data"
OUTPUT_FILE = DATA_DIR / "latest.json"

# 分类颜色映射
CATEGORY_COLORS = {
    "技术动态": "#4A90D9",
    "AI论文": "#8B5CF6",
    "新产品": "#10B981",
    "行业热点": "#F59E0B",
}


# =============================================================================
# 工具函数
# =============================================================================
def md5(text: str) -> str:
    """生成 MD5 哈希，用于去重"""
    return hashlib.md5(text.encode("utf-8")).hexdigest()


def fetch(url: str, timeout: int = 15) -> str:
    """带重试的 HTTP 请求"""
    for _ in range(3):
        try:
            resp = requests.get(url, headers=HEADERS, timeout=timeout)
            resp.raise_for_status()
            return resp.text
        except Exception:
            time.sleep(2)
    return ""


def load_existing() -> list:
    """加载已存在的日报，用于去重"""
    existing = []
    if OUTPUT_FILE.exists():
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            existing = data.get("items", [])
    return existing


def is_duplicate(item: dict, seen_hashes: set) -> bool:
    """检查是否重复"""
    h = md5(item.get("title", "") + item.get("url", ""))
    return h in seen_hashes


# =============================================================================
# 爬虫：GitHub Trending AI
# =============================================================================
def crawl_github_trending() -> list:
    """
    抓取 GitHub Trending AI 项目
    来源：https://github.com/trending?since=daily&spoken_language_code=en
    使用 GitHub API 获取 trending repos
    """
    items = []
    try:
        # 使用 GitHub Search API 获取今日 AI 相关热门仓库
        url = (
            "https://api.github.com/search/repositories"
            "?q=AI+OR+LLM+OR+GPT+OR+transformer+created:>2024"
            "&sort=stars&order=desc&per_page=10"
        )
        resp = requests.get(url, headers={**HEADERS, "Accept": "application/vnd.github.v3+json"}, timeout=15)
        if resp.status_code == 200:
            data = resp.json()
            for repo in data.get("items", [])[:4]:
                items.append({
                    "title": repo.get("full_name", ""),
                    "summary": (repo.get("description") or "")[:120],
                    "url": repo.get("html_url", ""),
                    "category": "技术动态",
                    "source": "GitHub",
                    "stars": repo.get("stargazers_count", 0),
                })
    except Exception as e:
        print(f"[GitHub Trending] 抓取失败: {e}")
    return items


# =============================================================================
# 爬虫：arXiv AI 论文
# =============================================================================
def crawl_arxiv() -> list:
    """
    抓取 arXiv 最新 AI 论文
    来源：https://arxiv.org/list/cs.AI/recent
    使用 arXiv API
    """
    items = []
    try:
        # arXiv API: 获取最新 AI 论文
        url = (
            "http://export.arxiv.org/api/query"
            "?search_query=cat:cs.AI+OR+cat:cs.LG+OR+cat:cs.CL"
            "&sortBy=submittedDate&sortOrder=descending&max_results=10"
        )
        resp = requests.get(url, headers=HEADERS, timeout=20)
        if resp.status_code == 200:
            # 简单解析 XML
            text = resp.text
            entries = text.split("<entry>")
            for entry in entries[1:]:
                title = ""
                summary = ""
                link = ""
                # 提取标题
                if "<title>" in entry:
                    title = entry.split("<title>")[1].split("</title>")[0].strip().replace("\n", " ")
                # 提取摘要
                if "<summary>" in entry:
                    summary = entry.split("<summary>")[1].split("</summary>")[0].strip()[:200]
                # 提取链接
                if "<id>" in entry:
                    link = entry.split("<id>")[1].split("</id>")[0].strip()
                if title and link:
                    items.append({
                        "title": title,
                        "summary": summary,
                        "url": link,
                        "category": "AI论文",
                        "source": "arXiv",
                    })
                if len(items) >= 5:
                    break
    except Exception as e:
        print(f"[arXiv] 抓取失败: {e}")
    return items


# =============================================================================
# 爬虫：Hugging Face 模型
# =============================================================================
def crawl_huggingface() -> list:
    """
    抓取 Hugging Face 最新模型
    来源：https://huggingface.co/models
    使用 HF API
    """
    items = []
    try:
        url = "https://huggingface.co/api/models?sort=modified&direction=-1&limit=10"
        resp = requests.get(url, headers=HEADERS, timeout=15)
        if resp.status_code == 200:
            models = resp.json()
            for model in models[:4]:
                name = model.get("modelId", "")
                author = model.get("author", "")
                tags = model.get("tags", [])
                pipeline = model.get("pipeline_tag", "model")
                items.append({
                    "title": name,
                    "summary": f"来自 {author} 的 {pipeline} 模型，标签：{', '.join(tags[:3])}",
                    "url": f"https://huggingface.co/{name}",
                    "category": "新产品",
                    "source": "Hugging Face",
                    "tags": tags[:3],
                })
    except Exception as e:
        print(f"[Hugging Face] 抓取失败: {e}")
    return items


# =============================================================================
# 爬虫：AI 热点新闻（使用多个来源）
# =============================================================================
def crawl_ai_news() -> list:
    """
    抓取 AI 热点新闻
    来源：通过 GitHub AI news 聚合、Reddit r/MachineLearning 等
    """
    items = []
    try:
        # 使用 Hacker News API 获取 AI 相关热点
        # 先搜索 AI 相关故事
        url = "https://hn.algolia.com/api/v1/search?query=AI+OR+LLM+OR+GPT&tags=story&hitsPerPage=10"
        resp = requests.get(url, headers=HEADERS, timeout=15)
        if resp.status_code == 200:
            data = resp.json()
            for hit in data.get("hits", [])[:4]:
                title = hit.get("title", "")
                url_hit = hit.get("url") or f"https://news.ycombinator.com/item?id={hit.get('objectID', '')}"
                points = hit.get("points", 0)
                if title:
                    items.append({
                        "title": title,
                        "summary": f"Hacker News 热点讨论，{points} 点赞",
                        "url": url_hit,
                        "category": "行业热点",
                        "source": "Hacker News",
                        "points": points,
                    })
    except Exception as e:
        print(f"[AI News] 抓取失败: {e}")
    return items


# =============================================================================
# 备用爬虫：当主爬虫失败时补充内容
# =============================================================================
def crawl_github_ai_news() -> list:
    """备用：从 GitHub AI 相关仓库的 README 或 issues 获取动态"""
    items = []
    try:
        # 获取 AI 相关热门仓库的近期活动
        url = (
            "https://api.github.com/search/repositories"
            "?q= machine-learning+OR+deep-learning+OR+neural-network"
            "&sort=updated&order=desc&per_page=5"
        )
        resp = requests.get(url, headers={**HEADERS, "Accept": "application/vnd.github.v3+json"}, timeout=15)
        if resp.status_code == 200:
            data = resp.json()
            for repo in data.get("items", [])[:2]:
                items.append({
                    "title": f"{repo.get('full_name', '')} 更新",
                    "summary": (repo.get("description") or "")[:150],
                    "url": repo.get("html_url", ""),
                    "category": "技术动态",
                    "source": "GitHub",
                    "stars": repo.get("stargazers_count", 0),
                })
    except Exception as e:
        print(f"[GitHub Backup] 抓取失败: {e}")
    return items


def crawl_papers_with_code() -> list:
    """备用：Papers With Code 最新论文"""
    items = []
    try:
        url = "https://paperswithcode.com/api/v1/papers/?format=json&page=1"
        resp = requests.get(url, headers=HEADERS, timeout=15)
        if resp.status_code == 200:
            data = resp.json()
            for paper in data.get("results", [])[:3]:
                items.append({
                    "title": paper.get("title", ""),
                    "summary": (paper.get("abstract") or "")[:200],
                    "url": paper.get("url", ""),
                    "category": "AI论文",
                    "source": "Papers With Code",
                })
    except Exception as e:
        print(f"[Papers With Code] 抓取失败: {e}")
    return items


# =============================================================================
# 主流程：抓取 + 整理 + 去重 + 输出
# =============================================================================
def run_crawler() -> dict:
    """运行爬虫，返回整理后的日报数据"""
    print("=" * 60)
    print("开始抓取 AI 资讯...")
    print("=" * 60)

    # 1. 抓取各来源内容
    github_items = crawl_github_trending()
    arxiv_items = crawl_arxiv()
    hf_items = crawl_huggingface()
    news_items = crawl_ai_news()

    # 备用抓取（如果主爬虫内容不足）
    if len(github_items) < 2:
        github_items += crawl_github_ai_news()
    if len(arxiv_items) < 3:
        arxiv_items += crawl_papers_with_code()

    print(f"\n抓取结果：")
    print(f"  GitHub 技术动态: {len(github_items)} 条")
    print(f"  arXiv 论文: {len(arxiv_items)} 条")
    print(f"  Hugging Face 产品: {len(hf_items)} 条")
    print(f"  AI 热点新闻: {len(news_items)} 条")

    # 2. 去重
    seen_hashes = set()
    existing = load_existing()
    for item in existing:
        seen_hashes.add(md5(item.get("title", "") + item.get("url", "")))

    def deduplicate(items: list) -> list:
        result = []
        for item in items:
            if not is_duplicate(item, seen_hashes):
                h = md5(item.get("title", "") + item.get("url", ""))
                seen_hashes.add(h)
                result.append(item)
        return result

    github_items = deduplicate(github_items)
    arxiv_items = deduplicate(arxiv_items)
    hf_items = deduplicate(hf_items)
    news_items = deduplicate(news_items)

    # 3. 按分类选取固定数量
    # 技术动态 2条、AI论文 3条、新产品 3条、行业热点 2条
    selected = []
    selected += github_items[:2]
    selected += arxiv_items[:3]
    selected += hf_items[:3]
    selected += news_items[:2]

    # 如果某分类数量不足，从其他分类补充（优先保证总数 10 条）
    all_items = github_items + arxiv_items + hf_items + news_items
    while len(selected) < 10 and all_items:
        for item in all_items:
            if not is_duplicate(item, {md5(s.get("title", "") + s.get("url", "")) for s in selected}):
                selected.append(item)
                if len(selected) >= 10:
                    break
        break

    # 截断到 10 条
    selected = selected[:10]

    # 4. 添加通用字段
    now_utc = datetime.now(timezone.utc)
    now_cst = now_utc + timedelta(hours=8)
    date_str = now_cst.strftime("%Y-%m-%d")
    datetime_str = now_cst.strftime("%Y-%m-%d %H:%M:%S")

    for i, item in enumerate(selected, 1):
        item.setdefault("id", i)
        item.setdefault("date", date_str)
        item["color"] = CATEGORY_COLORS.get(item.get("category", ""), "#666")

    # 5. 构建输出
    output = {
        "date": date_str,
        "datetime": datetime_str,
        "total": len(selected),
        "items": selected,
    }

    # 6. 保存到 data/latest.json 和 data/archive/{date}.json
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    archive_file = DATA_DIR / "archive" / f"{date_str}.json"
    archive_file.parent.mkdir(parents=True, exist_ok=True)
    with open(archive_file, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 日报已生成：{len(selected)} 条内容")
    print(f"   输出文件：{OUTPUT_FILE}")
    print(f"   归档文件：{archive_file}")
    return output


if __name__ == "__main__":
    result = run_crawler()
    print("\n生成内容预览：")
    for item in result["items"]:
        print(f"  [{item['category']}] {item['title'][:50]}")
