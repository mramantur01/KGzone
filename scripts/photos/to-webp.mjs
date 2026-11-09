// Makes a .webp copy (about 2-3 times smaller) next to every .jpg in static/cars and static/parts.
// The site shows the .webp files; the .jpg stay for link previews in messengers (og:image).
// Run: node scripts/photos/to-webp.mjs
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const roots = ['static/cars', 'static/parts'];
let before = 0, after = 0, count = 0;
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
for (const root of roots) {
  for (const file of walk(root).filter((f) => /\.jpe?g$/i.test(f))) {
    const out = file.replace(/\.jpe?g$/i, '.webp');
    if (!fs.existsSync(out) || fs.statSync(out).mtimeMs < fs.statSync(file).mtimeMs) {
      fs.writeFileSync(out, await sharp(fs.readFileSync(file)).webp({ quality: 78, effort: 5 }).toBuffer());
    }
    before += fs.statSync(file).size;
    after += fs.statSync(out).size;
    count++;
  }
}
console.log(`${count} photos: ${(before / 1e6).toFixed(1)} MB jpg -> ${(after / 1e6).toFixed(1)} MB webp`);
