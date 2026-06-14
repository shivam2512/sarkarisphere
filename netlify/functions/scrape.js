const axios = require('axios');
const cheerio = require('cheerio');

exports.handler = async function (event, context) {
  // Only allow GET
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const targetUrl = event.queryStringParameters?.url;

  if (!targetUrl) {
    return { statusCode: 400, body: JSON.stringify({ error: 'URL is required' }) };
  }

  try {
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://www.google.com/',
        'Cache-Control': 'no-cache'
      },
      timeout: 12000
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Remove scripts, styles, ads, navs
    $('script, style, iframe, noscript, .adsbygoogle, ins[class*="adsbygoogle"]').remove();
    $('header, footer, nav, .header, .footer, .site-header, .site-footer, .navbar').remove();
    $('#header, #footer, #nav, #navbar, #sidebar, .sidebar, #menu, .menu').remove();

    let contentHtml = '';

    if (targetUrl.includes('sarkariresult.com')) {
      const post = $('#post, .post-entry, .entry-content, article').first();
      if (post.length) {
        post.find('a').each((_, el) => {
          const href = ($(el).attr('href') || '').toLowerCase();
          if (href.includes('sarkariresult')) $(el).replaceWith(`<span>${$(el).text()}</span>`);
        });
        contentHtml = post.html();
      }
    } else if (targetUrl.includes('sarkarinetwork.com')) {
      const post = $('.entry-content, article, .post-content').first();
      if (post.length) {
        post.find('a').each((_, el) => {
          const href = ($(el).attr('href') || '').toLowerCase();
          if (href.includes('sarkarinetwork')) $(el).replaceWith(`<span>${$(el).text()}</span>`);
        });
        contentHtml = post.html();
      }
    } else if (targetUrl.includes('freejobalert.com')) {
      const post = $('.entry-content, .post-content, article').first();
      if (post.length) {
        post.find('a').each((_, el) => {
          const href = ($(el).attr('href') || '').toLowerCase();
          if (href.includes('freejobalert')) $(el).replaceWith(`<span>${$(el).text()}</span>`);
        });
        contentHtml = post.html();
      }
    } else if (targetUrl.includes('freshersnow.com') || targetUrl.includes('indgovtjobs.in')) {
      const post = $('.entry-content, .post-content, article, .td-post-content').first();
      if (post.length) contentHtml = post.html();
    }

    // Generic fallback: extract the largest table
    if (!contentHtml || contentHtml.trim().length < 100) {
      let maxTable = null, maxLen = 0;
      $('table').each((_, el) => {
        const textLen = $(el).text().trim().length;
        if (textLen > maxLen) { maxLen = textLen; maxTable = $(el); }
      });
      contentHtml = (maxTable && maxLen > 50) ? $.html(maxTable) : '';
    }

    // Strip brand mentions
    if (contentHtml) {
      contentHtml = contentHtml
        .replace(/sarkariresult\.com/gi, 'sarkarisphere.in')
        .replace(/sarkari\s*result/gi, 'SarkariSphere')
        .replace(/sarkarinetwork\.com/gi, 'sarkarisphere.in')
        .replace(/sarkari\s*network/gi, 'SarkariSphere')
        .replace(/freejobalert\.com/gi, 'sarkarisphere.in')
        .replace(/free\s*job\s*alert/gi, 'SarkariSphere')
        .replace(/freshersnow\.com/gi, 'sarkarisphere.in')
        .replace(/freshersnow/gi, 'SarkariSphere')
        .replace(/indgovtjobs\.in/gi, 'sarkarisphere.in')
        .replace(/indgovtjobs/gi, 'SarkariSphere');
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ html: contentHtml })
    };

  } catch (error) {
    console.error('Scraping Error for', targetUrl, ':', error.message);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to extract content', message: error.message })
    };
  }
};
