#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成归档索引文件 data/archive/index.json
此脚本列出 data/archive/ 目录下所有日期文件，供前端历史页读取。
"""

import json
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"
ARCHIVE_DIR = DATA_DIR / "archive"
INDEX_FILE = ARCHIVE_DIR / "index.json"


def gen_index():
    ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)
    dates = []
    for f in sorted(ARCHIVE_DIR.glob("*.json"), reverse=True):
        if f.name == "index.json":
            continue
        date_str = f.stem  # 文件名即日期 YYYY-MM-DD
        dates.append(date_str)

    with open(INDEX_FILE, "w", encoding="utf-8") as fp:
        json.dump(dates, fp, ensure_ascii=False, indent=2)
    print(f"✅ 归档索引已生成：{len(dates)} 个日期 → {INDEX_FILE}")


if __name__ == "__main__":
    gen_index()
