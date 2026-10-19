/**
 * Generate (or with --check, verify) every brand asset from src/brand/mark.ts:
 *   icons/icon.svg, icons/icon-{16,32,48,128}.png            (manifest icons)
 *   public/icons/icon-disabled.svg, icon-disabled-{size}.png  (toolbar when off)
 * PNGs are rasterized in headless Chromium (Playwright) for exact SVG rendering.
 * Run: node scripts/brand.ts [--check]
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { brandSvg, ICON_SIZES } from '../src/brand/mark.ts';

const check = process.argv.includes('--check');

const sets = [
  { dir: 'icons', name: 'icon', svg: brandSvg() },
  { dir: 'public/icons', name: 'icon-disabled', svg: brandSvg({ disabled: true, title: 'Request Interceptor (off)' }) },
];

function pngSize(file: string): [number, number] {
  const buf = readFileSync(file);
  if (buf.toString('ascii', 1, 4) !== 'PNG') throw new Error(`${file} is not a PNG`);
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
}

const problems: string[] = [];

if (check) {
  for (const set of sets) {
    const svgPath = `${set.dir}/${set.name}.svg`;
    if (!existsSync(svgPath) || readFileSync(svgPath, 'utf8') !== set.svg) {
      problems.push(`${svgPath} is out of date with src/brand/mark.ts`);
    }
    for (const size of ICON_SIZES) {
      const png = `${set.dir}/${set.name}-${size}.png`;
      if (!existsSync(png)) problems.push(`${png} is missing`);
      else {
        const [w, h] = pngSize(png);
        if (w !== size || h !== size) problems.push(`${png} is ${w}x${h}, expected ${size}x${size}`);
      }
    }
  }
  if (problems.length) {
    console.error(`Brand assets are stale — run \`pnpm brand\`:\n  ${problems.join('\n  ')}`);
    process.exit(1);
  }
  console.log('Brand assets match src/brand/mark.ts.');
} else {
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const set of sets) {
    writeFileSync(`${set.dir}/${set.name}.svg`, set.svg);
    for (const size of ICON_SIZES) {
      await page.setViewportSize({ width: size, height: size });
      await page.setContent(
        `<html><body style="margin:0;background:transparent">${set.svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`
      );
      await page.screenshot({ path: `${set.dir}/${set.name}-${size}.png`, omitBackground: true });
    }
  }
  await browser.close();
  console.log('Generated brand assets from src/brand/mark.ts.');
}
