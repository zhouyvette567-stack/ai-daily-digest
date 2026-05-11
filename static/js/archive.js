/* ===================================================================
   AI 日报 - 历史页逻辑 (archive.js)
   =================================================================== */

(function () {
    "use strict";

    const ARCHIVE_DIR = "./data/archive/";
    const $list    = document.getElementById("archiveList");
    const $loading = document.getElementById("loadingState");
    const $themeBtn = document.getElementById("themeToggle");

    // ── 主题（与首页一致） ────────────────────────────────────────
    function initTheme() {
        const saved = localStorage.getItem("ai-daily-theme");
        if (saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
            document.documentElement.setAttribute("data-theme", "dark");
            $themeBtn.querySelector(".theme-icon").textContent = "☀️";
        }
    }
    function toggleTheme() {
        const isDark = document.documentElement.getAttribute("data-theme") === "dark";
        if (isDark) {
            document.documentElement.removeAttribute("data-theme");
            $themeBtn.querySelector(".theme-icon").textContent = "🌙";
            localStorage.setItem("ai-daily-theme", "light");
        } else {
            document.documentElement.setAttribute("data-theme", "dark");
            $themeBtn.querySelector(".theme-icon").textContent = "☀️";
            localStorage.setItem("ai-daily-theme", "dark");
        }
    }
    initTheme();
    $themeBtn.addEventListener("click", toggleTheme);

    // ── 工具 ────────────────────────────────────────────────────
    function formatDate(dateStr) {
        if (!dateStr) return "";
        const d = new Date(dateStr + "T00:00:00+08:00");
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
    }
    function formatDateCN(dateStr) {
        if (!dateStr) return "";
        const d = new Date(dateStr + "T00:00:00+08:00");
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const wDays = ["周日","周一","周二","周三","周四","周五","周六"];
        return `${y} 年 ${m} 月 ${day} 日 · ${wDays[d.getDay()]}`;
    }
    function escapeHtml(str) {
        const div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
    }

    // ── 加载归档列表 ─────────────────────────────────────────────
    async function loadArchive() {
        try {
            // 尝试从 latest.json 获取所有归档日期列表
            // 由于是纯静态站点，我们通过一个 index.json 或遍历方式获取
            // 这里采用：先尝试加载 archive-index.json，失败则逐个尝试最近 30 天
            const indexResp = await fetch(ARCHIVE_DIR + "index.json?t=" + Date.now());
            if (indexResp.ok) {
                const dates = await indexResp.json();
                renderArchiveList(dates);
                return;
            }
        } catch (_) { /* 忽略 */ }

        // 降级：尝试最近 30 天
        await loadFallbackDates();
    }

    async function loadFallbackDates() {
        const dates = [];
        const today = new Date();
        for (let i = 0; i < 30; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const ds = d.toISOString().split("T")[0];
            dates.push(ds);
        }
        renderArchiveList(dates);
    }

    // ── 渲染归档列表 ─────────────────────────────────────────────
    async function renderArchiveList(dates) {
        $loading.style.display = "none";
        let html = "";

        for (const dateStr of dates) {
            // 尝试加载该日期的数据以获取标题
            try {
                const resp = await fetch(ARCHIVE_DIR + dateStr + ".json?t=" + Date.now());
                if (!resp.ok) continue;
                const data = await resp.json();
                const items = data.items || [];
                const total = data.total || items.length;

                // 分类统计
                const cats = {};
                items.forEach(it => { cats[it.category] = (cats[it.category]||0) + 1; });
                let catBadges = "";
                const catColors = { "技术动态":"#4A90D9","AI论文":"#8B5CF6","新产品":"#10B981","行业热点":"#F59E0B" };
                for (const [c,n] of Object.entries(cats)) {
                    const col = catColors[c] || "#999";
                    catBadges += `<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;color:${col};background:${col}18;margin-right:4px">${c} ${n}</span>`;
                }

                html += `
                <a href="./index.html?date=${dateStr}" class="archive-card">
                    <div class="archive-date">${formatDateCN(dateStr)}</div>
                    <div class="archive-meta">
                        <span>📄 ${total} 条资讯</span>
                        <span style="margin-left:8px">${catBadges}</span>
                    </div>
                    <div class="archive-arrow">→</div>
                </a>`;
            } catch (_) { /* 忽略无效日期 */ }
        }

        if (!html) {
            html = `<div class="empty-state">
                <div class="empty-icon">📭</div>
                <p class="empty-text">暂无历史日报</p>
            </div>`;
        }
        $list.innerHTML = html;
    }

    // ── 启动 ────────────────────────────────────────────────────
    loadArchive();

})();
