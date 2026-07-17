// Fetch data from your published Google Sheet (CSV)
let allTransactions = [];
let plannerTransactions = [];
let maskValuesOn = false;
let activeDashboard = 'overview';

function isOverviewMasked() {
    return activeDashboard === 'overview' && maskValuesOn;
}

function getDisplayCurrency(amount, suffix = '') {
    if (isOverviewMasked()) {
        return suffix ? `•••• ${suffix}`.trim() : '••••';
    }

    const formatted = formatCurrency(amount);
    return suffix ? `${formatted} ${suffix}` : formatted;
}

function getDisplaySignedCurrency(amount) {
    if (isOverviewMasked()) {
        return '••••';
    }
    return `${amount >= 0 ? '+' : ''}${formatCurrency(amount)}`;
}

async function loadData() {
    const statusEl = document.getElementById('status-msg');

    try {
        const response = await fetch('/.netlify/functions/fetch-sheet');
        if (!response.ok) throw new Error('Could not reach sheet');
        const csvText = await response.text();

        const rows = csvText.trim().split('\n');
        allTransactions = [];

        for (let i = 1; i < rows.length; i++) {
            const cols = parseCsvLine(rows[i]);
            if (cols.length < 4) continue;

            const date = parseDate(cols[0]);
            const category = (cols[1] || '').trim();
            const amount = parseFloat(cols[2]);
            const type = (cols[3] || '').trim().toLowerCase();
            const comment = (cols[4] || '').trim();

            if (isNaN(amount) || isNaN(date.getTime())) continue;
            if (!['income', 'expense', 'investment'].includes(type)) continue;

            allTransactions.push({ date, category, amount, type, comment });
        }

        allTransactions.sort((a, b) => a.date - b.date);

        render();
        statusEl.classList.add('hidden');

    } catch (err) {
        console.error('Error loading sheet data', err);
        statusEl.innerText = "Couldn't load your sheet. Check if csv published, environment variable is set, and try again.";
        statusEl.classList.remove('hidden');
    }
}

// Robust date parser — avoids JS's ambiguous "new Date(string)" behaviour,
// which assumes US-style MM/DD and silently mis-reads DD/MM dates
// (e.g. Google Sheets often exports 7/1/2026 to mean 7 Jan, not 1 Jul).
function parseDate(raw) {
    if (!raw) return new Date(NaN);
    const str = raw.trim();

    // ISO format: YYYY-MM-DD (unambiguous)
    let m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) {
        return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
    }

    // Slash format: D/M/YYYY or D-M-YYYY — treated as DD/MM/YYYY (Indian convention)
    m = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) {
        const day = parseInt(m[1], 10);
        const month = parseInt(m[2], 10);
        const year = parseInt(m[3], 10);
        // If the second part is >12, the format must actually be MM/DD, so swap.
        if (month > 12 && day <= 12) {
            return new Date(year, day - 1, month); // was actually MM/DD/YYYY
        }
        return new Date(year, month - 1, day);
    }

    // Fallback for anything else (e.g. "Jan 7, 2026")
    return new Date(str);
}

// Minimal CSV line parser (handles simple unquoted/quoted commas)
function parseCsvLine(line) {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
            inQuotes = !inQuotes;
        } else if (c === ',' && !inQuotes) {
            result.push(cur);
            cur = '';
        } else {
            cur += c;
        }
    }
    result.push(cur);
    return result;
}

function pct(part, whole) {
    if (!whole) return 0;
    return (part / whole) * 100;
}

function monthKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key) {
    const [y, m] = key.split('-');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[parseInt(m, 10) - 1]} ${y}`;
}

function buildMonthlyKPIs(transactions) {
    const byMonth = {};

    transactions.forEach(t => {
        const key = monthKey(t.date);
        if (!byMonth[key]) {
            byMonth[key] = { income: 0, spends: 0, investment: 0, expensesByCategory: {} };
        }
        if (t.type === 'income') byMonth[key].income += t.amount;
        else if (t.type === 'expense') {
            byMonth[key].spends += t.amount;
            byMonth[key].expensesByCategory[t.category] = (byMonth[key].expensesByCategory[t.category] || 0) + t.amount;
        } else if (t.type === 'investment') byMonth[key].investment += t.amount;
    });

    const keys = Object.keys(byMonth).sort();

    return keys.map(key => {
        const m = byMonth[key];
        const incomeMinusSpends = m.income - m.spends;
        const liquidSavings = m.income - m.spends - m.investment;
        const investmentPct = pct(m.investment, m.income);
        const liquidSavingsPct = pct(liquidSavings, m.income);
        const totalSavingsPct = pct(m.investment + liquidSavings, m.income);

        return {
            key,
            label: monthLabel(key),
            income: m.income,
            spends: m.spends,
            investment: m.investment,
            incomeMinusSpends,
            liquidSavings,
            investmentPct,
            liquidSavingsPct,
            totalSavingsPct,
            expensesByCategory: m.expensesByCategory
        };
    });
}

function loadPlannerTransactions() {
    try {
        const stored = localStorage.getItem('plannerTransactions');
        plannerTransactions = stored ? JSON.parse(stored) : [];
    } catch (err) {
        console.error('Could not load planner transactions', err);
        plannerTransactions = [];
    }
}

function savePlannerTransactions() {
    localStorage.setItem('plannerTransactions', JSON.stringify(plannerTransactions));
}

function getCurrentMonthTransactions(sourceTransactions = allTransactions) {
    const currentDate = new Date();
    const month = monthKey(currentDate);
    const combined = [
        ...sourceTransactions,
        ...plannerTransactions.map(t => ({ ...t, date: new Date(t.date) }))
    ];

    return combined.filter(t => t && t.date && monthKey(t.date) === month);
}

function renderPlannerDashboard() {
    const currentMonth = monthKey(new Date());
    const monthTransactions = getCurrentMonthTransactions(allTransactions);
    const income = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const expenses = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const investment = monthTransactions.filter(t => t.type === 'investment').reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const net = income - expenses;
    const liquid = income - expenses - investment;
    const totalSaved = investment + liquid;
    const investmentPct = pct(investment, income);
    const liquidPct = pct(liquid, income);
    const totalSavingsPct = pct(investment + liquid, income);

    setText('planner-income', getDisplayCurrency(income));
    setText('planner-expenses', getDisplayCurrency(expenses));
    setText('planner-investment', getDisplayCurrency(investment));
    setText('planner-net', getDisplayCurrency(net));
    setText('planner-liquid', getDisplayCurrency(liquid));
    setText('planner-investment-pct', investmentPct.toFixed(1) + '%');
    setText('planner-liquid-pct', liquidPct.toFixed(1) + '%');
    setText('planner-total-saved', getDisplayCurrency(totalSaved));

    const breakdownBody = document.getElementById('planner-breakdown-body');
    if (breakdownBody) {
        const expenseByCategory = {};
        monthTransactions.filter(t => t.type === 'expense').forEach(t => {
            expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + Number(t.amount || 0);
        });

        const sortedEntries = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]);
        if (!sortedEntries.length) {
            breakdownBody.innerHTML = '<tr><td colspan="3" class="py-3 text-slate-500 dark:text-slate-400">No expense categories yet for this month.</td></tr>';
        } else {
            breakdownBody.innerHTML = sortedEntries.map(([category, amount]) => {
                const sharePct = pct(amount, expenses || 1);
                return `
                    <tr class="border-b border-slate-100 dark:border-slate-700">
                        <td class="py-2 pr-4 font-medium">${category}</td>
                        <td class="py-2 pr-4 text-red-600 dark:text-red-400">${getDisplayCurrency(amount)}</td>
                        <td class="py-2 pr-4 text-slate-500 dark:text-slate-400">${sharePct.toFixed(1)}%</td>
                    </tr>
                `;
            }).join('');
        }
    }

    const plannerList = document.getElementById('planner-transactions-list');
    if (plannerList) {
        const currentMonthPlannerTransactions = plannerTransactions.filter(t => t && t.date && monthKey(new Date(t.date)) === currentMonth);
        if (!currentMonthPlannerTransactions.length) {
            plannerList.innerHTML = '<div class="rounded-lg border border-dashed border-slate-200 dark:border-slate-700 p-3 text-sm text-slate-500 dark:text-slate-400">No planning transactions yet. Add one above to see the effect on your monthly plan.</div>';
            return;
        }
        plannerList.innerHTML = currentMonthPlannerTransactions.map((t, index) => `
            <div class="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm">
                <div>
                    <div class="font-semibold text-slate-800 dark:text-slate-200">${t.category || 'Untitled'} <span class="ml-2 text-xs uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700">${t.type}</span></div>
                    <div class="text-slate-500 dark:text-slate-400">${new Date(t.date).toLocaleDateString('en-IN')} • ${getDisplayCurrency(Number(t.amount || 0))}</div>
                </div>
                <button type="button" onclick="removePlannerTransaction(${index})" class="text-xs text-red-600 hover:text-red-700 dark:text-red-400">Remove</button>
            </div>
        `).join('');
    }
}

function addPlannerTransaction(transaction) {
    plannerTransactions.push(transaction);
    savePlannerTransactions();
    renderPlannerDashboard();
}

function removePlannerTransaction(index) {
    plannerTransactions.splice(index, 1);
    savePlannerTransactions();
    renderPlannerDashboard();
}

function clearPlannerTransactions() {
    plannerTransactions = [];
    savePlannerTransactions();
    renderPlannerDashboard();
}

function initPlannerForm() {
    const form = document.getElementById('planner-form');
    if (!form) return;

    const today = new Date().toISOString().split('T')[0];
    const dateInput = form.querySelector('input[name="date"]');
    if (dateInput) dateInput.value = today;

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const transaction = {
            date: formData.get('date'),
            category: String(formData.get('category') || '').trim(),
            type: String(formData.get('type') || '').trim().toLowerCase(),
            amount: parseFloat(formData.get('amount')),
            comment: String(formData.get('comment') || '').trim()
        };

        if (!transaction.category || isNaN(transaction.amount) || transaction.amount <= 0) {
            return;
        }

        addPlannerTransaction(transaction);
        form.reset();
        if (dateInput) dateInput.value = today;
    });
}

function render() {
    const monthly = buildMonthlyKPIs(allTransactions);

    // Overall tracked totals (from your Google Sheet)
    const totalIncome = allTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalSpends = allTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const trackedInvestment = allTransactions.filter(t => t.type === 'investment').reduce((s, t) => s + t.amount, 0);
    
    // Add initial balances (safeguarded in case they are missing from config.js)
    const initInv = typeof INITIAL_INVESTMENT !== 'undefined' ? INITIAL_INVESTMENT : 171000;
    const initLiq = typeof INITIAL_LIQUID_BALANCE !== 'undefined' ? INITIAL_LIQUID_BALANCE : 54957;

    // Total Wealth calculations
    const totalInvestment = initInv + trackedInvestment;
    const incomeMinusSpends = totalIncome - totalSpends;
    const trackedLiquid = totalIncome - totalSpends - trackedInvestment;
    const liquidSavings = initLiq + trackedLiquid;

    // Percentages (Based on tracked cash flow only, so they don't skew over 100%)
    const investmentPct = pct(trackedInvestment, totalIncome);
    const liquidSavingsPct = pct(trackedLiquid, totalIncome);
    const totalSavingsPct = pct(trackedInvestment + trackedLiquid, totalIncome);

    setText('total-income', getDisplayCurrency(totalIncome));
    setText('total-expenses', getDisplayCurrency(totalSpends));
    setText('total-investment', getDisplayCurrency(totalInvestment)); // Now includes initial
    setText('income-minus-spends', getDisplayCurrency(incomeMinusSpends));
    setText('liquid-savings', getDisplayCurrency(liquidSavings)); // Now includes initial
    setText('investment-pct', investmentPct.toFixed(1) + '%');
    setText('liquid-savings-pct', liquidSavingsPct.toFixed(1) + '%');
    setText('total-savings-pct', totalSavingsPct.toFixed(1) + '%');

    // Starting balance context
    setText('initial-investment', getDisplayCurrency(initInv));
    setText('initial-liquid', getDisplayCurrency(initLiq));
    setText('initial-net-worth', getDisplayCurrency(initInv + initLiq));
    setText('initial-investment-inline', getDisplayCurrency(initInv));
    setText('initial-liquid-inline', getDisplayCurrency(initLiq));

    // Net worth KPIs
    const startingNetWorth = initInv + initLiq;
    const netWorthToday = totalInvestment + liquidSavings;
    const netWorthGrowth = netWorthToday - startingNetWorth;
    const netWorthGrowthPct = pct(netWorthGrowth, Math.abs(startingNetWorth) || 1);
    setText('net-worth', getDisplayCurrency(netWorthToday));
    setText('net-worth-growth', getDisplaySignedCurrency(netWorthGrowth));
    setText('net-worth-growth-pct', (netWorthGrowth >= 0 ? '+' : '') + netWorthGrowthPct.toFixed(1) + '%');

    // Net worth composition (investment vs liquid share of total net worth, incl. initial balances)
    const investmentSharePct = pct(totalInvestment, netWorthToday);
    const liquidSharePct = pct(liquidSavings, netWorthToday);
    setText('investment-share-pct', investmentSharePct.toFixed(1) + '%');
    setText('investment-share-total', getDisplayCurrency(totalInvestment, 'total'));
    setText('liquid-share-pct', liquidSharePct.toFixed(1) + '%');
    setText('liquid-share-total', getDisplayCurrency(liquidSavings, 'total'));

    // Avg monthly net savings & months tracked
    const monthsTracked = monthly.length;
    const avgMonthlySavings = monthsTracked ? (trackedInvestment + trackedLiquid) / monthsTracked : 0;
    setText('avg-monthly-savings', getDisplayCurrency(avgMonthlySavings));
    const avgSavingsEl = document.getElementById('avg-monthly-savings');
    if (avgSavingsEl) {
        avgSavingsEl.className = 'text-2xl font-bold mt-2 ' + (avgMonthlySavings >= 0 ? 'text-blue-600' : 'text-red-600');
    }
    setText('months-tracked', String(monthsTracked));

    const growthEl = document.getElementById('net-worth-growth');
    const growthPctEl = document.getElementById('net-worth-growth-pct');
    [growthEl, growthPctEl].forEach(el => {
        if (el) el.className = 'text-2xl font-bold mt-2 ' + (netWorthGrowth >= 0 ? 'text-green-600' : 'text-red-600');
    });

    const incomeMinusSpendsEl = document.getElementById('income-minus-spends');
    if (incomeMinusSpendsEl) {
        incomeMinusSpendsEl.className = 'text-2xl font-bold mt-2 ' + (incomeMinusSpends >= 0 ? 'text-blue-600' : 'text-red-600');
    }
    const liquidEl = document.getElementById('liquid-savings');
    if (liquidEl) {
        liquidEl.className = 'text-2xl font-bold mt-2 ' + (liquidSavings >= 0 ? 'text-teal-600' : 'text-red-600');
    }

    // Overall expense-by-category (for the spending doughnut)
    const expensesByCategory = {};
    allTransactions.filter(t => t.type === 'expense').forEach(t => {
        expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
    });

    // Cumulative net worth over time, starting from initial balances
    let runningInv = initInv;
    let runningLiq = initLiq;
    const netWorthSeries = monthly.map(m => {
        runningInv += m.investment;
        runningLiq += m.liquidSavings;
        return runningInv + runningLiq;
    });

    // We pass the new totalInvestment and liquidSavings so the Doughnut chart reflects total wealth
    initCharts(monthly, expensesByCategory, totalInvestment, liquidSavings, netWorthSeries, initInv + initLiq);
    renderMonthlyTable(monthly);
    renderTransactionsTable(allTransactions);
    renderPlannerDashboard();
}
function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
}

let trendChartInstance, expenseChartInstance, netWorthChartInstance;

function initCharts(monthly, expData, totalInvestment, liquidSavings, netWorthSeries, startingNetWorth) {
    const labels = monthly.map(m => m.label);
    const currencyFormatter = (value) => isOverviewMasked() ? '••••' : formatCurrency(value);

    if (trendChartInstance) trendChartInstance.destroy();
    if (expenseChartInstance) expenseChartInstance.destroy();
    if (netWorthChartInstance) netWorthChartInstance.destroy();

    // Net worth over time (starts at the initial balance, before the first tracked month)
    const netWorthCtx = document.getElementById('netWorthChart');
    if (netWorthCtx) {
        netWorthChartInstance = new Chart(netWorthCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['Start', ...labels],
                datasets: [{
                    label: 'Net Worth',
                    data: [startingNetWorth, ...(netWorthSeries || [])],
                    borderColor: '#4f46e5',
                    backgroundColor: 'rgba(79, 70, 229, 0.08)',
                    borderWidth: 3, tension: 0.35, fill: true, pointRadius: 3
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: (ctx) => `Net Worth: ${currencyFormatter(ctx.parsed.y)}` } }
                },
                scales: { y: { ticks: { callback: (v) => currencyFormatter(v) } } }
            }
        });
    }

    // Monthly trend: Income, Expenses, Investment, Liquid Savings
    const trendCtx = document.getElementById('revenueChart').getContext('2d');
    trendChartInstance = new Chart(trendCtx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Income',
                    data: monthly.map(m => m.income),
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.08)',
                    borderWidth: 3, tension: 0.4, fill: true
                },
                {
                    label: 'Expenses',
                    data: monthly.map(m => m.spends),
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.06)',
                    borderWidth: 3, tension: 0.4, fill: true
                },
                {
                    label: 'Investment (Savings)',
                    data: monthly.map(m => m.investment),
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.06)',
                    borderWidth: 3, tension: 0.4, fill: true
                },
                {
                    label: 'Liquid Savings',
                    data: monthly.map(m => m.liquidSavings),
                    borderColor: '#14b8a6',
                    backgroundColor: 'rgba(20, 184, 166, 0.06)',
                    borderWidth: 3, tension: 0.4, fill: true
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: true, position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `${ctx.dataset.label}: ${currencyFormatter(ctx.parsed.y)}`
                    }
                }
            },
            scales: { y: { ticks: { callback: (v) => currencyFormatter(v) } } }
        }
    });

    // Spending by category
    const expCtx = document.getElementById('expenseChart').getContext('2d');
    expenseChartInstance = new Chart(expCtx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(expData),
            datasets: [{
                data: Object.values(expData),
                backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            cutout: '70%',
            plugins: {
                legend: { position: 'bottom' },
                tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${currencyFormatter(ctx.parsed)}` } }
            }
        }
    });

}

function renderMonthlyTable(monthly) {
    const tbody = document.getElementById('monthly-kpi-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    monthly.slice().reverse().forEach(m => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-300';
        tr.innerHTML = `
            <td class="py-2 pr-4 font-medium">${m.label}</td>
            <td class="py-2 pr-4 text-green-600 dark:text-green-400">${getDisplayCurrency(m.income)}</td>
            <td class="py-2 pr-4 text-red-600 dark:text-red-400">${getDisplayCurrency(m.spends)}</td>
            <td class="py-2 pr-4 text-purple-600 dark:text-purple-400">${getDisplayCurrency(m.investment)}</td>
            <td class="py-2 pr-4 ${m.incomeMinusSpends >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}">${getDisplayCurrency(m.incomeMinusSpends)}</td>
            <td class="py-2 pr-4 ${m.liquidSavings >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-red-600 dark:text-red-400'}">${getDisplayCurrency(m.liquidSavings)}</td>
            <td class="py-2 pr-4">${m.investmentPct.toFixed(1)}%</td>
            <td class="py-2 pr-4">${m.liquidSavingsPct.toFixed(1)}%</td>
            <td class="py-2 pr-4 font-semibold">${m.totalSavingsPct.toFixed(1)}%</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderTransactionsTable(transactions) {
    const tbody = document.getElementById('transactions-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    const typeStyles = {
        income: 'bg-green-100 text-green-700',
        expense: 'bg-red-100 text-red-700',
        investment: 'bg-purple-100 text-purple-700'
    };

    transactions.slice().reverse().slice(0, 50).forEach(t => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-300';
        const dateStr = t.date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
        const typeLabel = t.type.charAt(0).toUpperCase() + t.type.slice(1);
        tr.innerHTML = `
            <td class="py-2 pr-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">${dateStr}</td>
            <td class="py-2 pr-4">${t.category || '—'}</td>
            <td class="py-2 pr-4"><span class="px-2 py-0.5 rounded-full text-xs font-medium ${typeStyles[t.type] || ''}">${typeLabel}</span></td>
            <td class="py-2 pr-4 font-medium">${getDisplayCurrency(t.amount)}</td>
            <td class="py-2 pr-4 text-slate-500 dark:text-slate-400">${t.comment || ''}</td>
        `;
        tbody.appendChild(tr);
    });
}

// ============================================================
// MASK TOGGLE
// ============================================================
function toggleMaskValues() {
    const toggle = document.getElementById('mask-toggle');
    if (!toggle) return;

    maskValuesOn = toggle.checked;
    localStorage.setItem('maskValues', maskValuesOn ? 'true' : 'false');

    if (activeDashboard === 'overview' || !document.getElementById('overview-content').classList.contains('hidden')) {
        render();
    }
}

function initMaskMode() {
    const toggle = document.getElementById('mask-toggle');
    if (!toggle) return;

    maskValuesOn = localStorage.getItem('maskValues') === 'true';
    toggle.checked = maskValuesOn;
}

// ============================================================
// DARK MODE
// ============================================================
function updateThemeToggleButton() {
    const button = document.getElementById('theme-toggle');
    const icon = document.getElementById('theme-toggle-icon');
    if (!button || !icon) return;

    const isDark = document.documentElement.classList.contains('dark');
    icon.textContent = isDark ? '☀️' : '🌙';
    button.setAttribute('aria-pressed', isDark ? 'true' : 'false');
}

function toggleDarkMode() {
    const html = document.documentElement;
    const body = document.body;
    const isDark = html.classList.toggle('dark');
    body.classList.toggle('dark', isDark);
    localStorage.setItem('darkMode', isDark ? 'true' : 'false');
    updateThemeToggleButton();
    // Redraw charts if visible
    if (trendChartInstance) trendChartInstance.resize();
    if (expenseChartInstance) expenseChartInstance.resize();
    if (netWorthChartInstance) netWorthChartInstance.resize();
    if (yearlyChartInstance) yearlyChartInstance.resize();
}

function toggleChartsSection() {
    const content = document.getElementById('charts-section-content');
    const toggle = document.getElementById('charts-section-toggle');
    if (!content || !toggle) return;

    const isHidden = content.classList.toggle('hidden');
    toggle.textContent = isHidden ? 'Show' : 'Hide';

    if (!isHidden) {
        if (trendChartInstance) trendChartInstance.resize();
        if (expenseChartInstance) expenseChartInstance.resize();
        if (netWorthChartInstance) netWorthChartInstance.resize();
    }
}

// Load dark mode preference
function initDarkMode() {
    const isDark = localStorage.getItem('darkMode') === 'true';
    const html = document.documentElement;
    const body = document.body;

    if (isDark) {
        html.classList.add('dark');
        body.classList.add('dark');
    } else {
        html.classList.remove('dark');
        body.classList.remove('dark');
    }
    updateThemeToggleButton();
}

// ============================================================
// DASHBOARD NAVIGATION
// ============================================================
function switchDashboard(tab) {
    activeDashboard = tab;

    const sections = ['overview', 'monthly', 'yearly', 'planning'];
    sections.forEach((name) => {
        const section = document.getElementById(`${name}-content`);
        if (section) section.classList.toggle('hidden', name !== tab);
    });

    sections.forEach((name) => {
        const tabEl = document.getElementById(`tab-${name}`);
        if (!tabEl) return;

        tabEl.classList.toggle('border-blue-600', name === tab);
        tabEl.classList.toggle('text-blue-600', name === tab);
        tabEl.classList.toggle('dark:text-blue-400', name === tab);
        tabEl.classList.toggle('border-transparent', name !== tab);
        tabEl.classList.toggle('text-slate-600', name !== tab);
        tabEl.classList.toggle('dark:text-slate-400', name !== tab);
    });

    const mobileSelect = document.getElementById('mobile-dashboard-select');
    if (mobileSelect) {
        mobileSelect.value = tab;
    }

    if (tab === 'overview') {
        render();
    }
    if (tab === 'planning') {
        renderPlannerDashboard();
    }
    if (tab === 'monthly') populateMonthlySelects();
    if (tab === 'yearly') populateYearlySelects();
}

// ============================================================
// YEARLY KPIs BUILDER
// ============================================================
function getYears() {
    const years = new Set();
    allTransactions.forEach(t => {
        years.add(t.date.getFullYear());
    });
    return Array.from(years).sort((a, b) => a - b);
}

function buildYearlyKPIs(transactions) {
    const byYear = {};

    transactions.forEach(t => {
        const year = t.date.getFullYear();
        if (!byYear[year]) {
            byYear[year] = { income: 0, spends: 0, investment: 0, expensesByCategory: {} };
        }
        if (t.type === 'income') byYear[year].income += t.amount;
        else if (t.type === 'expense') {
            byYear[year].spends += t.amount;
            byYear[year].expensesByCategory[t.category] = (byYear[year].expensesByCategory[t.category] || 0) + t.amount;
        } else if (t.type === 'investment') byYear[year].investment += t.amount;
    });

    const years = Object.keys(byYear).sort();

    return years.map(year => {
        const y = byYear[year];
        const incomeMinusSpends = y.income - y.spends;
        const liquidSavings = y.income - y.spends - y.investment;
        const investmentPct = pct(y.investment, y.income);
        const liquidSavingsPct = pct(liquidSavings, y.income);
        const totalSavingsPct = pct(y.investment + liquidSavings, y.income);

        return {
            year: parseInt(year),
            income: y.income,
            spends: y.spends,
            investment: y.investment,
            incomeMinusSpends,
            liquidSavings,
            investmentPct,
            liquidSavingsPct,
            totalSavingsPct,
            expensesByCategory: y.expensesByCategory
        };
    });
}

// ============================================================
// MONTHLY DASHBOARD
// ============================================================
function populateMonthlySelects() {
    const yearSelect = document.getElementById('monthly-year');
    const years = getYears();
    
    const currentVal = yearSelect.value;
    yearSelect.innerHTML = '<option value="">Choose Year...</option>';
    years.forEach(year => {
        const opt = document.createElement('option');
        opt.value = year;
        opt.textContent = year;
        yearSelect.appendChild(opt);
    });
    yearSelect.value = currentVal || (years.length > 0 ? years[years.length - 1] : '');
}

function updateMonthlyDashboard() {
    const year = document.getElementById('monthly-year').value;
    const month = document.getElementById('monthly-month').value;
    
    if (!year || !month) {
        document.getElementById('monthly-details').innerHTML = 'Select a year and month to view details';
        document.getElementById('monthly-kpis').innerHTML = '';
        return;
    }

    const monthKey = `${year}-${month}`;
    const monthly = buildMonthlyKPIs(allTransactions);
    const monthData = monthly.find(m => m.key === monthKey);

    if (!monthData) {
        document.getElementById('monthly-details').innerHTML = 'No data for selected month';
        document.getElementById('monthly-kpis').innerHTML = '';
        return;
    }

    // Render KPIs
    const kpisHtml = `
        <div class="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Income</h3>
            <p class="text-2xl font-bold mt-2 text-green-600 dark:text-green-400">${formatCurrency(monthData.income)}</p>
        </div>
        <div class="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Expenses</h3>
            <p class="text-2xl font-bold mt-2 text-red-600 dark:text-red-400">${formatCurrency(monthData.spends)}</p>
        </div>
        <div class="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Investment</h3>
            <p class="text-2xl font-bold mt-2 text-purple-600 dark:text-purple-400">${formatCurrency(monthData.investment)}</p>
        </div>
        <div class="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Liquid Savings</h3>
            <p class="text-2xl font-bold mt-2 text-teal-600 dark:text-teal-400">${formatCurrency(monthData.liquidSavings)}</p>
        </div>
        <div class="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Investment %</h3>
            <p class="text-2xl font-bold mt-2 text-purple-600 dark:text-purple-400">${monthData.investmentPct.toFixed(1)}%</p>
        </div>
        <div class="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Liquid Savings %</h3>
            <p class="text-2xl font-bold mt-2 text-teal-600 dark:text-teal-400">${monthData.liquidSavingsPct.toFixed(1)}%</p>
        </div>
        <div class="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Total Savings %</h3>
            <p class="text-2xl font-bold mt-2 text-blue-600 dark:text-blue-400">${monthData.totalSavingsPct.toFixed(1)}%</p>
        </div>
    `;
    document.getElementById('monthly-kpis').innerHTML = kpisHtml;

    // Render details table
    const detailsHtml = `
        <table class="w-full text-sm">
            <thead>
                <tr class="text-left text-xs uppercase text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-700">
                    <th class="py-2 pr-4">Metric</th>
                    <th class="py-2 pr-4">Value</th>
                </tr>
            </thead>
            <tbody>
                <tr class="border-b border-slate-200 dark:border-slate-700">
                    <td class="py-2 pr-4 font-medium">Month</td>
                    <td class="py-2 pr-4">${monthData.label}</td>
                </tr>
                <tr class="border-b border-slate-200 dark:border-slate-700">
                    <td class="py-2 pr-4 font-medium">Total Income</td>
                    <td class="py-2 pr-4 text-green-600 dark:text-green-400">${formatCurrency(monthData.income)}</td>
                </tr>
                <tr class="border-b border-slate-200 dark:border-slate-700">
                    <td class="py-2 pr-4 font-medium">Total Expenses</td>
                    <td class="py-2 pr-4 text-red-600 dark:text-red-400">${formatCurrency(monthData.spends)}</td>
                </tr>
                <tr class="border-b border-slate-200 dark:border-slate-700">
                    <td class="py-2 pr-4 font-medium">Income − Expenses</td>
                    <td class="py-2 pr-4 ${monthData.incomeMinusSpends >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}">${formatCurrency(monthData.incomeMinusSpends)}</td>
                </tr>
                <tr class="border-b border-slate-200 dark:border-slate-700">
                    <td class="py-2 pr-4 font-medium">Total Investment</td>
                    <td class="py-2 pr-4 text-purple-600 dark:text-purple-400">${formatCurrency(monthData.investment)}</td>
                </tr>
                <tr class="border-b border-slate-200 dark:border-slate-700">
                    <td class="py-2 pr-4 font-medium">Liquid Savings</td>
                    <td class="py-2 pr-4 text-teal-600 dark:text-teal-400">${formatCurrency(monthData.liquidSavings)}</td>
                </tr>
                <tr>
                    <td class="py-2 pr-4 font-medium">Total Saved (Inv. + Liquid)</td>
                    <td class="py-2 pr-4 font-bold text-blue-600 dark:text-blue-400">${formatCurrency(monthData.investment + monthData.liquidSavings)}</td>
                </tr>
            </tbody>
        </table>
    `;
    document.getElementById('monthly-details').innerHTML = detailsHtml;
}

// ============================================================
// YEARLY DASHBOARD
// ============================================================
function populateYearlySelects() {
    const yearSelect = document.getElementById('yearly-year');
    const years = getYears();
    
    const currentVal = yearSelect.value;
    yearSelect.innerHTML = '<option value="">Choose Year...</option>';
    years.forEach(year => {
        const opt = document.createElement('option');
        opt.value = year;
        opt.textContent = year;
        yearSelect.appendChild(opt);
    });
    yearSelect.value = currentVal || (years.length > 0 ? years[years.length - 1] : '');
}

let yearlyChartInstance = null;

function updateYearlyDashboard() {
    const year = document.getElementById('yearly-year').value;
    
    if (!year) {
        document.getElementById('yearly-details').innerHTML = 'Select a year to view details';
        document.getElementById('yearly-kpis').innerHTML = '';
        return;
    }

    const yearlySummary = buildYearlyKPIs(allTransactions);
    const yearData = yearlySummary.find(y => y.year === parseInt(year));

    if (!yearData) {
        document.getElementById('yearly-details').innerHTML = 'No data for selected year';
        document.getElementById('yearly-kpis').innerHTML = '';
        return;
    }

    // Render KPIs
    const kpisHtml = `
        <div class="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Annual Income</h3>
            <p class="text-2xl font-bold mt-2 text-green-600 dark:text-green-400">${formatCurrency(yearData.income)}</p>
        </div>
        <div class="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Annual Expenses</h3>
            <p class="text-2xl font-bold mt-2 text-red-600 dark:text-red-400">${formatCurrency(yearData.spends)}</p>
        </div>
        <div class="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Annual Investment</h3>
            <p class="text-2xl font-bold mt-2 text-purple-600 dark:text-purple-400">${formatCurrency(yearData.investment)}</p>
        </div>
        <div class="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Annual Liquid Savings</h3>
            <p class="text-2xl font-bold mt-2 text-teal-600 dark:text-teal-400">${formatCurrency(yearData.liquidSavings)}</p>
        </div>
        <div class="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Investment %</h3>
            <p class="text-2xl font-bold mt-2 text-purple-600 dark:text-purple-400">${yearData.investmentPct.toFixed(1)}%</p>
        </div>
        <div class="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Liquid Savings %</h3>
            <p class="text-2xl font-bold mt-2 text-teal-600 dark:text-teal-400">${yearData.liquidSavingsPct.toFixed(1)}%</p>
        </div>
        <div class="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Total Savings %</h3>
            <p class="text-2xl font-bold mt-2 text-blue-600 dark:text-blue-400">${yearData.totalSavingsPct.toFixed(1)}%</p>
        </div>
    `;
    document.getElementById('yearly-kpis').innerHTML = kpisHtml;

    // Render details table
    const detailsHtml = `
        <table class="w-full text-sm">
            <thead>
                <tr class="text-left text-xs uppercase text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-700">
                    <th class="py-2 pr-4">Metric</th>
                    <th class="py-2 pr-4">Value</th>
                </tr>
            </thead>
            <tbody>
                <tr class="border-b border-slate-200 dark:border-slate-700">
                    <td class="py-2 pr-4 font-medium">Year</td>
                    <td class="py-2 pr-4">${yearData.year}</td>
                </tr>
                <tr class="border-b border-slate-200 dark:border-slate-700">
                    <td class="py-2 pr-4 font-medium">Total Income</td>
                    <td class="py-2 pr-4 text-green-600 dark:text-green-400">${formatCurrency(yearData.income)}</td>
                </tr>
                <tr class="border-b border-slate-200 dark:border-slate-700">
                    <td class="py-2 pr-4 font-medium">Total Expenses</td>
                    <td class="py-2 pr-4 text-red-600 dark:text-red-400">${formatCurrency(yearData.spends)}</td>
                </tr>
                <tr class="border-b border-slate-200 dark:border-slate-700">
                    <td class="py-2 pr-4 font-medium">Income − Expenses</td>
                    <td class="py-2 pr-4 ${yearData.incomeMinusSpends >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}">${formatCurrency(yearData.incomeMinusSpends)}</td>
                </tr>
                <tr class="border-b border-slate-200 dark:border-slate-700">
                    <td class="py-2 pr-4 font-medium">Total Investment</td>
                    <td class="py-2 pr-4 text-purple-600 dark:text-purple-400">${formatCurrency(yearData.investment)}</td>
                </tr>
                <tr class="border-b border-slate-200 dark:border-slate-700">
                    <td class="py-2 pr-4 font-medium">Liquid Savings</td>
                    <td class="py-2 pr-4 text-teal-600 dark:text-teal-400">${formatCurrency(yearData.liquidSavings)}</td>
                </tr>
                <tr>
                    <td class="py-2 pr-4 font-medium">Total Saved (Inv. + Liquid)</td>
                    <td class="py-2 pr-4 font-bold text-blue-600 dark:text-blue-400">${formatCurrency(yearData.investment + yearData.liquidSavings)}</td>
                </tr>
            </tbody>
        </table>
    `;
    document.getElementById('yearly-details').innerHTML = detailsHtml;

    // Render yearly trend chart
    renderYearlyChart(yearlySummary);
}

function renderYearlyChart(yearly) {
    const ctx = document.getElementById('yearlyChart');
    if (!ctx) return;

    if (yearlyChartInstance) yearlyChartInstance.destroy();

    yearlyChartInstance = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: yearly.map(y => y.year),
            datasets: [
                {
                    label: 'Income',
                    data: yearly.map(y => y.income),
                    backgroundColor: 'rgba(34, 197, 94, 0.8)',
                    borderColor: '#22c55e',
                    borderWidth: 1
                },
                {
                    label: 'Expenses',
                    data: yearly.map(y => y.spends),
                    backgroundColor: 'rgba(239, 68, 68, 0.8)',
                    borderColor: '#ef4444',
                    borderWidth: 1
                },
                {
                    label: 'Investment',
                    data: yearly.map(y => y.investment),
                    backgroundColor: 'rgba(139, 92, 246, 0.8)',
                    borderColor: '#8b5cf6',
                    borderWidth: 1
                },
                {
                    label: 'Liquid Savings',
                    data: yearly.map(y => y.liquidSavings),
                    backgroundColor: 'rgba(20, 184, 166, 0.8)',
                    borderColor: '#14b8a6',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: true, position: 'bottom' },
                tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}` } }
            },
            scales: { y: { ticks: { callback: (v) => formatCurrency(v) } } }
        }
    });
}

let deferredPrompt = null;

function initApp() {
    initMaskMode();
    initDarkMode();
    loadPlannerTransactions();
    initPlannerForm();
    loadData();
    setupInstallPrompt();
}

function setupInstallPrompt() {
    const installBtn = document.getElementById('installBtn');
    if (!installBtn) return;

    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferredPrompt = event;
        installBtn.classList.remove('hidden');
    });

    window.addEventListener('appinstalled', () => {
        installBtn.classList.add('hidden');
        deferredPrompt = null;
    });

    installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            installBtn.classList.add('hidden');
        }
        deferredPrompt = null;
    });
}

initApp();
loadData();
