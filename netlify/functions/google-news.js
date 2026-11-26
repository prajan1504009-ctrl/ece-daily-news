const https = require('https');

exports.handler = async function (event, context) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: ''
    };
  }

  const rawQuery = (event.queryStringParameters && event.queryStringParameters.q)
    ? event.queryStringParameters.q.trim()
    : 'electronics semiconductor';

  // Build targeted ECE query for Google News RSS
  const eceQuery = `${rawQuery} (ECE OR electronics OR semiconductor OR telecom OR hardware OR engineering)`;
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(eceQuery)}&hl=en-IN&gl=IN&ceid=IN:en`;

  return new Promise((resolve) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
      let rawData = '';
      res.on('data', chunk => rawData += chunk);
      res.on('end', () => {
        try {
          const items = [];
          const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
          let match;

          while ((match = itemRegex.exec(rawData)) !== null && items.length < 16) {
            const itemXml = match[1];

            const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/i);
            const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/i);
            const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
            const sourceMatch = itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/i);
            const descMatch = itemXml.match(/<description>([\s\S]*?)<\/description>/i);

            let rawTitle = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/gi, '$1').trim() : '';
            let source = sourceMatch ? sourceMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/gi, '$1').trim() : 'Google News';
            let title = rawTitle.replace(new RegExp(`\\s*-\\s*${source}\\s*$`, 'i'), '').trim();
            if (!title) title = rawTitle;

            let link = linkMatch ? linkMatch[1].trim() : '';
            let pubDate = pubDateMatch ? pubDateMatch[1].trim() : '';
            let rawDesc = descMatch ? descMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/gi, '$1').trim() : '';
            let summary = rawDesc.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
            if (summary.length > 280) summary = summary.substring(0, 277) + '...';

            if (title) {
              items.push({
                title,
                source,
                link,
                pubDate,
                summary: summary || `Live dispatch via ${source}: ${title}. Direct coverage sourced live from Google News.`,
                query: rawQuery
              });
            }
          }

          resolve({
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type',
              'Cache-Control': 'public, max-age=180'
            },
            body: JSON.stringify({
              status: 'ok',
              query: rawQuery,
              count: items.length,
              items
            })
          });
        } catch (parseErr) {
          resolve({
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ status: 'error', message: parseErr.message })
          });
        }
      });
    });

    req.on('error', (err) => {
      resolve({
        statusCode: 502,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ status: 'error', message: err.message })
      });
    });

    req.setTimeout(8000, () => {
      req.abort();
      resolve({
        statusCode: 504,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ status: 'error', message: 'Google News request timed out' })
      });
    });
  });
};
