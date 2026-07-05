# My Finance Dashboard — Setup

## 1. Create your Google Sheet
1. Go to Google Sheets and create a new blank sheet.
2. Import `finance_template.csv` (File → Import → Upload), or just copy its columns:
   `Date, Category, Amount, Type, Comment`
   - `Date` — format `YYYY-MM-DD`
   - `Category` — e.g. Salary, Rent, Groceries, Travel, Mutual Fund SIP, Stocks
   - `Amount` — number, no currency symbol (just digits, e.g. `5000`)
   - `Type` — must be exactly `Income`, `Expense`, or `Investment`
   - `Comment` — optional free-text note (can be left blank); shown in the Recent Transactions table
3. Replace the sample rows with your real data. Add new rows any time — the dashboard reads the sheet live, so just refresh the page (or tap "↻ Refresh") after editing.

### How "Investment" is treated
Any row marked `Investment` (SIPs, stocks, FDs, etc.) is counted as money set aside rather than spent. The dashboard splits your savings into:
- **Savings (Investment)** — total of all `Investment` rows
- **Savings (Liquid)** — what's left over: Income − Spends − Investment

Both appear throughout the dashboard (KPI cards, monthly trend chart, the savings-split doughnut, and the Monthly KPIs table), alongside Investment %, Liquid Savings %, and combined Investment + Liquid Savings % (all as a share of income).

## 2. Publish the sheet as CSV
1. In Google Sheets: **File → Share → Publish to web**.
2. Under "Link", choose the specific sheet/tab containing your data.
3. Under the format dropdown, choose **Comma-separated values (.csv)**.
4. Click **Publish** and confirm.
5. Copy the generated link (it will look like
   `https://docs.google.com/spreadsheets/d/e/.../pub?output=csv`).

**On privacy:** "Publish to web" makes the data viewable only to someone who has this exact long, unguessable link — it is not listed publicly, not searchable, and does not appear in your Drive's shared files for others. This is the lightest-weight option for a static, login-free site. It is not equivalent to a password-protected login — anyone who obtains the link could view the data — so don't share the published link itself.

## 3. Configure the app
1. Open `config.js`.
2. Leave the client config as-is; the browser now calls a Netlify Function.
3. In Netlify site settings, add the environment variable `SECRET_GOOGLE_SHEETS_URL` with your published Google Sheet CSV link.
4. Deploy the site.

## 4. Deploy to Netlify
1. Go to [app.netlify.com/drop](https://app.netlify.com/drop).
2. Drag the whole project folder (containing `index.html`, `app.js`, `config.js`, `manifest.json`, `sw.js`, and the `netlify/functions` folder) onto the page.
3. Netlify gives you a live URL immediately — that's your dashboard.
4. In Site settings → Environment variables, add `SECRET_GOOGLE_SHEETS_URL`.
5. (Optional) In Netlify's site settings you can rename the auto-generated subdomain to something more personal.

## Notes
- Currency is formatted in INR (₹) with Indian digit grouping (e.g. ₹1,50,000).
- "Income", "Expenses", and "Net Savings" are used throughout instead of business terms like revenue/profit.
- The monthly chart compares Income vs Expenses; the doughnut chart breaks down spending by category.
- To add more months of history, just keep adding rows — the chart already spans Jan–Dec.
