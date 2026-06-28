/* ----------------------------------------------------------------
   Sample dataset generator (Contoso-style sales transactions)
   Deterministic seed so the dashboard is reproducible.
-----------------------------------------------------------------*/
(function () {
  // Tiny seeded PRNG (mulberry32) for reproducible "random" data
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rnd = mulberry32(20260628);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const between = (min, max) => min + rnd() * (max - min);

  const regions = ["North America", "Europe", "Asia Pacific", "Latin America", "Middle East"];
  const segments = ["Enterprise", "SMB", "Consumer", "Government"];

  // category -> products with a base price range and margin profile
  const catalog = {
    "Electronics": {
      margin: [0.18, 0.34],
      products: ["Aurora Laptop 14\"", "Nimbus Tablet", "Pulse Smartphone", "Vertex Monitor 27\"", "Echo Wireless Earbuds"]
    },
    "Furniture": {
      margin: [0.10, 0.22],
      products: ["Ergo Office Chair", "Standing Desk Pro", "Modular Bookshelf", "Conference Table XL"]
    },
    "Office Supplies": {
      margin: [0.25, 0.45],
      products: ["Premium Notebook Set", "Ink Cartridge Pack", "Label Printer", "Stapler Deluxe"]
    },
    "Software": {
      margin: [0.55, 0.78],
      products: ["Analytics Suite License", "Security Shield Pro", "Cloud Backup Plan", "Design Studio License"]
    },
    "Accessories": {
      margin: [0.30, 0.50],
      products: ["USB-C Hub", "Mechanical Keyboard", "Laptop Sleeve", "Wireless Mouse"]
    }
  };

  const basePrice = {
    "Aurora Laptop 14\"": 1180, "Nimbus Tablet": 540, "Pulse Smartphone": 820,
    "Vertex Monitor 27\"": 360, "Echo Wireless Earbuds": 140,
    "Ergo Office Chair": 320, "Standing Desk Pro": 560, "Modular Bookshelf": 210, "Conference Table XL": 980,
    "Premium Notebook Set": 28, "Ink Cartridge Pack": 65, "Label Printer": 190, "Stapler Deluxe": 22,
    "Analytics Suite License": 1200, "Security Shield Pro": 640, "Cloud Backup Plan": 240, "Design Studio License": 720,
    "USB-C Hub": 55, "Mechanical Keyboard": 120, "Laptop Sleeve": 35, "Wireless Mouse": 45
  };

  // Region demand multipliers + seasonal growth across years
  const regionWeight = {
    "North America": 1.35, "Europe": 1.15, "Asia Pacific": 1.2,
    "Latin America": 0.8, "Middle East": 0.7
  };
  const yearGrowth = { 2023: 0.85, 2024: 1.0, 2025: 1.18 };

  const categories = Object.keys(catalog);
  const data = [];
  let id = 1;

  for (const year of [2023, 2024, 2025]) {
    // 2025 is partial (Jan–Jun) since "today" is mid-2026 demo; keep full for richness
    for (let month = 0; month < 12; month++) {
      // seasonality: stronger Q4
      const seasonal = 1 + 0.35 * Math.sin(((month - 2) / 12) * Math.PI * 2) + (month >= 9 ? 0.25 : 0);
      const ordersThisMonth = Math.round(between(28, 46) * seasonal * yearGrowth[year]);

      for (let o = 0; o < ordersThisMonth; o++) {
        const category = pick(categories);
        const product = pick(catalog[category].products);
        const region = pick(regions);
        const segment = pick(segments);
        const day = 1 + Math.floor(rnd() * 28);

        const units = Math.max(1, Math.round(between(1, 14) * regionWeight[region] * 0.7));
        const price = basePrice[product] * between(0.9, 1.12);
        let revenue = units * price * yearGrowth[year] * regionWeight[region] * (0.6 + seasonal * 0.4);
        // occasional discount
        const discount = rnd() < 0.25 ? between(0.05, 0.2) : 0;
        revenue = revenue * (1 - discount);
        const [mLo, mHi] = catalog[category].margin;
        const margin = between(mLo, mHi) - discount * 0.4;
        const profit = revenue * margin;

        data.push({
          id: id++,
          date: `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
          year,
          month, // 0-indexed
          region,
          category,
          product,
          segment,
          units,
          revenue: Math.round(revenue),
          profit: Math.round(profit)
        });
      }
    }
  }

  data.sort((a, b) => a.date.localeCompare(b.date));

  window.SALES_DATA = data;
  window.SALES_META = {
    years: [...new Set(data.map(d => d.year))].sort(),
    regions: regions.slice().sort(),
    categories: categories.slice().sort(),
    segments: segments.slice().sort(),
    monthNames: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
  };
})();
