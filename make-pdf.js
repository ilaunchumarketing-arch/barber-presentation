const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function run() {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  const filePath = 'file://' + path.resolve(__dirname, 'index.html');
  await page.goto(filePath, { waitUntil: 'networkidle0', timeout: 15000 });

  const slides = await page.$$('.slide');
  console.log(`Found ${slides.length} slides`);

  const { PDFDocument, rgb } = require('pdf-lib');
  // Use puppeteer to screenshot each slide then combine

  const pages = [];
  for (let i = 0; i < slides.length; i++) {
    // Click dot to navigate
    const dots = await page.$$('.dot');
    if (dots[i]) await dots[i].click();
    await new Promise(r => setTimeout(r, 600));
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
    pages.push(buf);
    console.log(`Captured slide ${i+1}/${slides.length}`);
  }

  await browser.close();

  // Build PDF using pdf-lib
  const pdfDoc = await PDFDocument.create();
  for (const imgBuf of pages) {
    const jpgImage = await pdfDoc.embedJpg(imgBuf);
    const page = pdfDoc.addPage([1280, 720]);
    page.drawImage(jpgImage, { x: 0, y: 0, width: 1280, height: 720 });
  }

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync('presentation.pdf', pdfBytes);
  console.log('SUCCESS: presentation.pdf');
}

run().catch(e => console.error('ERROR:', e.message));
