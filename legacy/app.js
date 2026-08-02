// Fetch data from your published Google Sheet (CSV)
let allTransactions = [];
let incomeTransactions = [];
let expenseTransactions = [];
let investmentTransactions = [];
let plannerTransactions = [];
let maskValuesOn = false;
let activeDashboard = 'overview';
let transactionFilters = {
    startDate: null,
    endDate: null,
    type: 'all'
};

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

        const contentType = response.headers.get('content-type') || '';
        const payload = contentType.includes('application/json')
            ? await response.json()
            : { combinedCsv: await response.text() };

        const combinedCsv = payload.combinedCsv || payload.sheetCsv || '';
        const incomeCsv = payload.incomeCsv || payload.income_csv || '';
        const expenseCsv = payload.expenseCsv || payload.expense_csv || '';
        const investmentCsv = payload.investmentCsv || payload.investment_csv || '';

        incomeTransactions = [];
        expenseTransactions = [];
        investmentTransactions = [];

        if (combinedCsv) {
            parseCombinedCsv(combinedCsv, incomeTransactions, expenseTransactions, investmentTransactions);
        } else {
            if (incomeCsv) parseSheetCsv(incomeCsv, 'income', incomeTransactions);
            if (expenseCsv) parseSheetCsv(expenseCsv, 'expense', expenseTransactions);
            if (investmentCsv) parseSheetCsv(investmentCsv, 'investment', investmentTransactions);
        }

        allTransactions = [...incomeTransactions, ...expenseTransactions, ...investmentTransactions];
        allTransactions.sort((a, b) => a.date - b.date);

        if (!allTransactions.length) {
            console.warn('No valid sheet rows were found. Showing overview using the configured starting balances.');
        }

        render();
        if (statusEl) statusEl.classList.add('hidden');
    showSection('overview');

    } catch (err) {
        console.error('Error loading sheet data', err);
        if (statusEl) {
            statusEl.innerText = "Couldn't load your sheet. Showing the overview with your configured starting balances instead.";
            statusEl.classList.remove('hidden');
        }
        showSection('overview');
        render();
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

function parseSheetCsv(csvText, sheetType, targetArray) {
    const rows = csvText.trim().split('\n').filter(Boolean);
    for (let i = 1; i < rows.length; i++) {
        const cols = parseCsvLine(rows[i]);
        if (cols.length < 3) continue;

        const date = parseDate(cols[0]);
        const category = (cols[1] || '').trim();
        const amount = parseFloat(cols[2]);
        let comment = '';
        let investmentType = '';

        if (sheetType === 'investment') {
            investmentType = (cols[3] || '').trim();
            comment = (cols[4] || '').trim();
        } else {
            comment = (cols[3] || '').trim();
        }

        if (isNaN(amount) || isNaN(date.getTime())) continue;

        targetArray.push({ date, category, amount, type: sheetType, comment, investmentType });
    }
}

function parseCombinedCsv(csvText, incomeArray, expenseArray, investmentArray) {
    const rows = csvText.trim().split('\n').filter(Boolean);
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

        const investmentType = type === 'investment' ? category : '';
        const item = { date, category, amount, type, comment, investmentType };

        if (type === 'income') incomeArray.push(item);
        else if (type === 'expense') expenseArray.push(item);
        else investmentArray.push(item);
    }
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

function getInitialInvestmentBreakdown() {
    const regular = Number(typeof INITIAL_REGULAR_DEPOSITS !== 'undefined' ? INITIAL_REGULAR_DEPOSITS : 36000);
    const fixed = Number(typeof INITIAL_FIXED_DEPOSITS !== 'undefined' ? INITIAL_FIXED_DEPOSITS : 80000);
    const mutual = Number(typeof INITIAL_MUTUAL_FUNDS !== 'undefined' ? INITIAL_MUTUAL_FUNDS : 55000);
    const legacy = Number(typeof INITIAL_INVESTMENT !== 'undefined' ? INITIAL_INVESTMENT : 171000);
    const hasSpecificValues = [regular, fixed, mutual].some(value => value > 0);

    return {
        regular: hasSpecificValues ? regular : (legacy || 0),
        fixed: hasSpecificValues ? fixed : 0,
        mutual: hasSpecificValues ? mutual : 0,
        total: hasSpecificValues ? regular + fixed + mutual : legacy
    };
}

function buildInvestmentBreakdown(investmentTransactions, initialBreakdown) {
    const breakdown = {};

    if (initialBreakdown) {
        if (initialBreakdown.regular) breakdown['Regular Deposits'] = initialBreakdown.regular;
        if (initialBreakdown.fixed) breakdown['Fixed Deposits'] = initialBreakdown.fixed;
        if (initialBreakdown.mutual) breakdown['Mutual Funds'] = initialBreakdown.mutual;
    }

    investmentTransactions.forEach(t => {
        const key = (t.investmentType || t.category || 'Uncategorized').trim() || 'Uncategorized';
        breakdown[key] = (breakdown[key] || 0) + t.amount;
    });

    return breakdown;
}

function render() {
    const monthly = buildMonthlyKPIs(allTransactions);

    // Overall tracked totals (from your Google Sheet)
    const totalIncome = incomeTransactions.reduce((s, t) => s + t.amount, 0);
    const totalSpends = expenseTransactions.reduce((s, t) => s + t.amount, 0);
    const trackedInvestment = investmentTransactions.reduce((s, t) => s + t.amount, 0);

    // Add initial balances (safeguarded in case they are missing from config.js)
    const initialInvestmentBreakdown = getInitialInvestmentBreakdown();
    const initInv = initialInvestmentBreakdown.total;
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

    const currentMonthTransactions = getCurrentMonthTransactions(allTransactions);
    const currentMonthIncome = currentMonthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const currentMonthSpends = currentMonthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const currentMonthInvestment = currentMonthTransactions.filter(t => t.type === 'investment').reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const currentMonthLiquid = currentMonthIncome - currentMonthSpends - currentMonthInvestment;
    const currentMonthSavingsPct = pct(currentMonthInvestment + currentMonthLiquid, currentMonthIncome);

    setText('total-income', getDisplayCurrency(totalIncome));
    setText('total-expenses', getDisplayCurrency(totalSpends));
    setText('total-investment', getDisplayCurrency(totalInvestment));
    setText('income-minus-spends', getDisplayCurrency(incomeMinusSpends));
    setText('liquid-savings', getDisplayCurrency(liquidSavings));
    setText('investment-pct', investmentPct.toFixed(1) + '%');
    setText('liquid-savings-pct', liquidSavingsPct.toFixed(1) + '%');
    setText('total-savings-pct', totalSavingsPct.toFixed(1) + '%');
    setText('current-month-expense', getDisplayCurrency(currentMonthSpends));
    setText('current-month-investment', getDisplayCurrency(currentMonthInvestment));
    setText('current-month-savings-pct', currentMonthSavingsPct.toFixed(1) + '%');
    setText('total-liquid', getDisplayCurrency(liquidSavings));
    setText('total-investment-core', getDisplayCurrency(totalInvestment));

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
    setText('net-worth-core', getDisplayCurrency(netWorthToday));
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

    const expenseBreakdown = {};
    expenseTransactions.forEach(t => {
        expenseBreakdown[t.category] = (expenseBreakdown[t.category] || 0) + t.amount;
    });

    const investmentTypeBreakdown = buildInvestmentBreakdown(investmentTransactions, initialInvestmentBreakdown);
    const investmentBreakupEl = document.getElementById('investment-breakup');
    if (investmentBreakupEl) {
        const breakupText = Object.entries(investmentTypeBreakdown)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([name, amount]) => `${name}: ${getDisplayCurrency(amount)}`)
            .join(' • ');
        investmentBreakupEl.innerText = breakupText || 'No investments yet';
    }

    const historySeries = buildHistorySeries(monthly, initInv, initLiq);
    const monthlyWithClosingLiquid = monthly.map((item, index) => ({
        ...item,
        closingLiquid: historySeries[index]?.closingLiquid ?? 0
    }));

    initCharts(monthly, expenseBreakdown, totalInvestment, liquidSavings, historySeries, initInv + initLiq, investmentTypeBreakdown);
    renderOverviewSections(totalIncome, totalSpends, trackedInvestment, totalInvestment, incomeTransactions, expenseTransactions, investmentTransactions, investmentTypeBreakdown);
    renderMonthlyTable(monthlyWithClosingLiquid);
    renderTransactionsTable(allTransactions);
    renderHistoryTable(historySeries);
    renderPlannerDashboard();
}

function renderTransactionsTable(transactions) {
    const tbody = document.getElementById('transactions-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    const filteredTransactions = applyTransactionFilters(transactions);

    const typeStyles = {
        income: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
        expense: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
        investment: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
    };

    filteredTransactions.slice().reverse().slice(0, 50).forEach(t => {
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

function applyTransactionFilters(transactions) {
    return transactions.filter(t => {
        if (transactionFilters.type !== 'all' && t.type !== transactionFilters.type) {
            return false;
        }
        if (transactionFilters.startDate) {
            const start = new Date(transactionFilters.startDate);
            if (t.date < start) return false;
        }
        if (transactionFilters.endDate) {
            const end = new Date(transactionFilters.endDate);
            end.setHours(23, 59, 59, 999);
            if (t.date > end) return false;
        }
        return true;
    });
}

function setupTransactionFilters() {
    const startInput = document.getElementById('transactions-filter-start');
    const endInput = document.getElementById('transactions-filter-end');
    const typeSelect = document.getElementById('transactions-filter-type');

    if (startInput) {
        startInput.addEventListener('change', () => {
            transactionFilters.startDate = startInput.value || null;
            renderTransactionsTable(allTransactions);
        });
    }
    if (endInput) {
        endInput.addEventListener('change', () => {
            transactionFilters.endDate = endInput.value || null;
            renderTransactionsTable(allTransactions);
        });
    }
    if (typeSelect) {
        typeSelect.addEventListener('change', () => {
            transactionFilters.type = typeSelect.value || 'all';
            renderTransactionsTable(allTransactions);
        });
    }
}
function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
}

let trendChartInstance, expenseChartInstance, netWorthChartInstance, investmentChartInstance, historyChartInstance;

function showSection(sectionName) {
    const normalized = sectionName || 'overview';
    const panels = document.querySelectorAll('.section-panel');
    if (panels.length) {
        panels.forEach((panel) => {
            panel.classList.toggle('hidden', panel.id !== `${normalized}-content`);
        });
    }

    if (normalized === 'monthly') {
        populateMonthlySelects();
        updateMonthlyDashboard();
    } else if (normalized === 'yearly') {
        populateYearlySelects();
        updateYearlyDashboard();
    } else if (normalized === 'history') {
        render();
        if (historyChartInstance) historyChartInstance.resize();
    } else if (normalized === 'overview') {
        render();
    }

    if (normalized !== 'overview') {
        if (trendChartInstance) trendChartInstance.resize();
        if (expenseChartInstance) expenseChartInstance.resize();
        if (netWorthChartInstance) netWorthChartInstance.resize();
        if (investmentChartInstance) investmentChartInstance.resize();
        if (historyChartInstance) historyChartInstance.resize();
    }
}

function togglePlannerPanel() {
    const panel = document.getElementById('planner-panel');
    const button = document.getElementById('planner-toggle');
    if (!panel || !button) return;
    const isHidden = panel.classList.toggle('hidden');
    button.textContent = isHidden ? 'Show planner' : 'Hide planner';
    button.classList.toggle('bg-emerald-600', isHidden);
    button.classList.toggle('bg-slate-600', !isHidden);
}

function initCharts(monthly, expData, totalInvestment, liquidSavings, historySeries, startingNetWorth, investmentTypeBreakdown) {
    const labels = monthly.map(m => m.label);
    const currencyFormatter = (value) => isOverviewMasked() ? '••••' : formatCurrency(value);

    if (trendChartInstance) trendChartInstance.destroy();
    if (expenseChartInstance) expenseChartInstance.destroy();
    if (netWorthChartInstance) netWorthChartInstance.destroy();
    if (investmentChartInstance) investmentChartInstance.destroy();
    if (historyChartInstance) historyChartInstance.destroy();

    const netWorthCtx = document.getElementById('netWorthChart');
    if (netWorthCtx && netWorthCtx.getContext) {
        netWorthChartInstance = new Chart(netWorthCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['Start', ...labels],
                datasets: [{
                    label: 'Net Worth',
                    data: [startingNetWorth, ...(historySeries || []).map(item => item.closingInvestment + item.closingLiquid)],
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

    const trendCtx = document.getElementById('revenueChart');
    if (trendCtx && trendCtx.getContext) {
        trendChartInstance = new Chart(trendCtx.getContext('2d'), {
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
    }

    const expCtx = document.getElementById('expenseChart');
    if (expCtx && expCtx.getContext) {
        expenseChartInstance = new Chart(expCtx.getContext('2d'), {
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

    const investCtx = document.getElementById('investmentChart');
    if (investCtx && investCtx.getContext) {
        investmentChartInstance = new Chart(investCtx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: Object.keys(investmentTypeBreakdown),
                datasets: [{
                    data: Object.values(investmentTypeBreakdown),
                    backgroundColor: ['#8b5cf6', '#3b82f6', '#14b8a6', '#f97316', '#0ea5e9', '#c084fc', '#fb7185'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                cutout: '65%',
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${currencyFormatter(ctx.parsed)}` } }
                }
            }
        });
    }

    const historyCtx = document.getElementById('historyChart');
    if (historyCtx && historyCtx.getContext) {
        historyChartInstance = new Chart(historyCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: historySeries.map(item => item.label),
                datasets: [
                    {
                        label: 'Closing Investment',
                        data: historySeries.map(item => item.closingInvestment),
                        borderColor: '#8b5cf6',
                        backgroundColor: 'rgba(139, 92, 246, 0.12)',
                        borderWidth: 3,
                        tension: 0.35,
                        fill: true
                    },
                    {
                        label: 'Closing Liquid',
                        data: historySeries.map(item => item.closingLiquid),
                        borderColor: '#14b8a6',
                        backgroundColor: 'rgba(20, 184, 166, 0.12)',
                        borderWidth: 3,
                        tension: 0.35,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${currencyFormatter(ctx.parsed.y)}` } }
                },
                scales: {
                    y: { ticks: { callback: (v) => currencyFormatter(v) } }
                }
            }
        });
    }
}

function renderOverviewSections(totalIncome, totalSpends, trackedInvestment, totalInvestmentValue, incomeItems, expenseItems, investmentItems, investmentTypeBreakdown) {
    const incomeByCategory = {};
    incomeItems.forEach(t => {
        incomeByCategory[t.category] = (incomeByCategory[t.category] || 0) + t.amount;
    });

    const expenseByCategory = {};
    expenseItems.forEach(t => {
        expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount;
    });

    const topIncome = Object.entries(incomeByCategory)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([category, amount]) => `<div class="flex justify-between text-sm py-1"><span>${category}</span><span>${getDisplayCurrency(amount)}</span></div>`)
        .join('') || '<div class="text-sm text-slate-500 dark:text-slate-400">No income categories yet.</div>';

    const topExpenses = Object.entries(expenseByCategory)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([category, amount]) => `<div class="flex justify-between text-sm py-1"><span>${category}</span><span>${getDisplayCurrency(amount)}</span></div>`)
        .join('') || '<div class="text-sm text-slate-500 dark:text-slate-400">No expense categories yet.</div>';

    const topInvestments = Object.entries(investmentTypeBreakdown)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([category, amount]) => `<div class="flex justify-between text-sm py-1"><span>${category}</span><span>${getDisplayCurrency(amount)}</span></div>`)
        .join('') || '<div class="text-sm text-slate-500 dark:text-slate-400">No investments yet.</div>';

    const incomeHtml = `
        <div class="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 class="text-lg font-bold mb-3 text-slate-900 dark:text-white">Income</h3>
            <p class="text-3xl font-bold text-green-600 dark:text-green-400 mb-4">${getDisplayCurrency(totalIncome)}</p>
            <div class="space-y-1">${topIncome}</div>
        </div>
    `;

    const expenseHtml = `
        <div class="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 class="text-lg font-bold mb-3 text-slate-900 dark:text-white">Expenses</h3>
            <p class="text-3xl font-bold text-red-600 dark:text-red-400 mb-4">${getDisplayCurrency(totalSpends)}</p>
            <div class="space-y-1">${topExpenses}</div>
        </div>
    `;

    const investmentHtml = `
        <div class="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 class="text-lg font-bold mb-3 text-slate-900 dark:text-white">Investments</h3>
            <p class="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-4">${getDisplayCurrency(totalInvestmentValue ?? trackedInvestment)}</p>
            <div class="space-y-1">${topInvestments}</div>
        </div>
    `;

    const incomeSection = document.getElementById('income-summary-body');
    const expenseSection = document.getElementById('expense-summary-body');
    const investmentSection = document.getElementById('investment-summary-body');

    if (incomeSection) incomeSection.innerHTML = incomeHtml;
    if (expenseSection) expenseSection.innerHTML = expenseHtml;
    if (investmentSection) investmentSection.innerHTML = investmentHtml;
}

function buildHistorySeries(monthly, initInv, initLiq) {
    let runningInv = initInv;
    let runningLiq = initLiq;
    return monthly.map(m => {
        runningInv += m.investment;
        runningLiq += m.liquidSavings;
        return {
            key: m.key,
            label: m.label,
            closingInvestment: runningInv,
            closingLiquid: runningLiq
        };
    });
}

function renderHistoryTable(historySeries) {
    const tbody = document.getElementById('history-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    historySeries.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-300';
        tr.innerHTML = `
            <td class="py-2 pr-4 font-medium">${item.label}</td>
            <td class="py-2 pr-4 text-purple-600 dark:text-purple-400">${getDisplayCurrency(item.closingInvestment)}</td>
            <td class="py-2 pr-4 text-teal-600 dark:text-teal-400">${getDisplayCurrency(item.closingLiquid)}</td>
        `;
        tbody.appendChild(tr);
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
            <td class="py-2 pr-4 text-teal-600 dark:text-teal-400">${getDisplayCurrency(m.closingLiquid ?? 0)}</td>
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

    const filteredTransactions = applyTransactionFilters(transactions);

    const typeStyles = {
        income: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
        expense: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
        investment: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
    };

    filteredTransactions.slice().reverse().slice(0, 50).forEach(t => {
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
    maskValuesOn = !maskValuesOn;
    localStorage.setItem('maskValues', maskValuesOn ? 'true' : 'false');
    updateMaskToggleButtons();

    if (activeDashboard === 'overview' || !document.getElementById('overview-content').classList.contains('hidden')) {
        render();
    }
}

function initMaskMode() {
    maskValuesOn = localStorage.getItem('maskValues') === 'true';
    updateMaskToggleButtons();
}

function updateMaskToggleButtons() {
    const topButton = document.getElementById('mask-toggle-button');
    const topIcon = document.getElementById('mask-toggle-icon');

    const icon = maskValuesOn ? '🙈' : '👁️';
    const pressed = maskValuesOn ? 'true' : 'false';

    if (topButton) {
        topButton.setAttribute('aria-pressed', pressed);
        topButton.classList.toggle('bg-surface-strong', maskValuesOn);
        topButton.classList.toggle('dark:bg-surface-strong', maskValuesOn);
        topButton.classList.toggle('bg-surface', !maskValuesOn);
        topButton.classList.toggle('dark:bg-surface-muted', !maskValuesOn);
        topButton.classList.toggle('text-text', maskValuesOn);
        topButton.classList.toggle('text-text-secondary', !maskValuesOn);
    }

    if (topIcon) topIcon.textContent = icon;
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
    const isDark = html.classList.toggle('dark');
    localStorage.setItem('darkMode', isDark ? 'true' : 'false');
    updateThemeToggleButton();
    // Redraw charts if visible
    if (trendChartInstance) trendChartInstance.resize();
    if (expenseChartInstance) expenseChartInstance.resize();
    if (netWorthChartInstance) netWorthChartInstance.resize();
    if (investmentChartInstance) investmentChartInstance.resize();
    if (historyChartInstance) historyChartInstance.resize();
    if (yearlyChartInstance) yearlyChartInstance.resize();
}

function toggleOverviewDetails() {
    const panel = document.getElementById('overview-more-details');
    const button = document.getElementById('overview-more-details-toggle');
    if (!panel || !button) return;

    const isHidden = panel.classList.toggle('hidden');
    button.textContent = isHidden ? 'More details' : 'Less details';
    button.setAttribute('aria-expanded', String(!isHidden));
}

// Load dark mode preference
function initDarkMode() {
    const storedPref = localStorage.getItem('darkMode');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const useDark = storedPref === 'true' || (storedPref === null && prefersDark);
    const html = document.documentElement;

    if (useDark) {
        html.classList.add('dark');
    } else {
        html.classList.remove('dark');
    }
    updateThemeToggleButton();
}

// ============================================================
// DASHBOARD NAVIGATION
// ============================================================
function switchDashboard(tab) {
    activeDashboard = 'overview';
    showSection(tab);
    render();
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
    setupTransactionFilters();
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

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
