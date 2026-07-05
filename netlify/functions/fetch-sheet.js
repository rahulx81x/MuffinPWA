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

  const sheetUrl = process.env.SECRET_GOOGLE_SHEETS_URL;

  if (!sheetUrl || sheetUrl.includes('PASTE_YOUR')) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Google Sheet URL is not configured on the server.' })
    };
  }

  try {
    const response = await fetch(sheetUrl);
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
