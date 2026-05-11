const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(file){
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function fail(message){
  console.error(`ERROR: ${message}`);
  process.exitCode = 1;
}

function extract(content, pattern, label, file){
  const match = content.match(pattern);
  if(!match){
    fail(`Could not find ${label} in ${file}`);
    return null;
  }
  return match[1];
}

const versionJson = JSON.parse(read('version.json'));
const swJs = read('sw.js');
const gameJs = read(path.join('src', 'game.js'));
const indexHtml = read('index.html');

const appVersion = versionJson.app;
const cacheVersion = versionJson.cache;
const swCache = extract(swJs, /const CACHE = '([^']+)'/, 'CACHE', 'sw.js');
const gameAppVersion = extract(gameJs, /const APP_VERSION = '([^']+)'/, 'APP_VERSION', 'src/game.js');
const gameCacheVersion = extract(gameJs, /const CACHE_VERSION = '([^']+)'/, 'CACHE_VERSION', 'src/game.js');
const htmlVersionLabel = extract(indexHtml, /data-version-label>v([^<]+)<\/span>/, 'fallback version label', 'index.html');

console.log('Release consistency check');
console.log(`- version.json app: ${appVersion}`);
console.log(`- version.json cache: ${cacheVersion}`);
console.log(`- sw.js CACHE: ${swCache}`);
console.log(`- src/game.js APP_VERSION: ${gameAppVersion}`);
console.log(`- src/game.js CACHE_VERSION: ${gameCacheVersion}`);
console.log(`- index.html fallback label: v${htmlVersionLabel}`);

if(swCache !== cacheVersion){
  fail(`sw.js CACHE (${swCache}) does not match version.json cache (${cacheVersion})`);
}

if(gameAppVersion !== appVersion){
  fail(`src/game.js APP_VERSION (${gameAppVersion}) does not match version.json app (${appVersion})`);
}

if(gameCacheVersion !== cacheVersion){
  fail(`src/game.js CACHE_VERSION (${gameCacheVersion}) does not match version.json cache (${cacheVersion})`);
}

const expectedLabel = `${appVersion} / ${cacheVersion}`;
if(htmlVersionLabel !== expectedLabel){
  fail(`index.html fallback label (${htmlVersionLabel}) does not match expected (${expectedLabel})`);
}

if(process.exitCode){
  console.error('Release metadata is inconsistent.');
}else{
  console.log('Release metadata is consistent.');
}
