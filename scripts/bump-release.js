const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(file){
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function write(file, content){
  fs.writeFileSync(path.join(root, file), content, 'utf8');
}

function replaceOne(content, pattern, replacement, label, file){
  if(!pattern.test(content)){
    throw new Error(`Could not find ${label} in ${file}`);
  }
  pattern.lastIndex = 0;
  return content.replace(pattern, replacement);
}

const [appVersion, cacheVersion] = process.argv.slice(2);

if(!appVersion || !cacheVersion){
  console.error('Usage: node scripts/bump-release.js <app-version> <cache-version>');
  process.exit(1);
}

const versionJsonPath = 'version.json';
const swPath = 'sw.js';
const gamePath = path.join('src', 'game.js');
const indexPath = 'index.html';

const versionJson = JSON.parse(read(versionJsonPath));
versionJson.app = appVersion;
versionJson.cache = cacheVersion;
write(versionJsonPath, `${JSON.stringify(versionJson, null, 2)}\n`);

let swJs = read(swPath);
swJs = replaceOne(swJs, /const CACHE = '([^']+)'/, `const CACHE = '${cacheVersion}'`, 'CACHE', swPath);
write(swPath, swJs);

let gameJs = read(gamePath);
gameJs = replaceOne(gameJs, /const APP_VERSION = '([^']+)'/, `const APP_VERSION = '${appVersion}'`, 'APP_VERSION', gamePath);
gameJs = replaceOne(gameJs, /const CACHE_VERSION = '([^']+)'/, `const CACHE_VERSION = '${cacheVersion}'`, 'CACHE_VERSION', gamePath);
write(gamePath, gameJs);

let indexHtml = read(indexPath);
indexHtml = replaceOne(
  indexHtml,
  /data-version-label>v([^<]+)<\/span>/,
  `data-version-label>v${appVersion} / ${cacheVersion}</span>`,
  'fallback version label',
  indexPath
);
write(indexPath, indexHtml);

console.log(`Updated release metadata to v${appVersion} / ${cacheVersion}`);
