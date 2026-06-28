/* ----------------------------------------------------------------
   Power BI–style dashboard logic
-----------------------------------------------------------------*/
(function () {
  const DATA = window.SALES_DATA;
  const META = window.SALES_META;

  // ---- Theme palette ----
  const C = {
    brand: "#2b6cff", brand2: "#00b8a9", accent: "#f2c037",
    purple: "#9b5de5", pink: "#f15bb5", ink: "#1b1f2a", muted: "#6b7280", grid: "#eef0f6"
  };
  const SERIES = [C.brand, C.brand2, C.accent, C.purple, C.pink, "#ff7a59", "#3ddc97", "#5b8def"];

  Chart.defaults.font.family = "Inter, 'Segoe UI', system-ui, sans-serif";
  Chart.defaults.color = C.muted;
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.boxWidth = 8;

  // ---- State ----
  const state = { year: "all", region: "all", category: "all", segment: "all" };
  let page = 0;
  const pageSize = 12;
  let sortKey = "date", sortDir = -1;

  // ---- Formatting helpers ----
  const fmtMoney = (n) => "$" + Math.round(n).toLocaleString("en-US");
  const fmtMoneyShort = (n) => {
    const abs = Math.abs(n);
    if (abs >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M";
    if (abs >= 1e3) return "$" + (n / 1e3).toFixed(0) + "K";
    return "$" + Math.round(n);
  };
  const fmtInt = (n) => Math.round(n).toLocaleString("en-US");

  // ---- Filtering ----
  function applyFilters(rows, opts = {}) {
    return rows.filter(d =>
      (opts.year ?? state.year) === "all" || d.year === +(opts.year ?? state.year)
    ).filter(d =>
      state.region === "all" || d.region === state.region
    ).filter(d =>
      state.category === "all" || d.category === state.category
    ).filter(d =>
      state.segment === "all" || d.segment === state.segment
    );
  }

  function sumBy(rows, key) {
    return rows.reduce((s, d) => s + d[key], 0);
  }
  function groupSum(rows, groupKey, valueKey) {
    const m = new Map();
    for (const d of rows) m.set(d[groupKey], (m.get(d[groupKey]) || 0) + d[valueKey]);
    return m;
  }

  // ---- Populate filter dropdowns ----
  function fillSelect(id, items) {
    const sel = document.getElementById(id);
    for (const it of items) {
      const opt = document.createElement("option");
      opt.value = it; opt.textContent = it;
      sel.appendChild(opt);
    }
  }
  fillSelect("filter-year", META.years);
  fillSelect("filter-region", META.regions);
  fillSelect("filter-category", META.categories);
  fillSelect("filter-segment", META.segments);

  document.getElementById("updated-date").textContent =
    new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  // ---- KPIs (with comparison to previous year when a year is selected) ----
  function renderKPIs(rows) {
    const revenue = sumBy(rows, "revenue");
    const profit = sumBy(rows, "profit");
    const orders = rows.length;
    const margin = revenue ? (profit / revenue) * 100 : 0;
    const aov = orders ? revenue / orders : 0;

    document.getElementById("kpi-revenue").textContent = fmtMoneyShort(revenue);
    document.getElementById("kpi-profit").textContent = fmtMoneyShort(profit);
    document.getElementById("kpi-orders").textContent = fmtInt(orders);
    document.getElementById("kpi-margin").textContent = margin.toFixed(1) + "%";
    document.getElementById("kpi-aov").textContent = fmtMoney(aov);

    // Deltas vs previous year (only meaningful if a single year chosen)
    let prevRows = null;
    if (state.year !== "all") {
      const prevYear = +state.year - 1;
      if (META.years.includes(prevYear)) {
        prevRows = applyFilters(DATA, { year: prevYear });
      }
    }
    setDelta("kpi-revenue-delta", revenue, prevRows ? sumBy(prevRows, "revenue") : null);
    setDelta("kpi-profit-delta", profit, prevRows ? sumBy(prevRows, "profit") : null);
    setDelta("kpi-orders-delta", orders, prevRows ? prevRows.length : null);
    const prevMargin = prevRows && sumBy(prevRows, "revenue") ? (sumBy(prevRows, "profit") / sumBy(prevRows, "revenue")) * 100 : null;
    setDelta("kpi-margin-delta", margin, prevMargin, true);
    const prevAov = prevRows && prevRows.length ? sumBy(prevRows, "revenue") / prevRows.length : null;
    setDelta("kpi-aov-delta", aov, prevAov);
  }

  function setDelta(id, current, previous, isPoints = false) {
    const el = document.getElementById(id);
    if (previous == null || previous === 0) {
      el.textContent = "— vs prior yr";
      el.className = "kpi-delta";
      return;
    }
    const diff = isPoints ? (current - previous) : ((current - previous) / previous) * 100;
    const up = diff >= 0;
    el.className = "kpi-delta " + (up ? "up" : "down");
    const val = isPoints ? Math.abs(diff).toFixed(1) + " pts" : Math.abs(diff).toFixed(1) + "%";
    el.textContent = (up ? "▲ " : "▼ ") + val + " vs prior yr";
  }

  // ---- Charts ----
  let charts = {};

  function buildTrend(rows) {
    // group revenue & profit by year-month label
    const labels = [], rev = [], prof = [];
    const yrs = state.year === "all" ? META.years : [+state.year];
    for (const y of yrs) {
      for (let m = 0; m < 12; m++) {
        const sub = rows.filter(d => d.year === y && d.month === m);
        if (state.year === "all" && sub.length === 0 && y === META.years[META.years.length - 1]) continue;
        labels.push(META.monthNames[m] + (yrs.length > 1 ? " '" + String(y).slice(2) : ""));
        rev.push(sumBy(sub, "revenue"));
        prof.push(sumBy(sub, "profit"));
      }
    }
    const ctx = document.getElementById("trendChart");
    const cfg = {
      type: "line",
      data: {
        labels,
        datasets: [
          { label: "Revenue", data: rev, borderColor: C.brand, backgroundColor: hexA(C.brand, .12), fill: true, tension: .35, borderWidth: 2.5, pointRadius: 0, pointHoverRadius: 5 },
          { label: "Profit", data: prof, borderColor: C.brand2, backgroundColor: hexA(C.brand2, .10), fill: true, tension: .35, borderWidth: 2.5, pointRadius: 0, pointHoverRadius: 5 }
        ]
      },
      options: baseOpts({
        scales: {
          x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } },
          y: { grid: { color: C.grid }, ticks: { callback: v => fmtMoneyShort(v) } }
        },
        plugins: { tooltip: { callbacks: { label: c => c.dataset.label + ": " + fmtMoney(c.parsed.y) } } }
      })
    };
    upsert("trend", ctx, cfg);
  }

  function buildBar(key, canvasId, name, color, clickKey) {
    return function (rows) {
      const m = groupSum(rows, key, "revenue");
      const entries = [...m.entries()].sort((a, b) => b[1] - a[1]);
      const labels = entries.map(e => e[0]);
      const vals = entries.map(e => e[1]);
      const ctx = document.getElementById(canvasId);
      const cfg = {
        type: "bar",
        data: { labels, datasets: [{ label: name, data: vals, backgroundColor: labels.map((_, i) => SERIES[i % SERIES.length]), borderRadius: 6, maxBarThickness: 38 }] },
        options: baseOpts({
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: c => fmtMoney(c.parsed.y ?? c.parsed.x) } }
          },
          scales: {
            x: { grid: { display: false } },
            y: { grid: { color: C.grid }, ticks: { callback: v => fmtMoneyShort(v) } }
          },
          onClick: (e, els) => {
            if (!els.length) return;
            const label = labels[els[0].index];
            const filterId = clickKey;
            state[filterId] = (state[filterId] === label) ? "all" : label;
            document.getElementById("filter-" + filterId).value = state[filterId];
            render();
          }
        })
      };
      upsert(canvasId, ctx, cfg);
    };
  }

  function buildSegment(rows) {
    const m = groupSum(rows, "segment", "revenue");
    const entries = [...m.entries()].sort((a, b) => b[1] - a[1]);
    const ctx = document.getElementById("segmentChart");
    const cfg = {
      type: "doughnut",
      data: { labels: entries.map(e => e[0]), datasets: [{ data: entries.map(e => e[1]), backgroundColor: SERIES, borderWidth: 2, borderColor: "#fff", hoverOffset: 8 }] },
      options: baseOpts({
        cutout: "62%",
        plugins: {
          legend: { position: "bottom" },
          tooltip: { callbacks: { label: c => c.label + ": " + fmtMoney(c.parsed) } }
        },
        onClick: (e, els) => {
          if (!els.length) return;
          const label = entries[els[0].index][0];
          state.segment = (state.segment === label) ? "all" : label;
          document.getElementById("filter-segment").value = state.segment;
          render();
        }
      })
    };
    upsert("segment", ctx, cfg);
  }

  function buildProducts(rows) {
    const m = groupSum(rows, "product", "revenue");
    const entries = [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    const ctx = document.getElementById("productChart");
    const cfg = {
      type: "bar",
      data: { labels: entries.map(e => e[0]), datasets: [{ label: "Revenue", data: entries.map(e => e[1]), backgroundColor: hexA(C.brand, .85), borderRadius: 6, maxBarThickness: 24 }] },
      options: baseOpts({
        indexAxis: "y",
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => fmtMoney(c.parsed.x) } } },
        scales: {
          x: { grid: { color: C.grid }, ticks: { callback: v => fmtMoneyShort(v) } },
          y: { grid: { display: false } }
        }
      })
    };
    upsert("product", ctx, cfg);
  }

  // chart helpers
  function baseOpts(extra) {
    return Object.assign({
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 500 },
      interaction: { intersect: false, mode: "index" }
    }, extra);
  }
  function upsert(key, ctx, cfg) {
    if (charts[key]) { charts[key].destroy(); }
    charts[key] = new Chart(ctx, cfg);
  }
  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }

  const buildCategory = buildBar("category", "categoryChart", "Revenue", C.brand, "category");
  const buildRegion = buildBar("region", "regionChart", "Revenue", C.brand2, "region");

  // ---- Table ----
  let tableRows = [];
  function renderTable(rows) {
    tableRows = rows.slice().sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (typeof av === "number") return (av - bv) * sortDir;
      return String(av).localeCompare(String(bv)) * sortDir;
    });
    document.getElementById("row-count").textContent = fmtInt(tableRows.length);
    const maxPage = Math.max(0, Math.ceil(tableRows.length / pageSize) - 1);
    if (page > maxPage) page = maxPage;
    const slice = tableRows.slice(page * pageSize, page * pageSize + pageSize);

    const segColors = { Enterprise: C.brand, SMB: C.brand2, Consumer: C.accent, Government: C.purple };
    const tbody = document.querySelector("#dataTable tbody");
    tbody.innerHTML = slice.map(d => `
      <tr>
        <td>${d.date}</td>
        <td>${d.region}</td>
        <td>${d.category}</td>
        <td>${d.product}</td>
        <td><span class="pill" style="background:${hexA(segColors[d.segment] || C.muted, .14)};color:${segColors[d.segment] || C.muted}">${d.segment}</span></td>
        <td class="num">${fmtInt(d.units)}</td>
        <td class="num">${fmtMoney(d.revenue)}</td>
        <td class="num" style="color:${d.profit >= 0 ? '#16a34a' : '#dc2626'}">${fmtMoney(d.profit)}</td>
      </tr>`).join("");

    document.getElementById("page-info").textContent = `Page ${page + 1} of ${maxPage + 1}`;
    document.getElementById("prev-page").disabled = page === 0;
    document.getElementById("next-page").disabled = page >= maxPage;
  }

  // ---- Filter note ----
  function renderNote() {
    const parts = [];
    if (state.year !== "all") parts.push(state.year);
    if (state.region !== "all") parts.push(state.region);
    if (state.category !== "all") parts.push(state.category);
    if (state.segment !== "all") parts.push(state.segment);
    document.getElementById("active-filter-note").textContent =
      parts.length ? "Filtered: " + parts.join(" · ") : "Showing all data";
  }

  // ---- Master render ----
  function render() {
    const rows = applyFilters(DATA);
    renderKPIs(rows);
    buildTrend(rows);
    buildCategory(rows);
    buildRegion(rows);
    buildSegment(rows);
    buildProducts(rows);
    renderTable(rows);
    renderNote();
  }

  // ---- Events ----
  ["year", "region", "category", "segment"].forEach(k => {
    document.getElementById("filter-" + k).addEventListener("change", e => {
      state[k] = e.target.value; page = 0; render();
    });
  });
  document.getElementById("reset-filters").addEventListener("click", () => {
    Object.assign(state, { year: "all", region: "all", category: "all", segment: "all" });
    ["year", "region", "category", "segment"].forEach(k => document.getElementById("filter-" + k).value = "all");
    page = 0; render();
  });
  document.getElementById("prev-page").addEventListener("click", () => { if (page > 0) { page--; renderTable(applyFilters(DATA)); } });
  document.getElementById("next-page").addEventListener("click", () => { page++; renderTable(applyFilters(DATA)); });

  document.querySelectorAll("#dataTable thead th").forEach(th => {
    th.addEventListener("click", () => {
      const key = th.dataset.key;
      if (sortKey === key) sortDir *= -1; else { sortKey = key; sortDir = 1; }
      renderTable(applyFilters(DATA));
    });
  });

  document.getElementById("export-csv").addEventListener("click", () => {
    const rows = applyFilters(DATA);
    const header = ["Date", "Region", "Category", "Product", "Segment", "Units", "Revenue", "Profit"];
    const esc = (v) => { v = String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    const csv = [header.join(",")].concat(
      rows.map(d => [d.date, d.region, d.category, d.product, d.segment, d.units, d.revenue, d.profit].map(esc).join(","))
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "contoso_sales_export.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  });

  // ---- Go ----
  render();
})();
