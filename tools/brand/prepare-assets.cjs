// Run from the repository root: node tools/brand/prepare-assets.cjs
// Preserve the supplied artwork; only trim transparent padding and encode for web.
const { createRequire } = require('node:module');
const path = require('node:path');
const fs = require('node:fs/promises');
const root = path.resolve(__dirname, '../..');
const frontRequire = createRequire(path.join(root, 'front/package.json'));
const sharp = createRequire(frontRequire.resolve('next/package.json'))('sharp');
const source = path.join(root, 'docs/LOGO AZUL Y ORO/LOGO AZUL Y ORO');
const destination = path.join(root, 'front/public/brand');

async function prepare() {
  await fs.mkdir(destination, { recursive: true });
  for (const [original, output] of [['COLOR', 'color'], ['BLANCO', 'white']]) {
    await sharp(path.join(source, `LOGO/PNG/LOGO ${original}.png`))
      .extract({ left: 146, top: 297, width: 757, height: 471 })
      .webp({ lossless: true })
      .toFile(path.join(destination, `logo-${output}.webp`));
  }
  for (const [original, output] of [['FAVI ICON AZUL', 'blue'], ['FAV ICON AMARILLO', 'gold']]) {
    await sharp(path.join(source, `FAV ICON/PNG/${original}.png`))
      .extract({ left: 379, top: 388, width: 235, height: 280 })
      .resize(128, 128, { fit: 'contain', background: '#00000000' })
      .png()
      .toFile(path.join(destination, `icon-${output}.png`));
  }
  await sharp(path.join(destination, 'icon-blue.png')).resize(64, 64)
    .toFile(path.join(root, 'front/app/icon.png'));
  await sharp(path.join(source, 'FAV ICON/PNG/FAVI ICON AZUL.png'))
    .extract({ left: 379, top: 388, width: 235, height: 280 })
    .resize(140, 140, { fit: 'contain', background: '#ffffff' })
    .extend({ top: 20, bottom: 20, left: 20, right: 20, background: '#ffffff' })
    .flatten({ background: '#ffffff' })
    .toFile(path.join(root, 'front/app/apple-icon.png'));
  await sharp(path.join(source, 'IMG/TRIBUNA RECORTE-100.jpg'))
    .resize(1600).webp({ quality: 80 })
    .toFile(path.join(destination, 'tribuna.webp'));
  await sharp(path.join(destination, 'logo-white.webp'))
    .resize(960, 510, { fit: 'contain', background: '#275585' })
    .extend({ top: 60, bottom: 60, left: 120, right: 120, background: '#275585' })
    .flatten({ background: '#275585' })
    .png()
    .toFile(path.join(destination, 'social.png'));
}

prepare().catch(error => { console.error(error); process.exitCode = 1; });
