'use strict';

// Build real Hexo pages with test-only posts, without touching formal content/db/public.
const fs = require('fs');
const path = require('path');
const Hexo = require('hexo');
const root = path.resolve(__dirname, '..');
async function build(destination) {
  if (fs.existsSync(destination)) throw new Error('Fixture destination already exists; refusing to overwrite');
  fs.mkdirSync(destination, { recursive: true });
  for (const file of ['_config.yml', '_config.firefly.yml', 'package.json']) {
    fs.copyFileSync(path.join(root, file), path.join(destination, file));
  }
  for (const dir of ['source', 'scripts', 'scaffolds', 'lib']) {
    fs.cpSync(path.join(root, dir), path.join(destination, dir), { recursive: true });
  }
  fs.mkdirSync(path.join(destination, 'themes'));
  fs.symlinkSync(path.join(root, 'themes/firefly'), path.join(destination, 'themes/firefly'));
  fs.symlinkSync(path.join(root, 'node_modules'), path.join(destination, 'node_modules'));
  for (const name of ['reading-a', 'reading-b']) {
    fs.copyFileSync(path.join(__dirname, 'fixtures', name + '.md'), path.join(destination, 'source/_posts', name + '.md'));
  }
  fs.writeFileSync(path.join(destination, 'source/reading-fixture.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="900" viewBox="0 0 2000 900"><rect width="2000" height="900" fill="#7565a8"/><circle cx="1000" cy="450" r="300" fill="#f1f4fa"/><text x="1000" y="470" text-anchor="middle" font-size="70" fill="#393746">Reading test 2000 x 900</text></svg>');
  const hexo = new Hexo(destination, { silent: true });
  try {
    await hexo.init();
    await hexo.call('generate');
  } finally {
    await hexo.exit();
  }
  return path.join(destination, 'public');
}
module.exports = build;
if (require.main === module) {
  if (!process.argv[2]) throw new Error('Usage: node tests/build-reading-fixture.cjs <new temporary directory>');
  build(path.resolve(process.argv[2])).then(p => console.log('Fixture public: ' + p)).catch(e => { console.error(e); process.exitCode = 1; });
}
