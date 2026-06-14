const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');

const app = express();
app.use(cors());

// ── Serve the static frontend files ──────────────────────────────────────────
app.use(express.static(path.join(__dirname)));

// ── Scraper Proxy ─────────────────────────────────────────────────────────────
app.get('/api/scrape', async (req, res) => {
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).json({ error: 'URL is required' });
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

    // Remove all scripts, styles, ads, iframes, nav elements globally
    $('script, style, iframe, noscript, .adsbygoogle, ins[class*="adsbygoogle"]').remove();
    $('header, footer, nav, .header, .footer, .site-header, .site-footer, .navbar').remove();
    $('#header, #footer, #nav, #navbar, #sidebar, .sidebar, #menu, .menu').remove();

    // Remove competitor's social links (Telegram/WhatsApp)
    $('a').each((_, el) => {
      const href = ($(el).attr('href') || '').toLowerCase();
      const text = $(el).text().toLowerCase();
      if (href.includes('t.me') || href.includes('telegram') || href.includes('whatsapp') || text.includes('telegram') || text.includes('whatsapp')) {
        // Remove the parent element if it only contains this link to avoid empty spaces
        const parent = $(el).parent();
        if (parent.text().trim() === $(el).text().trim()) {
          parent.remove();
        } else {
          $(el).remove();
        }
      }
    });

    // Normalize all elements to create a proper single format (strip classes, IDs, inline styles)
    $('*').removeAttr('class').removeAttr('id').removeAttr('style').removeAttr('width').removeAttr('height').removeAttr('bgcolor').removeAttr('color').removeAttr('align').removeAttr('valign');

    let contentHtml = '';

    // ── SarkariResult ──────────────────────────────────────────────────────────
    if (targetUrl.includes('sarkariresult.com')) {
      const post = $('#post, .post-entry, .entry-content, article').first();
      if (post.length) {
        // Remove internal links back to the source
        post.find('a').each((_, el) => {
          const href = ($(el).attr('href') || '').toLowerCase();
          if (href.includes('sarkariresult')) {
            $(el).replaceWith(`<span>${$(el).text()}</span>`);
          }
        });
        contentHtml = post.html();
      }
    }

    // ── SarkariNetwork ────────────────────────────────────────────────────────
    else if (targetUrl.includes('sarkarinetwork.com')) {
      const post = $('.entry-content, article, .post-content').first();
      if (post.length) {
        post.find('a').each((_, el) => {
          const href = ($(el).attr('href') || '').toLowerCase();
          if (href.includes('sarkarinetwork')) {
            $(el).replaceWith(`<span>${$(el).text()}</span>`);
          }
        });
        contentHtml = post.html();
      }
    }

    // ── FreeJobAlert ──────────────────────────────────────────────────────────
    else if (targetUrl.includes('freejobalert.com')) {
      const post = $('.entry-content, .post-content, article').first();
      if (post.length) {
        post.find('a').each((_, el) => {
          const href = ($(el).attr('href') || '').toLowerCase();
          if (href.includes('freejobalert')) {
            $(el).replaceWith(`<span>${$(el).text()}</span>`);
          }
        });
        contentHtml = post.html();
      }
    }

    // ── FreshersNow / IndGovtJobs ─────────────────────────────────────────────
    else if (targetUrl.includes('freshersnow.com') || targetUrl.includes('indgovtjobs.in')) {
      const post = $('.entry-content, .post-content, article, .td-post-content').first();
      if (post.length) {
        contentHtml = post.html();
      }
    }

    // ── Generic Fallback: extract largest table ────────────────────────────────
    if (!contentHtml || contentHtml.trim().length < 100) {
      let maxTable = null;
      let maxLen = 0;
      $('table').each((_, el) => {
        const textLen = $(el).text().trim().length;
        if (textLen > maxLen) {
          maxLen = textLen;
          maxTable = $(el);
        }
      });

      if (maxTable && maxLen > 50) {
        contentHtml = $.html(maxTable);
      } else {
        contentHtml = '';
      }
    }

    // ── Final: strip brand mentions from the text ─────────────────────────────
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

    // Graceful fallback if no content was found but request succeeded
    if (!contentHtml || contentHtml.trim().length < 50) {
      contentHtml = `
        <div style="text-align:center; padding: 40px; font-family: sans-serif;">
          <h3 style="color: #d32f2f; margin-bottom: 15px;">Job Details Not Available in Viewer</h3>
          <p style="color: #555; margin-bottom: 20px;">This job post uses a complex layout that cannot be formatted properly, or it requires bot verification.</p>
          <a href="${targetUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: #1a237e; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
            View Full Job Details Directly
          </a>
        </div>
      `;
    }

    res.json({ html: contentHtml });

  } catch (error) {
    console.error('Scraping Error for', targetUrl, ':', error.message);
    const fallbackHtml = `
      <div style="text-align:center; padding: 40px; font-family: sans-serif;">
        <h3 style="color: #d32f2f; margin-bottom: 15px;">Bot Protection Enabled</h3>
        <p style="color: #555; margin-bottom: 20px;">The official source website has blocked our automated scraper.</p>
        <a href="${targetUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: #1a237e; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
          View Job Details Directly
        </a>
      </div>
    `;
    res.json({ html: fallbackHtml });
  }
});

// ── Start Server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  ✅ SarkariSphere Backend is running!`);
  console.log(`  🖥️  Local:   http://localhost:${PORT}`);
  console.log(`  📱 Mobile:  http://192.168.0.104:${PORT}\n`);
});
