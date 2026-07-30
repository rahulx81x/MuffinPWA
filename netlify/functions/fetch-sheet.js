exports.handler = async function (event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Cache-Control': 'no-store'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: 'Method Not Allowed'
    };
  }

  const incomeSheetUrl = process.env.SECRET_GOOGLE_SHEETS_URL_INCOME;
  const expenseSheetUrl = process.env.SECRET_GOOGLE_SHEETS_URL_EXPENSE;
  const investmentSheetUrl = process.env.SECRET_GOOGLE_SHEETS_URL_INVESTMENT;
  const combinedSheetUrl = process.env.SECRET_GOOGLE_SHEETS_URL;

  const usingSeparateSheets = incomeSheetUrl && expenseSheetUrl && investmentSheetUrl;
  const usingCombinedSheet = combinedSheetUrl;

  if (!usingSeparateSheets && !usingCombinedSheet) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Google Sheet URL(s) are not configured on the server.' })
    };
  }

  try {
    if (usingSeparateSheets) {
      const [incomeRes, expenseRes, investmentRes] = await Promise.all([
        fetch(incomeSheetUrl),
        fetch(expenseSheetUrl),
        fetch(investmentSheetUrl)
      ]);

      if (!incomeRes.ok || !expenseRes.ok || !investmentRes.ok) {
        return {
          statusCode: 502,
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ error: 'Could not fetch one or more Google Sheet endpoints.' })
        };
      }

      const [incomeCsv, expenseCsv, investmentCsv] = await Promise.all([
        incomeRes.text(),
        expenseRes.text(),
        investmentRes.text()
      ]);

      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify({ incomeCsv, expenseCsv, investmentCsv })
      };
    }

    const response = await fetch(combinedSheetUrl);
    const csvText = await response.text();

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Could not fetch Google Sheet data.' })
      };
    }

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'text/csv; charset=utf-8'
      },
      body: csvText
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to proxy Google Sheet data.' })
    };
  }
};
