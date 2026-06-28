# Contoso Sales — Dashboard

Two ready-to-use sales dashboards built from the same sample dataset (1,453 transactions,
2023–2025, ~$3.65M revenue, 36.7% margin). All figures are randomly generated sample data.

## 1. Interactive web dashboard (Power BI style)

A self-contained browser dashboard with KPI cards, charts, slicer-style filters,
click-to-cross-filter, a sortable/paginated table, and CSV export.

| File | Purpose |
|------|---------|
| `index.html` | Layout |
| `styles.css` | Styling |
| `data.js` | Seeded sample-data generator |
| `dashboard.js` | Charts (Chart.js), filters, cross-filtering, table, export |

**View it live:** this repo auto-deploys to GitHub Pages on every push to `main`
(see `.github/workflows/deploy-pages.yml`).

> One-time setup: in **Settings → Pages**, set **Source = GitHub Actions**.
> After the next push, the dashboard is live at
> `https://keovoin.github.io/Excel/`.

To run locally, just open `index.html` in any modern browser.

## 2. Native Excel dashboard

`Contoso_Sales_Dashboard.xlsx` — a real Excel workbook with:

- **Dashboard** sheet: KPI cards, summary tables, and native Excel charts
  (category pie, region/segment bars, top-products bar, monthly revenue/profit line).
- **Data** sheet: the full 1,453-row transaction table as a filterable Excel Table.

Regenerate it from the CSV with:

```bash
pip install openpyxl
python3 build_dashboard.py
```

## Raw data

`contoso_sales_export.csv` — the full dataset (Date, Region, Category, Product,
Segment, Units, Revenue, Profit), properly CSV-escaped.
