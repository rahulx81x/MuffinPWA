# 🧁 Muffin PWA — Interactive User Cheatsheet & Guide

Welcome to **Muffin PWA**! This guide provides a visual cheat sheet, calculation formulas, and quick troubleshooting steps for managing your personal finances.

---

## ⚡ Interactive Web Guide

Prefer an interactive browser guide with step tabs and collapsible accordions?
👉 Open **[Muffin Interactive User Guide](public/guide.html)** or visit `/guide.html` on your live deployed app!

---

## 📊 1. Google Sheets Workbook Structure

Muffin reads a single Google Sheets workbook containing **3 fixed tabs**:

```
My Finances Workbook (Google Sheet)
├── 📄 Income Tab
│   └── Columns: Date | Category | Amount | Comment
├── 📄 Expense Tab
│   └── Columns: Date | Category | Amount | Comment
└── 📄 Investment Tab
    └── Columns: Date | Category | Amount | Investment Type | Comment
```

### 📝 Sample Row Data
- **Income**: `2026-08-01`, `Salary`, `75000`, `Monthly credit`
- **Expense**: `2026-08-02`, `Groceries`, `3500`, `Supermarket`
- **Investment**: `2026-08-05`, `Nifty SIP`, `10000`, `Mutual Fund`, `Index Fund`

---

## 🧮 2. Calculation Engine Formulas

\[
\begin{aligned}
\text{Total Income} &= \sum \text{Income rows} \\
\text{Total Spends} &= \sum \text{Expense rows} \\
\text{Counted Investments} &= \sum \text{Investment rows (excluding Provident Fund)} \\
\text{Liquid Balance} &= \text{Opening Balance} + \text{Total Income} - \text{Total Spends} - \text{Counted Investments} \\
\text{Net Worth} &= \text{Liquid Balance} + \text{Initial Investments} + \text{Counted Investments} \\
\text{Provident Fund} &= \sum \text{PF / EPF / PPF rows (tracked separately on More Details card)}
\end{aligned}
\]

---

## 💡 3. Quick Tips & Shortcuts

- **🧮 Formula Calculator**: Type `1200 + 350 * 2` or `1000 * 18%` directly into the Amount input field in the Add modal.
- **📱 1-Tap Category Chips**: Tap any frequent category pill (e.g. *Food*, *Groceries*, *Fuel*) for instant form filling.
- **📊 Touch-Interactive Charts**: Tap any slice on the Donut chart to view portfolio share or tap trend points to view MoM delta tooltips.
- **⚙️ Recipe Settings**: Open header gear → **Recipe** to set your initial opening balance and starting investments.
- **🔒 Amount Masking**: Open header gear → **Mask** to hide sensitive balance numbers when viewing in public.

---

## 📞 Support & Privacy

- **Developer Contact**: `rahulgouri072@gmail.com`
- **Privacy Policy**: [public/privacy.html](public/privacy.html) (`/privacy`)
- **Terms of Service**: [public/terms.html](public/terms.html) (`/terms`)
