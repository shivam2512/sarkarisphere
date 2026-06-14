const fetch = require('node-fetch'); // wait, native fetch is available in node 18+

async function check() {
  const urls = [
    'https://www.sarkariresult.com/result/',
    'https://www.sarkariresult.com/admitcard/',
    'https://www.sarkariresult.com/latestjob/'
  ];
  
  for(let pageUrl of urls) {
      console.log('Fetching', pageUrl);
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(pageUrl)}`;
      try {
          const res = await fetch(proxyUrl);
          const text = await res.text();
          if(!text.startsWith('{')) {
              console.log('Error: not JSON. First 100 chars:', text.substring(0, 100));
              continue;
          }
          const data = JSON.parse(text);
          const html = data.contents;
          if(html.includes('Cloudflare') || html.includes('captcha')) {
              console.log('Blocked by Cloudflare');
          } else {
              const ulMatch = html.match(/<ul/gi);
              console.log('Success! Number of ul tags:', ulMatch ? ulMatch.length : 0);
          }
      } catch(e) {
          console.error(e.message);
      }
  }
}
check();
