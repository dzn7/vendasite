/*
  Generates one PDF per chapter from guia_investimento_tailwind.html using Puppeteer.
  Output: d:\Projeto de Vendas\pdf\capN.pdf (one per chapter)
*/

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

(async () => {
  const projectDir = path.resolve('d:/Projeto de Vendas');
  const htmlPath = path.join(projectDir, 'guia_investimento_tailwind.html');
  const outputDir = path.join(projectDir, 'pdf');

  if (!fs.existsSync(htmlPath)) {
    console.error('HTML not found:', htmlPath);
    process.exit(1);
  }
  await fs.promises.mkdir(outputDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--font-render-hinting=medium',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
  // Use print media to honor @media print rules (safe even if none exist)
  await page.emulateMediaType('print');

  // Load local file via file:// URI
  const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');
  await page.goto(fileUrl, { waitUntil: 'networkidle2', timeout: 120000 });
  // Wait for fonts to be ready if supported
  try {
    await page.evaluate(() => (document.fonts && document.fonts.ready) ? document.fonts.ready : true);
  } catch {}

  // Collect chapter IDs (div.page with id like cap1, cap2...)
  const chapterIds = await page.evaluate(() => {
    const pages = Array.from(document.querySelectorAll('div.page[id^="cap"]'));
    // Prefer only exact chapter containers (cap + number) and ignore subsection anchors (capX-Y)
    const ids = pages
      .map(el => el.id)
      .filter(id => /^cap\d+$/.test(id));
    // Ensure natural numeric sort: cap1, cap2, cap10...
    return ids.sort((a, b) => parseInt(a.replace('cap','')) - parseInt(b.replace('cap','')));
  });

  if (!chapterIds.length) {
    console.error('No chapters found (div.page with id="capN").');
    await browser.close();
    process.exit(1);
  }

  console.log('Chapters found:', chapterIds.join(', '));

  // Prepare a reusable <style> to control visibility per chapter
  await page.evaluate(() => {
    let style = document.getElementById('pdf-chapter-style');
    if (!style) {
      style = document.createElement('style');
      style.id = 'pdf-chapter-style';
      document.head.appendChild(style);
    }
  });

  for (const chapId of chapterIds) {
    console.log('Rendering', chapId);
    // Show only the target chapter via CSS (more reliable than inline styles)
    await page.evaluate((targetId) => {
      const style = document.getElementById('pdf-chapter-style');
      if (style) {
        style.textContent = `
          @page { margin: 18mm 14mm; }
          body { background: #ffffff !important; }
          .page { display: none !important; }
          #${targetId} { display: block !important; }
        `;
      }
      const el = document.getElementById(targetId);
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
      window.scrollTo(0, 0);
    }, chapId);

    // Ensure the chapter exists and has measurable height
    const ready = await page.evaluate((targetId) => {
      const el = document.getElementById(targetId);
      if (!el) return { ok: false, reason: 'not-found' };
      const rect = el.getBoundingClientRect();
      const textLen = (el.innerText || '').trim().length;
      return { ok: rect.height > 10 && textLen > 10, height: rect.height, textLen };
    }, chapId);

    if (!ready.ok) {
      console.warn(`Warning: ${chapId} might be empty (h=${ready.height}, t=${ready.textLen}). Adding extra delay.`);
      await new Promise(res => setTimeout(res, 600));
    }

    // Wait a tick for layout (compat delay)
    await new Promise(res => setTimeout(res, 200));

    const num = chapId.replace('cap', '');
    const outFile = path.join(outputDir, `${chapId}.pdf`);

    await page.pdf({
      path: outFile,
      printBackground: true,
      format: 'A4',
      preferCSSPageSize: true,
      margin: { top: '18mm', right: '14mm', bottom: '18mm', left: '14mm' },
    });

    console.log('Saved:', outFile);
  }

  await browser.close();
  console.log('All chapter PDFs generated in:', outputDir);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
