const https = require('https');

function decodeEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
}

function fetchGoogleRss(query) {
  return new Promise((resolve, reject) => {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;
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
            let rawSource = sourceMatch ? sourceMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/gi, '$1').trim() : 'Google News';
            let source = decodeEntities(rawSource);

            let title = rawTitle.replace(new RegExp(`\\s*-\\s*${source}\\s*$`, 'i'), '').trim();
            if (!title) title = rawTitle;
            title = decodeEntities(title);

            let link = linkMatch ? linkMatch[1].trim() : '';
            let pubDate = pubDateMatch ? pubDateMatch[1].trim() : '';
            let rawDesc = descMatch ? descMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/gi, '$1').trim() : '';
            let summary = rawDesc.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
            summary = decodeEntities(summary);
            if (summary.length > 280) summary = summary.substring(0, 277) + '...';

            if (title) {
              items.push({
                title,
                source,
                link,
                pubDate,
                summary: summary || `Live dispatch via ${source}: ${title}. Direct coverage sourced live from Google News.`
              });
            }
          }
          resolve(items);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(8000, () => {
      req.destroy();
      reject(new Error('Timeout fetching from Google News RSS'));
    });
  });
}

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

  const isTechWord = /\b(ece|electronics|semiconductor|chip|hardware|telecom|5g|6g|robot|robotics|ai|antenna|sensor|mems|battery|satellite|iit|cleanroom|lithography|transistor|inverter)\b/i.test(rawQuery);

  let searchQueries = [];
  if (isTechWord) {
    searchQueries = [rawQuery, `${rawQuery} ECE`];
  } else {
    searchQueries = [`${rawQuery} electronics`, `${rawQuery} ECE`, rawQuery];
  }

  let finalItems = [];
  for (const q of searchQueries) {
    try {
      const items = await fetchGoogleRss(q);
      if (items && items.length > 0) {
        finalItems = items;
        break;
      }
    } catch (err) {
      console.warn(`Query ${q} failed:`, err.message);
    }
  }

  return {
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
      count: finalItems.length,
      items: finalItems
    })
  };
};
