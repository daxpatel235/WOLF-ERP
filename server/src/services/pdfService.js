const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const TEMPLATE_DIR = path.join(__dirname, '..', '..', 'templates');

// Minimal {{key}} + {{#each items}}...{{/each}} template renderer — enough for
// our invoice / PO / RFQ documents without pulling in a templating engine.
function render(templateName, data = {}) {
  const file = path.join(TEMPLATE_DIR, templateName);
  let tpl = fs.readFileSync(file, 'utf8');

  // Repeated blocks: {{#each items}} ... {{field}} ... {{/each}}
  tpl = tpl.replace(/\{\{#each (\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_m, key, block) => {
    const rows = Array.isArray(data[key]) ? data[key] : [];
    return rows
      .map((row) =>
        block.replace(/\{\{(\w+)\}\}/g, (_m2, f) => (row[f] != null ? String(row[f]) : ''))
      )
      .join('');
  });

  // Simple scalars
  tpl = tpl.replace(/\{\{(\w+)\}\}/g, (_m, key) => (data[key] != null ? String(data[key]) : ''));
  return tpl;
}

// Convert HTML to a PDF Buffer using Puppeteer, loaded lazily so a missing or
// broken Chromium install can't crash the server at boot. Callers should catch.
async function htmlToPdf(html) {
  let puppeteer;
  try {
    puppeteer = require('puppeteer');
  } catch {
    throw Object.assign(new Error('PDF generation is unavailable (puppeteer not installed).'), {
      statusCode: 501,
    });
  }

  let browser;
  try {
    browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    return await page.pdf({ format: 'A4', printBackground: true, margin: { top: '16mm', bottom: '16mm', left: '14mm', right: '14mm' } });
  } catch (err) {
    logger.error(`PDF render failed: ${err.message}`);
    throw Object.assign(new Error('Could not render the PDF on the server.'), { statusCode: 500 });
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = { render, htmlToPdf };
