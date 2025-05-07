const axios = require('axios');
const fs = require('fs');
const crypto = require('crypto');
const cheerio = require('cheerio');

const TELEGRAM_BOT_TOKEN = '8042101012:AAENrKrhffA5NvORMKHDkMUs4cMY7ODQ2mk';
const CHAT_ID = '893420022';
const STATE_FILE = 'page-hashes.json';

// Pages to monitor with targeted selectors
const monitoredPages = [
  {
    name: 'JAC Results',
    url: 'https://jacresults.com/',
    selector: '.noticelist' // or update if you know the specific div
  },
  {
    name: 'Portal',
    url: 'https://jacexamportal.in/',
    selector: 'body' // change to specific class/id if needed
  }
];

let pageHashes = {};
if (fs.existsSync(STATE_FILE)) {
  try {
    pageHashes = JSON.parse(fs.readFileSync(STATE_FILE));
  } catch (e) {
    console.error('⚠️ Failed to load state file:', e.message);
  }
}

async function sendTelegramMessage(message) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  await axios.post(url, {
    chat_id: CHAT_ID,
    text: message,
    parse_mode: 'Markdown'
  });
  console.log('📩 Telegram alert sent.');
}

function hashContent(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function checkPages() {
  for (let page of monitoredPages) {
    try {
      const res = await axios.get(page.url);
      const $ = cheerio.load(res.data);
      const target = $(page.selector).html()?.trim() || '';

      const currentHash = hashContent(target);

      if (!pageHashes[page.url]) {
        pageHashes[page.url] = currentHash;
        console.log(`✅ Monitoring started: ${page.name}`);
      } else if (pageHashes[page.url] !== currentHash) {
        console.log(`🔔 Change detected on *${page.name}*!\n👉 ${page.url}`);
        await sendTelegramMessage(`🔔 Change detected on *${page.name}*!\n👉 ${page.url}`);
        pageHashes[page.url] = currentHash;
      }
    } catch (err) {
      console.error(`❌ Error checking ${page.name}:`, err.message);
    }
  }

  fs.writeFileSync(STATE_FILE, JSON.stringify(pageHashes, null, 2));
}

// Run every 2 minutes
setInterval(checkPages, 2 * 60 * 1000);
checkPages();
