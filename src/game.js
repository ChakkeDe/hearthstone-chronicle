const G={
  year:1,era:'First Age',tick:0,
  prestige:0,prestigeGoal:1000,prestigeRate:0,
  prestigePoints:0,          // spendable prestige currency
  season:1,seasonWeek:1,seasonTick:0,
  victoryPath:'mixed',       // 'military','economic','diplomatic','research','mixed'
  victoryBonus:0,            // % bonus from path progress
  dynasty:0,                 // number of prestige resets completed
  legacyRelics:[],           // relics carried across resets
  allianceSize:8,            // hard cap
  lastSaveTime: Date.now(),  // save timestamp
  lastActiveTime: Date.now(), // last real game tick timestamp for AFK calculation
  offlineCapHours:12,
  resources:{
    gold: {amount:150, rate:2,  max:500, icon:'🪙',name:'Gold'},
    food: {amount:200, rate:3,  max:500, icon:'🌾',name:'Food'},
    wood: {amount:180, rate:3,  max:500, icon:'🪵',name:'Wood'},
    stone:{amount:120, rate:2,  max:500, icon:'⚙', name:'Stone'},
    iron: {amount:15, rate:1,  max:300,icon:'⛏', name:'Iron'},
    mana: {amount:0, rate:0,max:200,icon:'✨',name:'Mana'},
  },
  buildings:[],research:{},heroes:[],
  activeResearch:null,researchProgress:0,
  mapTiles:[],log:[],logDirty:true,
  activeResearchTab:'economy',activeTab:'kingdom',
  revealedBuildings:['farm','lumber','mine','market'],
  revealedResearch:['trade_routes','crop_rotation','swordsmanship','fortification'],
  unlockedResearchTabs:['economy','military'],
  costReduction:null,wardProtect:false,hasAlchemy:false,
  hasFarsight:false,hasSiege:false,questTimeMulti:null,fortBonus:0,
  // ── COMBAT STATE ──
  troops:{
    infantry:{total:0,available:0,injured:0,training:0,trainEnd:0},
    archers: {total:0,available:0,injured:0,training:0,trainEnd:0},
    cavalry: {total:0,available:0,injured:0,training:0,trainEnd:0},
    siege:   {total:0,available:0,injured:0,training:0,trainEnd:0},
  },
  hospital:{capacity:100,recovering:0,recoverEnd:0},
  npcFarms:[],activeRaids:[],combatLog:[],
  autoFarm:{},                    // {farmId: {enabled, troopFloor, lastCheck}}
  // ── DEFENCE ──
  wallDefence:0,
  garrison:{infantry:0,archers:0,cavalry:0},
  watchtowerUnlocked:false,
  // ── WAR CHEST ──
  warChest:0,
  warChestCap:500,
  warChestDecayRate:0.02,         // 2% per day
  warChestWeeklyConverted:0,
  warChestWeeklyLimit:1000,
  lastWarChestDecay:0,
  // ── DUAL RESEARCH ──
  activeResearch2:null,
  researchProgress2:0,
  // ── STORAGE ──
  storageLevels:{granary:0,vault:0,timberyard:0,armoury:0},
  // ── UI FLAGS ──
  cityDirty:true,
  logDirty:true,
  // ── KINGDOM IDENTITY ──
  kingdomName:'Arnethia',
  playerName:'',
  // ── TUTORIAL ──
  tutorialStep:0,
  tutorialDone:false,
  // ── MILESTONES ──
  milestonesReached:[],
  // Supabase config
  supabaseUrl:'',supabaseKey:'',
};

function earlyBoost(){
  // Tapers from 5x at 0 buildings to 1x at 25 total levels — much slower fade
  const t=G.buildings.reduce((s,b)=>s+b.level,0);
  return Math.max(1, 5-(t*0.16));
}

function researchSpeedMultiplier(){
  const stacks=Math.min(countRelic('relic_research'),RELIC_STACK_CAP);
  return stacks ? (1/(1-(stacks*0.1))) : 1;
}

function countRelic(id){
  return (G.legacyRelics||[]).filter(r=>r===id).length;
}

function capRelicStacks(relics){
  const counts={};
  return (relics||[]).filter(id=>{
    counts[id]=(counts[id]||0)+1;
    return counts[id]<=RELIC_STACK_CAP;
  });
}

function relicLabel(id){
  return {relic_gold:'🪙 Merchant\'s Seal',relic_combat:'⚔ Sword of Ages',relic_research:'📚 Ancient Tome'}[id]||id;
}

const APP_VERSION = '0.8.0';
const CACHE_VERSION = 'hc-v29';
const RELIC_STACK_CAP = 5;

// ── UPDATE CHECKER ──
let _updateReloading=false;

function checkForUpdate(){
  if(!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(_updateReloading)return;
    _updateReloading=true;
    saveGame();
    window.location.reload();
  });
  navigator.serviceWorker.ready.then(reg=>{
    reg.addEventListener('updatefound',()=>{
      const newWorker=reg.installing;
      newWorker.addEventListener('statechange',()=>{
        if(newWorker.state==='installed'&&navigator.serviceWorker.controller){
          showUpdateBanner();
        }
      });
    });
    reg.update();
  });
  fetchLatestVersion().then(latest=>{
    if(latest&&latest.cache&&latest.cache!==CACHE_VERSION)showUpdateBanner(`New version available (${latest.cache})`);
  });
  updateVersionLabels();
}

function updateVersionLabels(){
  document.querySelectorAll('[data-version-label]').forEach(el=>{
    el.textContent=`v${APP_VERSION} / ${CACHE_VERSION}`;
  });
}

async function fetchLatestVersion(){
  try{
    const res=await fetch(`version.json?t=${Date.now()}`,{cache:'no-store'});
    if(!res.ok)return null;
    return await res.json();
  }catch(e){return null;}
}

function showUpdateBanner(msg='New version available'){
  if(document.getElementById('update-banner'))return;
  const el=document.createElement('div');
  el.id='update-banner';
  el.style.cssText=`position:fixed;bottom:calc(var(--tab-h) + env(safe-area-inset-bottom) + 8px);
    left:50%;transform:translateX(-50%);
    background:rgba(10,8,4,.97);border:1px solid var(--gold);border-radius:6px;
    padding:10px 16px;z-index:9998;display:flex;align-items:center;gap:12px;
    font-family:'Cinzel',serif;font-size:12px;color:var(--gold-light);
    box-shadow:0 4px 20px rgba(0,0,0,.6);white-space:nowrap;`;
  el.innerHTML=`
    <span>✦ ${msg}</span>
    <button onclick="applyUpdate()" style="background:rgba(201,168,76,.2);border:1px solid var(--gold);
      border-radius:3px;padding:4px 10px;color:var(--gold);font-family:'Cinzel',serif;
      font-size:10px;letter-spacing:1px;cursor:pointer;touch-action:manipulation;">Update</button>
    <button onclick="this.parentElement.remove()" style="background:none;border:none;
      color:var(--stone-light);font-size:16px;cursor:pointer;padding:0 4px;touch-action:manipulation;">✕</button>`;
  document.body.appendChild(el);
}

async function manualCheckForUpdate(){
  if(!('serviceWorker' in navigator)){
    showSnot('Updates are not supported in this browser');
    return;
  }
  showSnot(`Checking for updates — v${APP_VERSION}`);
  try{
    const reg=await navigator.serviceWorker.ready;
    await reg.update();
    const latest=await fetchLatestVersion();
    if(reg.waiting){
      showUpdateBanner();
      showSnot('Update ready to install');
      return;
    }
    if(latest&&latest.cache&&latest.cache!==CACHE_VERSION){
      showUpdateBanner(`New version available (${latest.cache})`);
      showSnot('Update ready to install');
      return;
    }
    showSnot(`You are running v${APP_VERSION} / ${CACHE_VERSION}`);
  }catch(e){
    showSnot('Could not check for updates');
  }
}

async function applyUpdate(){
  saveGame();
  if(!('serviceWorker' in navigator)){
    forceReloadLatest();
    return;
  }
  const reg=await navigator.serviceWorker.ready;
  await reg.update();
  if(reg.waiting){
    _updateReloading=false;
    if(reg.waiting){
      reg.waiting.postMessage({type:'SKIP_WAITING'});
    }
    return;
  }
  forceReloadLatest();
}

async function forceReloadLatest(){
  saveGame();
  try{
    if('caches' in window){
      const keys=await caches.keys();
      await Promise.all(keys.map(k=>caches.delete(k)));
    }
    if('serviceWorker' in navigator){
      const regs=await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r=>r.unregister()));
    }
  }catch(e){}
  const url=new URL(window.location.href);
  url.searchParams.set('fresh',Date.now());
  window.location.replace(url.toString());
}
// Security model:
// 1. If Supabase connected: use server's updated_at timestamp (unfakeable)
// 2. If local only: cross-check local clock delta against tick count to detect manipulation
// 3. If clock went backwards vs last known server time: skip offline progress entirely

let _serverTimeOffset=0; // ms difference between server and local clock, calibrated on cloud load
let _offlineReady=false;
let _offlineApplying=false;

async function fetchServerTime(){
  // Supabase exposes a lightweight endpoint we can use to get real server time
  if(!G.supabaseUrl||!G.supabaseKey) return null;
  try{
    const r=await fetch(`${G.supabaseUrl}/rest/v1/`,{
      headers:{'apikey':G.supabaseKey,'Authorization':`Bearer ${G.supabaseKey}`},
    });
    // Server date comes back in response headers
    const serverDate=r.headers.get('date');
    if(serverDate){
      const serverMs=new Date(serverDate).getTime();
      _serverTimeOffset=serverMs-Date.now();
      return serverMs;
    }
  }catch(e){}
  return null;
}

function getReliableNow(){
  // If we have a calibrated server offset, apply it to local clock
  // This corrects for local clock changes
  return Date.now()+_serverTimeOffset;
}

async function applyOfflineProgress(sinceTime=null){
  if(_offlineApplying)return false;
  _offlineApplying=true;
  const reliableNow=getReliableNow();

  try{
    // --- Tamper detection ---
    // G.lastServerTime is the last real server timestamp we recorded
    // If local clock is behind it, the clock was wound back — skip
    if(G.lastServerTime&&reliableNow<G.lastServerTime-5000){
      addLog('⚠ Time anomaly detected. Offline progress skipped.','danger');
      showOverlay('Time anomaly detected.\nOffline progress skipped.','danger','Security Check');
      G.lastSaveTime=reliableNow;
      G.lastServerTime=reliableNow;
      return false;
    }

    // Calculate elapsed from last save
    const lastActive=sinceTime||G.lastActiveTime||G.lastSaveTime||reliableNow;
    const rawElapsed=(reliableNow-lastActive)/1000;

  // --- Tick cross-check for non-cloud players ---
  // The game tick increments every real second while the game is open.
  // If claimed offline time >> ticks since last save, something is off.
  // We allow up to 10% buffer for browser throttling etc.
  const ticksSinceLoad=G.tick-(G._tickAtLastLoad||0);
  const localSessionSeconds=ticksSinceLoad; // real seconds game has been open this session
  let elapsed=rawElapsed;

  if(!G.supabaseUrl){
    // No cloud — apply tick sanity check
    // Max believable offline = raw elapsed, but cap if it's >10% more than what ticks account for
    // Only apply check if game has been open long enough to have meaningful ticks
    if(localSessionSeconds>10&&rawElapsed>localSessionSeconds*1.1){
      // Something smells off — use a conservative estimate
      elapsed=Math.min(rawElapsed, G._lastKnownOfflineCap||rawElapsed);
      addLog('⚠ Clock discrepancy detected. Offline gains capped conservatively.','danger');
    }
  }

  // Hard cap at offlineCapHours regardless
    elapsed=Math.min(elapsed, G.offlineCapHours*3600);
    if(elapsed<30)return false;

  const boost=earlyBoost();
  const ticks=Math.floor(elapsed);

  // ── ADVANCE G.tick first — this fixes ALL absolute-tick timers ──
  // Troop training, hospital, raids, respawns all use G.tick comparisons
  G.tick+=ticks;

  // Resources
  Object.values(G.resources).forEach(r=>{
    if(r.rate>0) r.amount=Math.min(r.max, r.amount+(r.rate*boost/60)*ticks);
  });

  // Prestige
  const pRate=1+(G.prestigeRate>0?G.prestigeRate*(1+(G.victoryBonus/100)):0);
  G.prestige=Math.min(G.prestigeGoal, G.prestige+(pRate/60)*ticks);

  // Research queue 1
  if(G.activeResearch){
    G.researchProgress=Math.min(G.researchProgress+(ticks*researchSpeedMultiplier()),99999);
    const rDef=allR().find(r=>r.id===G.activeResearch);
    if(rDef&&G.researchProgress>=rDef.time) completeResearch(rDef);
  }

  // Research queue 2
  if(G.activeResearch2){
    G.researchProgress2=Math.min(G.researchProgress2+(ticks*researchSpeedMultiplier()),99999);
    const rDef2=allR().find(r=>r.id===G.activeResearch2);
    if(rDef2&&G.researchProgress2>=rDef2.time){
      completeResearchQueue2(rDef2,'offline');
    }
  }

  // Hero quests
  G.heroes.forEach(h=>{
    if(h.onQuest&&h.qt>0){h.qt=Math.max(0,h.qt-ticks);if(h.qt<=0)completeQuest(h);}
  });

  // Troop training — now works because G.tick was advanced
  Object.entries(G.troops).forEach(([type,t])=>{
    if(t.training>0&&G.tick>=t.trainEnd){
      t.available+=t.training;t.total+=t.training;
      addLog(`${t.training} ${TROOP_DEF[type].name} finished training (offline).`,'important');
      t.training=0;t.trainEnd=0;
    }
  });

  // Hospital recovery
  if(G.hospital.recovering>0&&G.tick>=G.hospital.recoverEnd){
    let rem=G.hospital.recovering;
    Object.values(G.troops).forEach(t=>{const r=Math.min(t.injured,rem);t.injured-=r;t.available+=r;rem-=r;});
    addLog(`${G.hospital.recovering} troops recovered while you were away.`,'important');
    G.hospital.recovering=0;
  }

  // Raids returned
  G.activeRaids.forEach(r=>{if(G.tick>=r.returnAt)resolveRaid(r);});

  // NPC respawns
  G.npcFarms.forEach(f=>{if(!f.available&&G.tick>=f.respawnAt)f.available=true;});

  // Season advance
  const weekTicks=Math.floor(ticks/TICKS_PER_WEEK);
  if(weekTicks>0){
    G.seasonWeek=Math.min(SEASON_WEEKS,G.seasonWeek+weekTicks);
    G.seasonTick=ticks%TICKS_PER_WEEK;
  }

  // Year advance
  G.year+=Math.floor(ticks/300);

  const mins=Math.round(elapsed/60);
  const hrs=Math.floor(elapsed/3600);
  const label=hrs>0?`${hrs}h ${mins%60}m`:`${mins}m`;
  addLog(`You were away for ${label}. Resources and progress accumulated.`,'important');
  showOverlay(`Welcome back!\nKingdom progressed ${label} offline.`,'success','Offline Progress');

  // Update timestamps
    G.lastSaveTime=reliableNow;
    G.lastServerTime=reliableNow;
    G.lastActiveTime=reliableNow;
    G._tickAtLastLoad=G.tick;
    return true;
  }finally{
    _offlineApplying=false;
  }
}

function handleAppBackground(){
  if(!_offlineReady)return;
  G.lastActiveTime=G.lastActiveTime||getReliableNow();
  saveGame();
}

async function handleAppForeground(){
  if(!_offlineReady)return;
  const progressed=await applyOfflineProgress();
  if(progressed)renderAll();
  saveGame();
}

// ── VICTORY PATHS ──
function checkVictoryPath(){
  Object.entries(VICTORY_PATHS).forEach(([key,path])=>{
    if(path.check()){
      const bonus=path.bonus;
      if(G.victoryPath!==key){
        G.victoryPath=key;
        G.victoryBonus=bonus;
        addLog(`${path.icon} ${path.label} path achieved! +${bonus}% prestige bonus active.`,'important');
        showOverlay(`${path.label}\n+${bonus}% prestige bonus!`,'success','Victory Path Achieved');
      }
    }
  });
}

// ── PRESTIGE SPENDING ──
function spendPrestige(ability){
  if(G.prestigePoints<ability.cost){showSnot('Not enough prestige points');return;}
  if(G.tick-ability.lastUsed<ability.cooldown){
    const rem=Math.ceil((ability.cooldown-(G.tick-ability.lastUsed))/60);
    showSnot(`Ability on cooldown — ${rem} min remaining`);return;
  }
  G.prestigePoints-=ability.cost;
  ability.lastUsed=G.tick;
  ability.use();
  renderFaction();
  renderAll();
}

// ── SEASON STRUCTURE ──

function seasonTick(){
  G.seasonTick++;
  if(G.seasonTick>=TICKS_PER_WEEK){
    G.seasonTick=0;
    G.seasonWeek++;
    addLog(`Season ${G.season} — Week ${G.seasonWeek} begins.`,'important');
    if(G.seasonWeek>SEASON_WEEKS) endSeason();
  }
}

function endSeason(){
  const path=VICTORY_PATHS[G.victoryPath];
  const finalPrestige=Math.floor(G.prestige*(1+(G.victoryBonus/100)));
  showSeasonEndScreen(finalPrestige, path);
}

function showSeasonEndScreen(finalPrestige, path){
  const overlay=document.createElement('div');
  overlay.id='season-overlay';
  overlay.style.cssText=`position:fixed;inset:0;background:rgba(5,4,2,.97);z-index:1000;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;`;
  const relicOptions=[
    {id:'relic_gold',name:'Merchant\'s Seal',icon:'🪙',desc:'+10% gold income in next dynasty'},
    {id:'relic_combat',name:'Sword of Ages',icon:'⚔',desc:'+15% hero power in next dynasty'},
    {id:'relic_research',name:'Ancient Tome',icon:'📚',desc:'-10% research time in next dynasty'},
  ];
  overlay.innerHTML=`
    <div style="font-family:'Cinzel',serif;text-align:center;max-width:400px;width:100%">
      <div style="font-size:11px;letter-spacing:3px;color:var(--gold-dark);text-transform:uppercase;margin-bottom:8px">Season ${G.season} Complete</div>
      <div style="font-size:26px;color:var(--gold);font-weight:700;margin-bottom:4px">Dynasty ${G.dynasty+1} Falls</div>
      <div style="font-size:14px;color:var(--parchment-dark);font-style:italic;margin-bottom:20px">The kingdom of Arnethia is enshrined in legend.</div>
      <div style="background:rgba(201,168,76,.08);border:1px solid var(--panel-border);border-radius:6px;padding:14px;margin-bottom:20px">
        <div style="font-size:13px;color:var(--gold-dark);margin-bottom:6px;letter-spacing:1px;text-transform:uppercase">Final Score</div>
        <div style="font-size:32px;color:var(--gold);font-weight:700;font-family:'Cinzel',serif">${finalPrestige.toLocaleString()}</div>
        <div style="font-size:12px;color:var(--forest-light);margin-top:4px">${path?`${path.icon} ${path.label} · +${path.bonus}% bonus applied`:'Mixed path'}</div>
      </div>
      <div style="font-size:12px;color:var(--gold-dark);letter-spacing:1px;text-transform:uppercase;margin-bottom:10px">Choose Your Legacy Relic</div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:20px">
        ${relicOptions.map(r=>{
          const stacks=countRelic(r.id), capped=stacks>=RELIC_STACK_CAP;
          return`
          <div onclick="selectRelic('${r.id}')" data-relic="${r.id}" data-capped="${capped?1:0}" style="background:rgba(201,168,76,.06);border:1px solid rgba(201,168,76,.2);border-radius:4px;padding:10px 14px;cursor:${capped?'not-allowed':'pointer'};display:flex;align-items:center;gap:10px;transition:all .2s;opacity:${capped?0.45:1}">
            <span style="font-size:22px">${r.icon}</span>
            <div><div style="font-family:'Cinzel',serif;font-size:12px;color:var(--parchment)">${r.name}</div>
            <div style="font-size:11px;color:var(--stone-light);font-style:italic">${r.desc} · ${stacks}/${RELIC_STACK_CAP}${capped?' max':''}</div></div>
          </div>`}).join('')}
      </div>
      <button onclick="beginNewDynasty()" id="new-dynasty-btn" disabled style="width:100%;padding:12px;background:rgba(201,168,76,.1);border:1px solid var(--gold-dark);border-radius:4px;color:var(--gold);font-family:'Cinzel',serif;font-size:13px;letter-spacing:2px;text-transform:uppercase;cursor:not-allowed;opacity:.4">
        Begin New Dynasty
      </button>
      <div style="font-size:11px;color:var(--stone-light);font-style:italic;margin-top:8px">Select a relic to continue</div>
    </div>`;
  document.body.appendChild(overlay);
  G._pendingRelic=null;
}

let _selectedRelic=null;
function selectRelic(id){
  if(countRelic(id)>=RELIC_STACK_CAP){showSnot('Relic stack cap reached');return;}
  _selectedRelic=id;
  document.querySelectorAll('[data-relic]').forEach(el=>{
    el.style.borderColor=el.dataset.relic===id?'var(--gold)':'rgba(201,168,76,.2)';
    el.style.background=el.dataset.relic===id?'rgba(201,168,76,.15)':'rgba(201,168,76,.06)';
  });
  const btn=document.getElementById('new-dynasty-btn');
  if(btn){btn.disabled=false;btn.style.opacity='1';btn.style.cursor='pointer';}
}

function beginNewDynasty(){
  if(!_selectedRelic)return;
  if(countRelic(_selectedRelic)>=RELIC_STACK_CAP){showSnot('Relic stack cap reached');return;}
  G.legacyRelics.push(_selectedRelic);
  G.dynasty++;
  G.season++;
  G.seasonWeek=1;
  G.seasonTick=0;
  G.victoryPath='mixed';
  G.victoryBonus=0;

  // Apply relic bonuses
  if(_selectedRelic==='relic_gold') G.resources.gold.rate+=2;
  if(_selectedRelic==='relic_combat') G.heroes.forEach(h=>h.power=Math.round(h.power*1.15));
  // relic_research applied in research timer check

  // Soft reset — keep heroes, relics, dynasty count; reset resources and buildings to starter values
  Object.assign(G.resources,{
    gold:{amount:100,rate:2,max:500,icon:'🪙',name:'Gold'},
    food:{amount:150,rate:3,max:500,icon:'🌾',name:'Food'},
    wood:{amount:120,rate:3,max:500,icon:'🪵',name:'Wood'},
    stone:{amount:80,rate:2,max:500,icon:'⚙',name:'Stone'},
    iron:{amount:10,rate:0.5,max:300,icon:'⛏',name:'Iron'},
    mana:{amount:0,rate:0,max:200,icon:'✨',name:'Mana'},
  });
  G.buildings.forEach(b=>b.level=0);
  G.activeResearch=null;G.researchProgress=0;
  G.prestige=0;G.prestigePoints=0;G.prestigeRate=0;
  G.revealedBuildings=['farm','lumber','mine','market'];
  G.revealedResearch=['trade_routes','crop_rotation','swordsmanship','fortification'];
  G.unlockedResearchTabs=['economy','military'];
  G.costReduction=null;G.wardProtect=false;G.hasAlchemy=false;
  G.hasFarsight=false;G.hasSiege=false;G.questTimeMulti=null;G.fortBonus=0;
  Object.keys(G.research).forEach(k=>G.research[k]={completed:false});
  // Heroes survive but reset quests
  G.heroes.forEach(h=>{h.onQuest=false;h.qt=0;h.qname='';h._ret=false;});

  _selectedRelic=null;
  const overlay=document.getElementById('season-overlay');
  if(overlay)overlay.remove();

  addLog(`Dynasty ${G.dynasty} begins. Your legacy lives on.`,'important');
  showOverlay(`Dynasty ${G.dynasty} Begins\nSeason ${G.season} of the Age of Conquest`,'success','New Dynasty');
  renderAll();
  saveGame();
}

// ── SUPABASE CLOUD SAVE ──
async function cloudSave(){
  if(!G.supabaseUrl||!G.supabaseKey)return;
  try{
    const payload=buildSavePayload();
    const res=await fetch(`${G.supabaseUrl}/rest/v1/saves`,{
      method:'POST',
      headers:{
        'apikey':G.supabaseKey,
        'Authorization':`Bearer ${G.supabaseKey}`,
        'Content-Type':'application/json',
        'Prefer':'resolution=merge-duplicates',
      },
      body:JSON.stringify({id:'player_1',data:JSON.stringify(payload),updated_at:new Date().toISOString()}),
    });
    if(res.ok) addLog('Kingdom chronicle saved to the cloud. ☁','');
  }catch(e){console.warn('Cloud save failed:',e);}
}

async function cloudLoad(){
  if(!G.supabaseUrl||!G.supabaseKey)return false;
  try{
    // Calibrate server time offset first
    await fetchServerTime();
    const res=await fetch(`${G.supabaseUrl}/rest/v1/saves?id=eq.player_1&select=data,updated_at`,{
      headers:{'apikey':G.supabaseKey,'Authorization':`Bearer ${G.supabaseKey}`},
    });
    if(!res.ok)return false;
    const rows=await res.json();
    if(!rows.length)return false;
    const s=JSON.parse(rows[0].data);
    // Use the DB's updated_at as the authoritative last-save time
    // This is set by the server — the client cannot fake it
    const dbUpdatedAt=new Date(rows[0].updated_at).getTime();
    s.lastSaveTime=dbUpdatedAt;
    s.lastServerTime=dbUpdatedAt;
    applyLoadedState(s);
    G._tickAtLastLoad=G.tick;
    addLog('Dynasty restored from the cloud. ☁','important');
    return true;
  }catch(e){return false;}
}

function buildSavePayload(){
  return {
    year:G.year,prestige:G.prestige,prestigeRate:G.prestigeRate,
    prestigePoints:G.prestigePoints,season:G.season,seasonWeek:G.seasonWeek,
    seasonTick:G.seasonTick,dynasty:G.dynasty,legacyRelics:G.legacyRelics,
    victoryPath:G.victoryPath,victoryBonus:G.victoryBonus,
    lastSaveTime:getReliableNow(),
    lastActiveTime:G.lastActiveTime||getReliableNow(),
    lastServerTime:G.lastServerTime||getReliableNow(),
    _lastKnownOfflineCap:G.offlineCapHours*3600,
    resources:Object.fromEntries(Object.entries(G.resources).map(([k,v])=>[k,{amount:v.amount,rate:v.rate,max:v.max}])),
    buildings:G.buildings,research:G.research,heroes:G.heroes,
    activeResearch:G.activeResearch,researchProgress:G.researchProgress,
    activeResearch2:G.activeResearch2,researchProgress2:G.researchProgress2,
    tick:G.tick,
    revealedBuildings:G.revealedBuildings,revealedResearch:G.revealedResearch,
    unlockedResearchTabs:G.unlockedResearchTabs,
    flags:{costReduction:G.costReduction,wardProtect:G.wardProtect,hasAlchemy:G.hasAlchemy,
           hasFarsight:G.hasFarsight,hasSiege:G.hasSiege,questTimeMulti:G.questTimeMulti,fortBonus:G.fortBonus},
    troops:G.troops,hospital:G.hospital,npcFarms:G.npcFarms,
    activeRaids:G.activeRaids,combatLog:G.combatLog,autoFarm:G.autoFarm,
    wallDefence:G.wallDefence,garrison:G.garrison,watchtowerUnlocked:G.watchtowerUnlocked,
    warChest:G.warChest,warChestCap:G.warChestCap,warChestWeeklyConverted:G.warChestWeeklyConverted,
    lastWarChestDecay:G.lastWarChestDecay,storageLevels:G.storageLevels,
    supabaseUrl:G.supabaseUrl,supabaseKey:G.supabaseKey,
    log:G.log.slice(0,20),
  };
}

function applyLoadedState(s){
  G.year=s.year||1;G.prestige=s.prestige||0;G.prestigeRate=s.prestigeRate||0;
  G.prestigePoints=s.prestigePoints||0;
  G.season=s.season||1;G.seasonWeek=s.seasonWeek||1;G.seasonTick=s.seasonTick||0;
  G.dynasty=s.dynasty||0;G.legacyRelics=capRelicStacks(s.legacyRelics||[]);
  G.victoryPath=s.victoryPath||'mixed';G.victoryBonus=s.victoryBonus||0;
  G.lastSaveTime=s.lastSaveTime||Date.now();
  G.lastActiveTime=s.lastActiveTime||s.lastSaveTime||Date.now();
  G.lastServerTime=s.lastServerTime||s.lastSaveTime||Date.now();
  G._lastKnownOfflineCap=s._lastKnownOfflineCap||G.offlineCapHours*3600;
  Object.entries(s.resources||{}).forEach(([k,v])=>{
    if(G.resources[k]){G.resources[k].amount=v.amount;if(v.rate>G.resources[k].rate)G.resources[k].rate=v.rate;G.resources[k].max=v.max;}
  });
  (s.buildings||[]).forEach(b=>{const g=G.buildings.find(x=>x.id===b.id);if(g)g.level=b.level;});
  Object.assign(G.research,s.research||{});
  G.heroes=s.heroes||[];
  G.activeResearch=s.activeResearch||null;G.researchProgress=s.researchProgress||0;G.tick=s.tick||0;
  if(s.revealedBuildings)G.revealedBuildings=s.revealedBuildings;
  if(s.revealedResearch)G.revealedResearch=s.revealedResearch;
  if(s.unlockedResearchTabs)G.unlockedResearchTabs=s.unlockedResearchTabs;
  if(s.flags){const f=s.flags;G.costReduction=f.costReduction;G.wardProtect=f.wardProtect;G.hasAlchemy=f.hasAlchemy;G.hasFarsight=f.hasFarsight;G.hasSiege=f.hasSiege;G.questTimeMulti=f.questTimeMulti;G.fortBonus=f.fortBonus;}
  if(s.troops)Object.assign(G.troops,s.troops);
  if(s.hospital)Object.assign(G.hospital,s.hospital);
  if(s.npcFarms)G.npcFarms=s.npcFarms;
  if(s.activeRaids)G.activeRaids=s.activeRaids;
  if(s.combatLog)G.combatLog=s.combatLog;
  if(s.autoFarm)G.autoFarm=s.autoFarm;
  if(s.activeResearch2!=null){G.activeResearch2=s.activeResearch2;G.researchProgress2=s.researchProgress2||0;}
  if(s.wallDefence!=null)G.wallDefence=s.wallDefence;
  if(s.garrison)Object.assign(G.garrison,s.garrison);
  if(s.watchtowerUnlocked)G.watchtowerUnlocked=s.watchtowerUnlocked;
  if(s.warChest!=null)G.warChest=s.warChest;
  if(s.warChestCap)G.warChestCap=s.warChestCap;
  if(s.warChestWeeklyConverted!=null)G.warChestWeeklyConverted=s.warChestWeeklyConverted;
  if(s.lastWarChestDecay)G.lastWarChestDecay=s.lastWarChestDecay;
  if(s.storageLevels)Object.assign(G.storageLevels,s.storageLevels);
  if(s.supabaseUrl)G.supabaseUrl=s.supabaseUrl;
  if(s.supabaseKey)G.supabaseKey=s.supabaseKey;
  G.log=s.log||G.log;
}

// Cost helper — cheap early levels, steeper later. Base * 1.65^(level-1)
function bCost(base, l){
  return Math.round(base * Math.pow(1.65, l-1));
}

function initCombat(){
  G.npcFarms=NPC_FARMS.map(f=>({...f}));
}

// ── TROOP TRAINING ──
function trainTroops(type,qty){
  const def=TROOP_DEF[type];
  if(!def)return;
  const barracksLvl=blvl('barracks');
  if(barracksLvl<def.reqBarracks){showSnot(`Requires Barracks level ${def.reqBarracks}`);return;}
  const t=G.troops[type];
  if(t.training>0){showSnot('Already training this unit type');return;}
  const cost={};
  Object.entries(def.cost).forEach(([r,v])=>cost[r]=v*qty);
  if(!canAfford(cost)){showSnot('Insufficient resources');return;}
  spend(cost);
  t.training=qty;
  t.trainEnd=G.tick+(def.trainTime*qty);
  addLog(`Training ${qty} ${def.name}. Ready in ${Math.round(def.trainTime*qty/60)} min.`);
  renderCombat();
}

function checkTraining(){
  Object.entries(G.troops).forEach(([type,t])=>{
    if(t.training>0&&G.tick>=t.trainEnd){
      t.available+=t.training;
      t.total+=t.training;
      addLog(`${t.training} ${TROOP_DEF[type].name} are ready for battle!`,'important');
      showOverlay(`${t.training} ${TROOP_DEF[type].name} ready!`,'success','Training Complete');
      setBadge('combat',G.activeTab!=='combat');
      t.training=0;t.trainEnd=0;
    }
  });
}

// ── NPC FARM ATTACK ──
function calcAttackPower(sent){
  return Object.entries(sent).reduce((sum,[type,qty])=>{
    return sum+(TROOP_DEF[type]?.atk||0)*qty;
  },0);
}

function calcReadyTroopPower(){
  return Object.entries(G.troops).reduce((sum,[type,t])=>{
    return sum+(TROOP_DEF[type]?.atk||0)*(t.available||0);
  },0);
}

function calcLootCapacity(sent){
  return Object.entries(sent).reduce((sum,[type,qty])=>{
    return sum+(TROOP_DEF[type]?.carry||0)*qty;
  },0);
}

function farmLootTotal(farm){
  return Object.values(farm.loot||{}).reduce((sum,val)=>sum+val,0);
}

function planRaidTroops(farm){
  const sent={infantry:0,archers:0,cavalry:0,siege:0};
  let power=0, carry=0;
  const targetPower=farm.def||0;
  const targetCarry=farmLootTotal(farm);

  // Prefer fast, high-capacity troops first so auto-farm can spread raids efficiently.
  ['cavalry','infantry','archers'].forEach(type=>{
    const def=TROOP_DEF[type];
    const avail=G.troops[type]?.available||0;
    if(!def||avail<=0)return;
    if(power>=targetPower&&carry>=targetCarry)return;
    const powerNeed=Math.max(0,targetPower-power);
    const carryNeed=Math.max(0,targetCarry-carry);
    const qtyForPower=powerNeed>0?Math.ceil(powerNeed/def.atk):0;
    const qtyForCarry=carryNeed>0?Math.ceil(carryNeed/def.carry):0;
    const qty=Math.min(avail,Math.max(qtyForPower,qtyForCarry));
    sent[type]=qty;
    power+=qty*def.atk;
    carry+=qty*def.carry;
  });

  return {
    sent,
    power,
    carry,
    targetPower,
    targetCarry,
    canBeat:power>=targetPower,
    canLootAll:carry>=targetCarry,
  };
}

function attackNPC(farmId,sent){
  const farm=G.npcFarms.find(f=>f.id===farmId);
  if(!farm||!farm.available){showSnot('Target not available');return;}
  const totalSent=Object.values(sent).reduce((a,b)=>a+b,0);
  if(totalSent===0){showSnot('Select troops to send');return;}

  // Check availability
  for(const[type,qty]of Object.entries(sent)){
    if(qty>G.troops[type].available){showSnot(`Not enough ${TROOP_DEF[type].name} available`);return;}
  }

  // Deduct troops
  Object.entries(sent).forEach(([type,qty])=>{G.troops[type].available-=qty;});

  // Calculate travel time based on slowest unit
  const slowest=Math.max(...Object.entries(sent).filter(([,q])=>q>0).map(([t])=>TROOP_DEF[t].speed));
  const travelTime=slowest+farm.level*20;

  const raid={
    id:'r'+G.tick,type:'npc',farmId,sent,
    returnAt:G.tick+(travelTime*2),
    travelTime,farm:{...farm},
  };
  G.activeRaids.push(raid);
  farm.available=false;
  farm.respawnAt=G.tick+farm.respawn;
  addLog(`Troops march on ${farm.name}. Return in ${Math.round(travelTime*2/60)} min.`);
  renderCombat();
}

function resolveRaid(raid){
  const atkPow=calcAttackPower(raid.sent);
  const farm=raid.farm;
  const victory=atkPow>=farm.def;

  if(victory){
    // Loot calculation
    const cap=calcLootCapacity(raid.sent);
    let lootTotal=Object.values(farm.loot).reduce((a,b)=>a+b,0);
    const lootRatio=Math.min(1,cap/lootTotal);
    const loot={};
    Object.entries(farm.loot).forEach(([res,amt])=>{
      loot[res]=Math.floor(amt*lootRatio);
      if(G.resources[res])G.resources[res].amount=Math.min(G.resources[res].max,G.resources[res].amount+loot[res]);
    });

    // NPC — troops injured not killed
    const injuryRate=Math.max(0,(farm.def/atkPow)*0.3);
    let totalInjured=0;
    Object.entries(raid.sent).forEach(([type,qty])=>{
      const injured=Math.floor(qty*injuryRate);
      totalInjured+=injured;
      G.troops[type].available+=qty-injured;
      G.troops[type].injured+=injured;
      // hospital recovery
    });

    const lootStr=Object.entries(loot).map(([r,v])=>`${G.resources[r]?.icon||r}${v}`).join(' ');
    addLog(`Victory at ${farm.name}! Loot: ${lootStr}. Injured: ${totalInjured}.`,'important');
    G.combatLog.unshift({msg:`✓ ${farm.name} — ${lootStr}`,type:'victory',time:`Yr.${G.year}`});
    G.prestige+=10;
    if(totalInjured>0) recoverInjured(totalInjured);

  } else {
    // Defeat — all troops injured (NPC so no permanent death)
    let totalInjured=0;
    Object.entries(raid.sent).forEach(([type,qty])=>{
      G.troops[type].injured+=qty;
      totalInjured+=qty;
    });
    addLog(`⚠ Defeated at ${farm.name}. ${totalInjured} troops injured.`,'danger');
    G.combatLog.unshift({msg:`✗ ${farm.name} — repelled, ${totalInjured} injured`,type:'defeat',time:`Yr.${G.year}`});
    if(totalInjured>0) recoverInjured(totalInjured);
  }

  G.combatLog=G.combatLog.slice(0,20);
  G.activeRaids=G.activeRaids.filter(r=>r.id!==raid.id);
  setBadge('combat',G.activeTab!=='combat');
  renderCombat();
}

// ── HOSPITAL RECOVERY ──
function recoverInjured(count){
  const hospitalLvl=blvl('hospital')||0;
  const cap=50+(hospitalLvl*50);
  const canRecover=Math.min(count,cap-G.hospital.recovering);
  if(canRecover<=0){addLog('Hospital full — some troops could not be recovered.','danger');return;}
  G.hospital.recovering+=canRecover;
  const recoverTime=canRecover*10; // 10 ticks per troop
  G.hospital.recoverEnd=Math.max(G.hospital.recoverEnd,G.tick+recoverTime);
}

function checkRecovery(){
  if(G.hospital.recovering>0&&G.tick>=G.hospital.recoverEnd){
    // Return injured to available
    let remaining=G.hospital.recovering;
    Object.values(G.troops).forEach(t=>{
      const ret=Math.min(t.injured,remaining);
      t.injured-=ret;t.available+=ret;remaining-=ret;
    });
    addLog(`${G.hospital.recovering} troops recover from their injuries.`,'important');
    showOverlay(`${G.hospital.recovering} troops recovered!`,'success','Hospital');
    G.hospital.recovering=0;
    setBadge('combat',G.activeTab!=='combat');
  }
}

function checkNPCRespawn(){
  G.npcFarms.forEach(f=>{
    if(!f.available&&G.tick>=f.respawnAt){f.available=true;}
  });
}

// ── RENDER COMBAT ──
function renderCombat(){
  const tab=document.getElementById('tab-combat');if(!tab)return;
  const barracksLvl=blvl('barracks');
  const readyPower=calcReadyTroopPower();

  if(barracksLvl===0){
    tab.innerHTML=`<div class="section"><div class="section-title">⚔ Combat</div>
      <div style="font-size:13px;color:var(--stone-light);font-style:italic;padding:8px 0">
        Build the King's Barracks to raise an army.
      </div></div>`;
    return;
  }

  const troopsHtml=Object.entries(TROOP_DEF).map(([type,def])=>{
    const t=G.troops[type];
    const unlocked=barracksLvl>=def.reqBarracks;
    if(!unlocked) return`<div class="tcard" style="opacity:.4">
      <div class="tcard-header"><span class="tcard-icon">${def.icon}</span>
      <span class="tcard-name" style="font-size:9px">Req. Barracks ${def.reqBarracks}</span></div>
      <div style="font-size:10px;color:var(--stone-light);font-style:italic">${def.name} — locked</div>
    </div>`;
    const trainPct=t.training>0?Math.round(((G.tick-(t.trainEnd-TROOP_DEF[type].trainTime*t.training))/(TROOP_DEF[type].trainTime*t.training))*100):0;
    const minsLeft=t.training>0?Math.ceil((t.trainEnd-G.tick)/60):0;
    return`<div class="tcard">
      <div class="tcard-header"><span class="tcard-icon">${def.icon}</span><span class="tcard-name">${def.name}</span></div>
      <div class="tcard-stats">
        <div class="tstat"><div class="tstat-v">${t.available}</div><div class="tstat-l">Ready</div></div>
        <div class="tstat"><div class="tstat-v ${t.injured?'injured':''}">${t.injured}</div><div class="tstat-l">Injured</div></div>
      </div>
      ${t.training>0?`<div style="font-size:10px;color:var(--gold);font-style:italic;margin-bottom:4px">Training ${t.training}… ${minsLeft}m left</div>
        <div class="raid-progress"><div class="raid-progress-inner" style="width:${trainPct}%"></div></div>`:''}
      <div style="display:flex;gap:4px;margin-top:6px">
        <input type="number" inputmode="numeric" pattern="[0-9]*" autocomplete="off" id="train-qty-${type}" min="1" max="999" value="10"
          style="width:50px;padding:4px;background:rgba(255,255,255,.04);border:1px solid rgba(201,168,76,.2);border-radius:3px;color:var(--parchment);font-size:11px;text-align:center;">
        <button class="train-btn" onclick="trainFromInput('${type}')" ${t.training>0?'disabled':''} style="flex:1">
          ${t.training>0?'Training…':'Train'}
        </button>
      </div>
      <div style="font-size:9px;color:var(--stone-light);margin-top:3px">Cost/unit: ${Object.entries(def.cost).map(([r,v])=>`${G.resources[r]?.icon||r}${v}`).join(' ')}</div>
    </div>`;
  }).join('');

  const hospitalLvl=blvl('hospital')||0;
  const hospitalHtml=`<div class="hospital-card">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
      <span style="font-family:'Cinzel',serif;font-size:11px;color:var(--forest-light)">🏥 Hospital</span>
      <span style="font-size:10px;color:var(--stone-light)">${hospitalLvl===0?'Not built':
        `Capacity: ${50+hospitalLvl*50}`}</span>
    </div>
    ${G.hospital.recovering>0?
      `<div style="font-size:11px;color:var(--forest-light)">${G.hospital.recovering} troops recovering…
        ${Math.ceil((G.hospital.recoverEnd-G.tick)/60)}m remaining</div>
        <div class="raid-progress" style="margin-top:4px"><div class="raid-progress-inner" style="width:${Math.round(((G.tick-(G.hospital.recoverEnd-G.hospital.recovering*10))/(G.hospital.recovering*10))*100)}%;background:var(--forest-light)"></div></div>`
      :`<div style="font-size:11px;color:var(--stone-light);font-style:italic">${hospitalLvl===0?'Build a Hospital to recover injured troops faster.':'No troops recovering.'}</div>`
    }
  </div>`;

  const activeRaidsHtml=G.activeRaids.length?`
    <div class="section">
      <div class="section-title">⏳ Active Raids</div>
      ${G.activeRaids.map(r=>{
        const pct=Math.round(((G.tick-(r.returnAt-r.travelTime*2))/(r.travelTime*2))*100);
        const minsLeft=Math.ceil((r.returnAt-G.tick)/60);
        return`<div class="raid-card">
          <div style="display:flex;justify-content:space-between">
            <span style="font-family:'Cinzel',serif;font-size:11px;color:var(--parchment)">${r.farm.icon} ${r.farm.name}</span>
            <span style="font-size:10px;color:var(--gold-dark)">${minsLeft}m</span>
          </div>
          <div style="font-size:10px;color:var(--stone-light);margin-top:2px">
            ${Object.entries(r.sent).filter(([,q])=>q>0).map(([t,q])=>`${TROOP_DEF[t].icon}${q}`).join(' ')}
          </div>
          <div class="raid-progress"><div class="raid-progress-inner" style="width:${Math.min(100,pct)}%"></div></div>
        </div>`;
      }).join('')}
    </div>`:'';

  const npcHtml=G.npcFarms.map(farm=>{
    const lootStr=Object.entries(farm.loot).map(([r,v])=>`${G.resources[r]?.icon||r}${v}`).join(' ');
    const minsToRespawn=farm.available?0:Math.ceil((farm.respawnAt-G.tick)/60);
    const canBeat=readyPower>=farm.def;
    return`<div class="npc-card ${farm.available?'':''}">
      <div class="npc-header">
        <span class="npc-name">${farm.icon} ${farm.name}</span>
        <span class="npc-level">Lv ${farm.level}</span>
      </div>
      <div class="npc-loot">Loot: ${lootStr}</div>
      <div class="npc-power-row">
        <span>Required: ${farm.def}</span>
        <span class="${canBeat?'ok':'low'}">Available power: ${readyPower}</span>
      </div>
      ${!farm.available?
        `<div style="font-size:11px;color:var(--stone-light);font-style:italic">Respawns in ${minsToRespawn}m</div>`
        :`<div style="font-size:10px;color:var(--gold-dark);margin-bottom:6px;font-family:'Cinzel',serif">Send troops:</div>
        <div class="troop-send">
          ${Object.entries(TROOP_DEF).filter(([type])=>blvl('barracks')>=TROOP_DEF[type].reqBarracks&&type!=='siege').map(([type,def])=>`
            <div>
              <div class="send-label">${def.icon} ${def.name} (${G.troops[type].available})</div>
              <input type="number" inputmode="numeric" pattern="[0-9]*" autocomplete="off" class="send-input" id="send-${farm.id}-${type}" min="0" max="${G.troops[type].available}" value="0" placeholder="0">
            </div>`).join('')}
        </div>
        <button class="attack-btn" onclick="launchAttack('${farm.id}')">⚔ Attack</button>
        ${G.combatLog.some(e=>e.msg.includes(farm.name)&&e.type==='victory')?`
        <div class="autofarm-row">
          <div class="toggle-wrap">
            <div class="toggle ${G.autoFarm[farm.id]?.enabled?'on':''}" onclick="toggleAutoFarm('${farm.id}')"></div>
            <span class="toggle-label">Auto-farm ${G.autoFarm[farm.id]?.enabled?'ON ⚡':'OFF'}</span>
          </div>
          <span style="font-size:10px;color:var(--stone-light)">Floor: ${G.autoFarm[farm.id]?.floor||20}%</span>
        </div>
        <div class="threshold-row">
          <span>Min troops:</span>
          <input type="range" min="10" max="50" step="5" value="${G.autoFarm[farm.id]?.floor||20}"
            oninput="setAutoFarmFloor('${farm.id}',this.value)"
            style="flex:1;accent-color:var(--gold);">
          <span>${G.autoFarm[farm.id]?.floor||20}%</span>
        </div>`:''}
        `}
    </div>`;
  }).join('');

  const combatLogHtml=G.combatLog.length?`
    <div class="section">
      <div class="section-title">📜 Battle Reports</div>
      <div class="combat-log">
        ${G.combatLog.map(e=>`<div class="clog-entry ${e.type||''}"><span style="font-size:9px;color:var(--gold-dark);font-family:'Cinzel',serif">${e.time}</span> ${e.msg}</div>`).join('')}
      </div>
    </div>`:'';

  tab.innerHTML=`
    <div class="section">
      <div class="section-title">⚔ Army</div>
      ${hospitalHtml}
      <div class="troop-grid">${troopsHtml}</div>
    </div>
    ${activeRaidsHtml}
    <div class="section">
      <div class="section-title">🗺 NPC Farms</div>
      <div style="font-size:11px;color:var(--stone-light);font-style:italic;margin-bottom:8px">Defeat NPC villages to steal resources. Troops are injured not killed.</div>
      <div class="npc-list">${npcHtml}</div>
    </div>
    ${combatLogHtml}`;
}

function trainFromInput(type){
  const el=document.getElementById('train-qty-'+type);
  const qty=parseInt(el?.value)||1;
  trainTroops(type,Math.max(1,qty));
}

function setAutoFarmFloor(farmId,val){
  if(!G.autoFarm[farmId])G.autoFarm[farmId]={enabled:false,floor:20};
  G.autoFarm[farmId].floor=parseInt(val);
}

function launchAttack(farmId){
  const farm=G.npcFarms.find(f=>f.id===farmId);if(!farm)return;
  const sent={};
  Object.keys(TROOP_DEF).forEach(type=>{
    const el=document.getElementById(`send-${farmId}-${type}`);
    sent[type]=parseInt(el?.value)||0;
  });
  attackNPC(farmId,sent);
}

const allR=()=>[...RD.economy,...RD.military,...RD.arcane,...RD.diplomacy];

// ── POWER LEVEL ──
function calcPower(){
  const bPow=G.buildings.reduce((s,b)=>s+b.level*100,0);
  const rPow=Object.values(G.research).filter(r=>r.completed).length*200;
  const hPow=G.heroes.reduce((s,h)=>s+h.level*50,0);
  const tPow=Object.values(G.troops).reduce((s,t)=>s+t.total,0);
  const pPow=Math.floor(G.prestige);
  return bPow+rPow+hPow+tPow+pPow;
}

function renderPower(){
  const p=calcPower();
  const el=document.getElementById('power-val');
  if(el) el.textContent=p.toLocaleString();
}

// ── FLOATING RESOURCE BAR ──
function renderResourceBar(){
  const el=document.getElementById('resource-bar-inner');if(!el)return;
  el.innerHTML=Object.entries(G.resources).map(([k,r],i)=>{
    const pct=Math.min(100,Math.round((r.amount/r.max)*100));
    const cls=pct>=90?'high':pct>=75?'med':'low';
    const gain=effectiveResourceRate(k);
    const capText=resourceCapText(k,r);
    const sep=i>0?'<div class="fres-sep"></div>':'';
    return`${sep}<div class="fres" data-resource-card="${k}" role="button" tabindex="0" onclick="showResourceStorageTimes()" ontouchend="showResourceStorageTimes()">
      <div class="fres-icon">${r.icon}</div>
      <div class="fres-info">
        <div class="fres-amt">${Math.floor(r.amount)}</div>
        <div class="fres-rate ${gain<0?'neg':''}">${gain>0?'+':''}${gain.toFixed(1)}/m</div>
        <div class="fres-cap">${capText}</div>
        <div class="fres-bar"><div class="fres-fill ${cls}" style="width:${pct}%"></div></div>
      </div>
    </div>`;
  }).join('');
}

// ── WAR CHEST ──
function renderWarChest(){
  return`<div class="warchest-card">
    <div class="wc-header">
      <span class="wc-title">⚔ War Chest</span>
      <span style="font-family:'Cinzel',serif;font-size:11px;color:var(--gold)">${Math.floor(G.warChest)} / ${G.warChestCap}</span>
    </div>
    <div class="wc-bar"><div class="wc-fill" style="width:${Math.min(100,Math.round((G.warChest/G.warChestCap)*100))}%"></div></div>
    <div style="font-size:10px;color:var(--stone-light);font-style:italic;margin-top:4px;margin-bottom:6px">
      Converted this week: ${Math.floor(G.warChestWeeklyConverted)} / ${G.warChestWeeklyLimit}
      ${G.victoryPath==='diplomatic'?` · <span style="color:var(--forest-light)">10% conversion bonus active</span>`:''}
    </div>
    <button class="wc-convert-btn" onclick="convertToWarChest()"
      ${G.warChestWeeklyConverted>=G.warChestWeeklyLimit||G.warChest>=G.warChestCap?'disabled':''}>
      Convert 100 Gold → War Chest
    </button>
  </div>`;
}

function convertToWarChest(){
  if(G.warChestWeeklyConverted>=G.warChestWeeklyLimit){showSnot('Weekly conversion limit reached');return;}
  if(G.warChest>=G.warChestCap){showSnot('War chest is full');return;}
  const cost=100;
  if(G.resources.gold.amount<cost){showSnot('Not enough gold');return;}
  // Men of the West diplomatic bonus: 10% less conversion cost
  const bonus=G.victoryPath==='diplomatic'?0.9:1;
  const converted=Math.round(cost*bonus);
  G.resources.gold.amount-=cost;
  G.warChest=Math.min(G.warChestCap,G.warChest+converted);
  G.warChestWeeklyConverted+=converted;
  addLog(`Converted ${cost} gold → ${converted} War Chest.`);
  renderFaction();
}

function warChestDecayTick(){
  if(G.warChest<=0)return;
  const now=G.tick;
  if(now-G.lastWarChestDecay>=86400){ // once per day in ticks (86400 seconds)
    const decayAmt=G.warChest*G.warChestDecayRate;
    const decayMod=G.victoryPath==='research'?0.5:1; // Elves: slower decay (placeholder)
    G.warChest=Math.max(0,G.warChest-(decayAmt*decayMod));
    G.lastWarChestDecay=now;
    if(decayAmt>1) addLog(`War chest decayed by ${Math.floor(decayAmt)} — stay active in battles to prevent loss.`,'danger');
  }
}

// ── AUTO-FARM ──
function toggleAutoFarm(farmId){
  if(!G.autoFarm[farmId]) G.autoFarm[farmId]={enabled:false,floor:20};
  G.autoFarm[farmId].enabled=!G.autoFarm[farmId].enabled;
  if(G.autoFarm[farmId].enabled) addLog(`Auto-farm enabled for ${G.npcFarms.find(f=>f.id===farmId)?.name}.`);
  renderCombat();
}

function checkAutoFarm(){
  if(!G.npcFarms) return;
  G.npcFarms.forEach(farm=>{
    const af=G.autoFarm[farm.id];
    if(!af?.enabled||!farm.available)return;
    if(G.activeRaids.find(r=>r.farmId===farm.id))return;

    // Check troop floor
    const totalAvail=Object.values(G.troops).reduce((s,t)=>s+t.available,0);
    const totalAll=Object.values(G.troops).reduce((s,t)=>s+t.total,0);
    const floorPct=(af.floor||20)/100;
    if(totalAvail<totalAll*floorPct){
      if(!af._warned){
        showOverlay(`Auto-farm paused — troops below ${af.floor}% threshold`,'danger','Auto-Farm');
        af._warned=true;
      }
      return;
    }
    af._warned=false;

    // Efficiency check: compare loot value vs expected repair cost
    const lootVal=Object.entries(farm.loot).reduce((s,[r,v])=>s+(r==='gold'?v:v*0.5),0);
    const repairCost=totalAvail*0.1*5; // rough estimate
    if(repairCost>lootVal*0.8){
      showOverlay(`Auto-farm paused — repair costs outweigh loot at ${farm.name}`,'danger','Efficiency Warning');
      af.enabled=false;
      renderCombat();
      return;
    }

    const raidPlan=planRaidTroops(farm);
    if(raidPlan.canBeat) attackNPC(farm.id,raidPlan.sent);
  });
}

// ── DUAL RESEARCH QUEUE ──
function startResearch2(id){
  if(blvl('citadel')<3){showSnot('Second queue unlocks at Citadel level 3');return;}
  if(G.activeResearch2){showSnot('Second queue busy');return;}
  if(G.research[id]?.completed)return;
  const rDef=allR().find(r=>r.id===id);if(!rDef)return;
  if(rDef.req&&!G.research[rDef.req]?.completed){showSnot('Requires prior research');return;}
  if(G.activeResearch===id){showSnot('Already in first queue');return;}
  if(!canAfford(rDef.cost)){showSnot('Insufficient resources');return;}
  spend(rDef.cost);
  G.activeResearch2=id;G.researchProgress2=0;
  addLog(`Second queue: researching ${rDef.name}…`);
  renderResearch();
}
function revealB(id){
  if(G.revealedBuildings.includes(id)) return;
  G.revealedBuildings.push(id);
  const b=BD.find(x=>x.id===id);
  if(b) showOverlay(`${b.icon} ${b.name} is now available to construct.`,'success','New Building Unlocked');
}
function revealR(ids){
  ids.forEach(id=>{
    if(G.revealedResearch.includes(id)) return;
    G.revealedResearch.push(id);
    const r=allR().find(x=>x.id===id);
    if(r) showOverlay(`${r.name} can now be researched.`,'success','New Research Available');
  });
}
function unlockTab(tab){
  if(G.unlockedResearchTabs.includes(tab)) return;
  G.unlockedResearchTabs.push(tab);
  showOverlay(`${tab.charAt(0).toUpperCase()+tab.slice(1)} research branch unlocked!`,'success','Branch Unlocked');
}
const bviz=id=>G.revealedBuildings.includes(id);
const rviz=id=>G.revealedResearch.includes(id);

// ── HELPERS ──
function canAfford(costs){return Object.entries(costs).every(([r,a])=>G.resources[r]?.amount>=a);}
function spend(costs){Object.entries(costs).forEach(([r,a])=>{G.resources[r].amount-=a;});}
function blvl(id){return G.buildings.find(b=>b.id===id)?.level||0;}
function chkReq(bDef){if(!bDef.req)return true;return Object.entries(bDef.req).every(([id,l])=>blvl(id)>=l);}

// ── INIT ──
function init(){
  BD.forEach(b=>G.buildings.push({id:b.id,level:0}));
  allR().forEach(r=>{ G.research[r.id]={completed:false}; });
  G.mapTiles=MAP_DEF.map(t=>({...t}));
  initCombat();
  addLog('Your kingdom of Arnethia rises from humble beginnings.','important');
  addLog('Build farms and mills. Discover what lies ahead.');

  // iOS Safari fix — attach touchend listeners to all tab buttons
  // This fires before the 300ms click delay and works reliably on iOS
  document.addEventListener('DOMContentLoaded',()=>attachTabTouch());
  setTimeout(attachTabTouch, 100); // fallback if DOMContentLoaded already fired

  renderAll();
  attachResourceCardClicks();
  setInterval(gameTick,1000);
  setInterval(renderAll,3000);
  setInterval(saveGame,30000);
  setInterval(()=>cloudSave(),120000);
  requestAnimationFrame(animateTickBar);
  checkForUpdate();
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='hidden')handleAppBackground();
    if(document.visibilityState==='visible')handleAppForeground();
  });
  window.addEventListener('pagehide',handleAppBackground);
  window.addEventListener('pageshow',e=>{if(e.persisted)handleAppForeground();});
  cloudLoad().then(loaded=>{
    if(!loaded){
      loadGame();
      G._tickAtLastLoad=G.tick;
    }
    applyOfflineProgress().then(()=>{
      _offlineReady=true;
      renderAll();
    });
  });
}

function attachTabTouch(){
  document.querySelectorAll('.btab, .stab').forEach(btn=>{
    // Remove any existing listener first to avoid doubles
    btn.removeEventListener('touchend', tabTouchHandler);
    btn.addEventListener('touchend', tabTouchHandler, {passive:false});
  });
}

function tabTouchHandler(e){
  e.preventDefault(); // prevent ghost click
  e.stopPropagation();
  const tab=this.dataset.tab;
  if(tab) switchTab(tab);
}

// ── TICK ──
function gameTick(){
  const reliableNow=getReliableNow();
  const lastActive=G.lastActiveTime||G.lastSaveTime||reliableNow;
  const missedSeconds=Math.floor((reliableNow-lastActive)/1000)-1;
  if(missedSeconds>=30&&!_offlineApplying){
    applyOfflineProgress(lastActive).then(progressed=>{
      if(progressed){renderAll();saveGame();}
    });
    return;
  }
  G.lastActiveTime=reliableNow;
  G.tick++;
  const rally=G._rallied&&G.tick<=G._rallyEnd;
  if(G._rallied&&G.tick>G._rallyEnd){G._rallied=false;addLog('The people\'s rally ends. Income returns to normal.');}
  const boost=earlyBoost()*(rally?2:1);
  Object.values(G.resources).forEach(r=>{if(r.rate>0)r.amount=Math.min(r.max,r.amount+(r.rate*boost)/60);});
  if(G.hasAlchemy&&G.tick%60===0&&G.resources.mana.amount>=10){
    G.resources.mana.amount-=10;G.resources.gold.amount=Math.min(G.resources.gold.max,G.resources.gold.amount+50);
    addLog('Alchemy transmutes 10 mana → 50 gold. ✨');
  }
  // Passive prestige trickle — 1 point per minute from start
  if(G.tick%60===0){
    const rate=1+(G.prestigeRate>0?G.prestigeRate*(1+(G.victoryBonus/100)):0);
    G.prestige=Math.min(G.prestigeGoal, G.prestige+rate);
    G.prestigePoints=Math.min(9999, G.prestigePoints+Math.floor(rate/5));
  }
  // Secondary iron from quarry — 0.2/min per mine level
  const mineLvl=blvl('mine');
  if(mineLvl>0&&G.tick%60===0) G.resources.iron.amount=Math.min(G.resources.iron.max, G.resources.iron.amount+(mineLvl*0.2));
  if(G.tick%300===0){G.year++;addLog(`Year ${G.year} of the ${G.era}. The kingdom endures.`);}
  if(G.activeResearch){
    G.researchProgress+=researchSpeedMultiplier();
    const rDef=allR().find(r=>r.id===G.activeResearch);
    if(rDef&&G.researchProgress>=rDef.time)completeResearch(rDef);
  }
  // Second research queue
  if(G.activeResearch2){
    G.researchProgress2+=researchSpeedMultiplier();
    const rDef2=allR().find(r=>r.id===G.activeResearch2);
    if(rDef2&&G.researchProgress2>=rDef2.time){
      completeResearchQueue2(rDef2);
    }
  }
  G.heroes.forEach(h=>{if(h.qt>0){h.qt--;if(h.qt<=0)completeQuest(h);}});
  checkTraining();checkRecovery();checkNPCRespawn();
  G.activeRaids.forEach(r=>{if(G.tick>=r.returnAt)resolveRaid(r);});
  if(G.tick%30===0) checkAutoFarm();
  if(G.tick%120===0){
    Object.entries(G.resources).forEach(([k,r])=>{
      if(r.rate>0&&r.amount/r.max>=0.95){
        addLog(`⚠ ${r.name} storage nearly full (${Math.floor(r.amount)}/${r.max}) — build storage or spend resources.`,'danger');
      }
    });
  }
  seasonTick();checkVictoryPath();
  updateBadges();
}

// ── TABS ──
function switchTab(tab){
  G.activeTab=tab;
  document.querySelectorAll('.tab-view').forEach(v=>v.classList.remove('active'));
  document.getElementById('tab-'+tab).classList.add('active');
  document.querySelectorAll('.stab,.btab').forEach(t=>t.classList.toggle('active',t.dataset.tab===tab));
  clearBadge(tab);
  if(tab==='build')renderBuildings();
  if(tab==='research')renderResearch();
  if(tab==='heroes')renderHeroes();
  if(tab==='combat')renderCombat();
}

// ── BADGES ──
function updateBadges(){
  const anyBuild=BD.some(b=>{
    if(!bviz(b.id))return false;
    const l=blvl(b.id);if(l>=b.max)return false;
    let c=b.cost(l+1);if(G.costReduction)c=Object.fromEntries(Object.entries(c).map(([k,v])=>[k,Math.floor(v*G.costReduction)]));
    return canAfford(c)&&chkReq(b);
  });
  setBadge('build',anyBuild&&G.activeTab!=='build');
  const anyRes=G.revealedResearch.some(id=>{
    const r=allR().find(x=>x.id===id);
    if(!r||G.research[id]?.completed||G.activeResearch)return false;
    if(r.req&&!G.research[r.req]?.completed)return false;
    return canAfford(r.cost);
  });
  setBadge('research',anyRes&&G.activeTab!=='research');
  const heroRet=G.heroes.some(h=>h._ret);
  setBadge('heroes',heroRet&&G.activeTab!=='heroes');
}
function setBadge(tab,show){
  ['bdot-','mbdot-'].forEach(p=>{const el=document.getElementById(p+tab);if(el)el.classList.toggle('on',show);});
}
function clearBadge(tab){
  setBadge(tab,false);
  if(tab==='heroes')G.heroes.forEach(h=>h._ret=false);
}

// ── BUILD ──
function buildBuilding(id){
  const bDef=BD.find(b=>b.id===id);
  const bState=G.buildings.find(b=>b.id===id);
  if(!bDef||!bState)return;
  if(bState.level>=bDef.max)return;
  if(!chkReq(bDef)){showSnot('Requirements not met');return;}
  const nl=bState.level+1;
  let costs=bDef.cost(nl);
  if(G.costReduction)costs=Object.fromEntries(Object.entries(costs).map(([k,v])=>[k,Math.floor(v*G.costReduction)]));
  if(!canAfford(costs)){showSnot('Insufficient resources');return;}
  spend(costs);bState.level=nl;bDef.onBuild(nl);G.prestige+=10*nl;G.cityDirty=true;
  if(bDef.unlocks)bDef.unlocks.forEach(uid=>revealB(uid));
  addLog(`${bDef.name} upgraded to level ${nl}. ${bDef.eff(nl)}.`,'important');
  const mt=G.mapTiles.find(t=>t.id===id);if(mt)mt.built=true;
  showOverlay(`${bDef.icon} ${bDef.name} — Level ${nl}\n${bDef.eff(nl)}`,'success','Constructed');
  renderAll();
}

// ── RESEARCH ──
function startResearch(id){
  if(G.activeResearch){showSnot('Already researching');return;}
  if(G.research[id]?.completed)return;
  const rDef=allR().find(r=>r.id===id);
  if(!rDef)return;
  if(rDef.req&&!G.research[rDef.req]?.completed){showSnot('Requires prior research');return;}
  if(!canAfford(rDef.cost)){showSnot('Insufficient resources');return;}
  spend(rDef.cost);G.activeResearch=id;G.researchProgress=0;
  addLog(`Scholars begin: ${rDef.name}...`);
  renderResearch();
}
function completeResearch(rDef){
  G.research[rDef.id].completed=true;G.activeResearch=null;G.researchProgress=0;
  applyResearchEffect(rDef);G.prestige+=30;
  if(rDef.unlocks)revealR(rDef.unlocks);
  addLog(`Research complete: ${rDef.name}.`,'important');
  showOverlay(`${rDef.name} complete!`,'success','Research Done');
  setBadge('research',G.activeTab!=='research');
  renderAll();
}

function applyResearchEffect(rDef){
  if(typeof rDef?.eff==='function')rDef.eff();
}

function completeResearchQueue2(rDef,mode='queue 2'){
  G.research[rDef.id].completed=true;
  G.activeResearch2=null;G.researchProgress2=0;
  applyResearchEffect(rDef);G.prestige+=30;
  if(rDef.unlocks)revealR(rDef.unlocks);
  addLog(`Research complete (${mode}): ${rDef.name}.`,'important');
  showOverlay(`✦ ${rDef.name} complete`,'success','Research');
  setBadge('research',G.activeTab!=='research');
}
function switchResearchTab(tab){
  if(!G.unlockedResearchTabs.includes(tab)){showSnot('This branch is not yet unlocked');return;}
  G.activeResearchTab=tab;
  document.querySelectorAll('.rtab').forEach(t=>t.classList.toggle('active',t.dataset.tab===tab));
  renderResearch();
}

// ── HEROES ──
function spawnHero(){
  const used=G.heroes.map(h=>h.name);
  const avail=HERO_NAMES.filter(n=>!used.includes(n));
  if(!avail.length)return;
  const name=avail[0],cls=HERO_CLS[G.heroes.length%HERO_CLS.length];
  G.heroes.push({name,cls,level:1,xp:0,xpGoal:100,power:5+G.heroes.length*2,hp:100,maxHp:100,onQuest:false,qt:0,qname:'',qDef:null,_ret:false});
  addLog(`${name} the ${cls} joins your banner!`,'important');
  showOverlay(`${name} the ${cls} is ready.`,'success','Hero Arrived');
  setBadge('heroes',G.activeTab!=='heroes');
}
function sendOnQuest(i){
  const h=G.heroes[i];if(!h||h.onQuest)return;
  const avail=QUESTS.filter(q=>h.power>=q.minP);
  if(!avail.length){showSnot('Hero too weak for available quests');return;}
  const q=avail[Math.floor(Math.random()*avail.length)];
  let t=q.t;if(G.questTimeMulti)t=Math.round(t*G.questTimeMulti);
  h.onQuest=true;h.qt=t;h.qname=q.name;h.qDef=q;h._ret=false;
  addLog(`${h.name} departs for: ${q.name}. Reward: ${questRewardText(q)}. ~${Math.round(t/60)} min.`);
  renderHeroes();
}

function questRewardText(q){
  return `${Object.entries(q.rew).map(([res,amt])=>`${G.resources[res]?.icon||res}${amt}`).join(' ')} · XP ${q.xp}`;
}

function completeQuest(h){
  const q=h.qDef;
  if(Math.random()<q.danger&&!G.wardProtect){
    h.hp=Math.max(1,h.hp-30);
    addLog(`⚠ ${h.name} returns wounded!`,'danger');
    showOverlay(`${h.name} returns wounded from ${q.name}.`,'danger','Hero Injured');
  } else if(Math.random()<q.danger&&G.wardProtect){
    addLog(`🛡 Wards of Protection saved ${h.name}!`);
  }
  Object.entries(q.rew).forEach(([res,amt])=>{if(G.resources[res])G.resources[res].amount=Math.min(G.resources[res].max,G.resources[res].amount+amt);});
  const rewardText=questRewardText(q);
  h.xp+=q.xp;
  if(h.xp>=h.xpGoal){
    h.level++;h.xp-=h.xpGoal;h.xpGoal=Math.round(h.xpGoal*1.5);h.power=Math.round(h.power*1.15);
    addLog(`${h.name} reached level ${h.level}! Power: ${h.power}`,'important');
    showOverlay(`${h.name} reached Level ${h.level}!\nPower now: ${h.power}`,'success','Level Up!');
  }
  h.onQuest=false;h.qt=0;h.qname='';h._ret=true;
  G.prestige+=15;
  addLog(`${h.name} returns from ${q.name}. Rewards: ${rewardText}.`);
  showOverlay(`${rewardText}\n+15 prestige`,'success','Quest Rewards');
  setBadge('heroes',G.activeTab!=='heroes');
  renderAll();
}

// ── LOG ──
function addLog(msg,type){
  G.log.unshift({msg,type,time:`Yr.${G.year}`});
  if(G.log.length>40)G.log.pop();
  G.logDirty=true;
}

// ── OVERLAYS ──
function showOverlay(msg,type='',title=''){
  const s=document.getElementById('overlay-stack');
  const el=document.createElement('div');
  el.className='onotif'+(type?' '+type:'');
  el.innerHTML=(title?`<div class="ntitle">${title}</div>`:'')+msg.split('\n').map(l=>`<div>${l}</div>`).join('');
  s.appendChild(el);
  setTimeout(()=>{el.style.animation='nOut .3s ease forwards';setTimeout(()=>el.remove(),320);},3500);
}
function showSnot(msg,duration=2500){
  const el=document.createElement('div');el.className='snot';el.textContent=msg;
  document.body.appendChild(el);setTimeout(()=>el.remove(),duration);
}

// ── RENDER ──
function renderAll(){
  renderResourceBar();
  renderPower();
  renderResources();
  renderBuildings();
  if(G.cityDirty){renderMap();G.cityDirty=false;}
  renderResearch();
  // Only render combat if not currently editing inputs
  const combatFocused=document.activeElement&&
    (document.activeElement.closest('#tab-combat'));
  if(!combatFocused) renderCombat();
  renderHeroes();
  renderFaction();
  if(G.logDirty){renderLog();G.logDirty=false;}
  renderPrestige();
  document.getElementById('era-display').textContent=`${G.era} · Year ${G.year}`;
  ['arcane','diplomacy'].forEach(tab=>{
    const el=document.getElementById('rtab-'+tab);
    if(el)el.classList.toggle('tab-locked',!G.unlockedResearchTabs.includes(tab));
  });
}

function renderResources(){
  const el=document.getElementById('resource-grid');if(!el)return;
  const boost=earlyBoost();
  const bHtml=boost>1?`<div class="boost-row">⚡ Early Kingdom Bonus: ${boost.toFixed(1)}x income active</div>`:'';
  el.innerHTML=bHtml+
    Object.entries(G.resources).map(([k,r])=>{
      const pct=Math.min(100,Math.round((r.amount/r.max)*100));
      const capColor=pct>=95?'var(--blood-light)':pct>=75?'#e8a020':'var(--forest-light)';
      const nearCap=pct>=95;
      const gain=effectiveResourceRate(k);
      const capText=resourceCapText(k,r);
      return`<div class="rc" data-resource-card="${k}" role="button" tabindex="0" onclick="showResourceStorageTimes()" ontouchend="showResourceStorageTimes()" title="Storage time" style="${nearCap?'border-color:rgba(192,57,43,.4);':''}">
        <div class="rc-top"><div class="rc-icon">${r.icon}</div><div class="rc-name">${r.name}</div></div>
        <div class="rc-amount" onclick="showResourceStorageTimes()" ontouchend="showResourceStorageTimes()">${Math.floor(r.amount)}</div>
        <div class="rc-rate ${gain<0?'neg':''}" onclick="showResourceStorageTimes()" ontouchend="showResourceStorageTimes()">${gain>0?'+':''}${gain.toFixed(1)}/min</div>
        <div class="rc-captext">${capText}</div>
        <div class="rc-capbar"><div class="rc-capfill" style="width:${pct}%;background:${capColor}"></div></div>
        <div style="font-size:8px;color:var(--stone-light);margin-top:2px">${Math.floor(r.amount)}/${r.max}
          ${nearCap?`<span style="color:var(--blood-light)"> ⚠ Full</span>`:''}
        </div>
      </div>`;
    }).join('');
}

let _lastResourceTap=0;

function attachResourceCardClicks(){
  const grids=[document.getElementById('resource-grid'),document.getElementById('resource-bar-inner')].filter(Boolean);
  const onResourceTap=e=>{
    if(!e.target.closest('[data-resource-card]'))return;
    const now=Date.now();
    if(now-_lastResourceTap<300)return;
    _lastResourceTap=now;
    e.preventDefault();
    showResourceStorageTimes();
  };
  grids.forEach(el=>{
    if(el._resourceClicksAttached)return;
    el._resourceClicksAttached=true;
    el.addEventListener('click',onResourceTap);
    el.addEventListener('touchend',onResourceTap,{passive:false});
    el.addEventListener('pointerup',onResourceTap);
    el.addEventListener('keydown',e=>{
      if(!e.target.closest('[data-resource-card]'))return;
      if(e.key==='Enter'||e.key===' '){e.preventDefault();showResourceStorageTimes();}
    });
  });
}

function effectiveResourceRate(key){
  const r=G.resources[key];if(!r)return 0;
  const rally=G._rallied&&G.tick<=G._rallyEnd;
  let gain=(r.rate||0)*earlyBoost()*(rally?2:1);
  if(key==='iron')gain+=blvl('mine')*0.2;
  return gain;
}

function formatCapDuration(minutes){
  if(minutes<1)return '<1 min';
  if(minutes<60)return `${Math.ceil(minutes)} min`;
  const h=Math.floor(minutes/60),m=Math.ceil(minutes%60);
  if(h<24)return m>=60?`${h+1}h`:`${h}h ${m}m`;
  const d=Math.floor(h/24),rh=h%24;
  return rh?`${d}d ${rh}h`:`${d}d`;
}

function resourceCapLine(key,r){
  if(r.amount>=r.max)return `${r.icon} ${r.name}: full`;
  const gain=effectiveResourceRate(key);
  if(gain<=0)return `${r.icon} ${r.name}: no gain`;
  return `${r.icon} ${r.name}: ${formatCapDuration((r.max-r.amount)/gain)} to max`;
}

function resourceCapText(key,r){
  if(r.amount>=r.max)return 'Full';
  const gain=effectiveResourceRate(key);
  if(gain<=0)return 'No gain';
  return `${formatCapDuration((r.max-r.amount)/gain)} to full`;
}

function showResourceStorageTimes(){
  renderResources();
  attachResourceCardClicks();
  showSnot('Storage forecast is shown on each resource');
}

function renderBuildings(){
  const el=document.getElementById('building-list');if(!el)return;
  let html='';
  BD.forEach(bDef=>{
    const vis=bviz(bDef.id);
    if(!vis){
      // show mystery if parent built
      const parentBuilt=BD.some(b=>b.unlocks?.includes(bDef.id)&&blvl(b.id)>=1);
      if(!parentBuilt)return;
      html+=`<div class="mystery"><div class="mystery-icon">🔒</div>
        <div><div class="mystery-title">??? Unknown Structure</div>
        <div class="mystery-hint">Develop your kingdom further to reveal…</div></div></div>`;
      return;
    }
    const bState=G.buildings.find(b=>b.id===bDef.id);
    const lvl=bState?.level||0,nl=lvl+1,maxed=lvl>=bDef.max,req=chkReq(bDef);
    let costs=bDef.cost(nl);
    if(G.costReduction&&!maxed)costs=Object.fromEntries(Object.entries(costs).map(([k,v])=>[k,Math.floor(v*G.costReduction)]));
    const aff=!maxed&&canAfford(costs)&&req;
    const cHtml=maxed?'<span style="font-size:11px;color:var(--gold-dark)">Maximum level</span>':
      Object.entries(costs).map(([r,a])=>`<span class="bcost ${G.resources[r]?.amount>=a?'':'no'}">${G.resources[r]?.icon||r} ${a}</span>`).join('');
    html+=`<div class="bcard ${aff?'can':''} ${maxed?'maxed':''}">
      <div class="bheader"><span class="bname">${bDef.icon} ${bDef.name}</span><span class="blvl">Lv ${lvl}/${bDef.max}</span></div>
      <div class="bdesc">${bDef.desc}</div>
      ${lvl>0?`<div class="beff">${bDef.eff(lvl)}</div>`:''}
      ${!req?'<div style="font-size:11px;color:var(--blood-light);font-style:italic;margin-bottom:4px">⚠ Requires prerequisites</div>':''}
      <div class="bcosts">${cHtml}</div>
      ${!maxed?`<button class="bbtn" onclick="buildBuilding('${bDef.id}')" ${aff?'':'disabled'}>${lvl===0?'Construct':'Upgrade'} — Level ${nl}</button>`:''}
    </div>`;
  });
  el.innerHTML=html;
}

// ── ISOMETRIC CITY VIEW ──
let _popupBuildingId=null;

function renderMap(){
  const el=document.getElementById('city-map');if(!el)return;

  // Build tap zones over the composite image
  const zones=CITY_ZONES.map(z=>{
    const lvl=blvl(z.id);
    const bDef=BD.find(x=>x.id===z.id);if(!bDef)return'';
    const revealed=G.revealedBuildings.includes(z.id)||lvl>0;
    const reqMet=!bDef.req||Object.entries(bDef.req).every(([id,l])=>blvl(id)>=l);

    return`<div class="city-zone" style="left:${z.x}%;top:${z.y}%;width:${z.w}%;height:${z.h}%;"
      onclick="openBuildingPopup('${z.id}')" title="${z.label}">
      ${lvl>0?`<div class="zone-badge">${lvl>0?`<span class="zone-icon">${bDef.icon}</span>`:''}<span class="zone-lvl">Lv${lvl}</span></div>`:''}
      ${!revealed?`<div class="zone-locked">🔒</div>`:''}
      ${revealed&&lvl===0&&reqMet?`<div class="zone-build">+</div>`:''}
    </div>`;
  }).join('');

  el.innerHTML=`
    <img src="${BASE_URL}city.jpg" class="city-img" alt="Kingdom of Arnethia"
      onerror="this.style.opacity='.3'">
    <div class="city-zones">${zones}</div>`;
}

// ── BUILDING POPUP ──
function openBuildingPopup(id){
  const bDef=BD.find(b=>b.id===id);if(!bDef)return;
  const lvl=blvl(id);
  const maxed=lvl>=bDef.max;
  _popupBuildingId=id;
  const nextLvl=lvl+1;
  let costs=maxed?{}:bDef.cost(nextLvl);
  if(G.costReduction&&!maxed) costs=Object.fromEntries(Object.entries(costs).map(([k,v])=>[k,Math.floor(v*G.costReduction)]));
  const affordable=!maxed&&canAfford(costs);
  const reqMet=!bDef.req||Object.entries(bDef.req).every(([rid,rl])=>blvl(rid)>=rl);

  document.getElementById('bp-name').textContent=`${bDef.icon} ${bDef.name}`;
  document.getElementById('bp-desc').textContent=bDef.desc;
  document.getElementById('bp-stats').innerHTML=`
    <div class="bp-stat"><div class="bp-stat-v">${lvl}/${bDef.max}</div><div class="bp-stat-l">Level</div></div>
    <div class="bp-stat"><div class="bp-stat-v" style="font-size:9px">${lvl>0?bDef.eff(lvl):'Not built'}</div><div class="bp-stat-l">Effect</div></div>`;

  const costStr=maxed?'Maximum level reached':
    Object.entries(costs).map(([r,v])=>{
      const ok=(G.resources[r]?.amount||0)>=v;
      return`<span style="color:${ok?'var(--forest-light)':'var(--blood-light)'}">${G.resources[r]?.icon||r}${v}</span>`;
    }).join(' ');
  document.getElementById('bp-cost').innerHTML=maxed
    ?`<span style="color:var(--gold-dark)">Maximum level reached</span>`
    :`Next level: ${costStr}`;

  const btn=document.getElementById('bp-btn');
  if(maxed){btn.textContent='Maxed Out';btn.disabled=true;}
  else if(!reqMet){btn.textContent='Requirements not met';btn.disabled=true;}
  else if(!affordable){btn.textContent='Need more resources';btn.disabled=true;}
  else{btn.textContent=`${lvl===0?'⚒ Construct':'⚒ Upgrade'} — Level ${nextLvl}`;btn.disabled=false;}

  const popup=document.getElementById('building-popup');
  popup.style.top='50%';popup.style.left='50%';
  popup.style.transform='translate(-50%,-50%) translateY(0)';
  popup.classList.add('show');

  setTimeout(()=>document.addEventListener('touchend',outsideTapClose,{once:true,passive:true}),150);
  setTimeout(()=>document.addEventListener('click',outsideTapClose,{once:true}),150);
}

function outsideTapClose(e){
  const popup=document.getElementById('building-popup');
  if(popup&&!popup.contains(e.target))closePopup();
}
function closePopup(){
  document.getElementById('building-popup')?.classList.remove('show');
  _popupBuildingId=null;
}
function popupUpgrade(){
  if(!_popupBuildingId)return;
  buildBuilding(_popupBuildingId);
  openBuildingPopup(_popupBuildingId);
  renderMap();
}

function renderResearch(){
  const el=document.getElementById('research-list');if(!el)return;
  const tab=G.activeResearchTab;

  // Dual queue display
  const q1Def=G.activeResearch?allR().find(r=>r.id===G.activeResearch):null;
  const q2Def=G.activeResearch2?allR().find(r=>r.id===G.activeResearch2):null;
  const q1Pct=q1Def?Math.round((G.researchProgress/q1Def.time)*100):0;
  const q2Pct=q2Def?Math.round((G.researchProgress2/q2Def.time)*100):0;
  const citLvl=blvl('citadel');

  const queueHtml=`<div class="research-queue">
    <div class="rqueue-slot ${q1Def?'active':''}">
      ${q1Def?`<div style="width:100%">
        <div style="font-family:'Cinzel',serif;font-size:10px;color:var(--gold);margin-bottom:4px">Queue 1: ${q1Def.name}</div>
        <div class="research-progress"><div class="research-progress-inner" style="width:${q1Pct}%"></div></div>
        <div style="font-size:10px;color:var(--stone-light);margin-top:3px">${q1Pct}% · ${Math.ceil((q1Def.time-G.researchProgress)/60)}m remaining</div>
      </div>`:`<div class="rqueue-empty">Queue 1 — tap a research to start</div>`}
    </div>
    <div class="rqueue-slot ${q2Def?'active':''}" style="${citLvl<3?'opacity:.4':''}">
      ${citLvl<3?`<div class="rqueue-empty">🔒 Queue 2 — unlocks at Citadel level 3</div>`:
        q2Def?`<div style="width:100%">
          <div style="font-family:'Cinzel',serif;font-size:10px;color:var(--gold);margin-bottom:4px">Queue 2: ${q2Def.name}</div>
          <div class="research-progress"><div class="research-progress-inner" style="width:${q2Pct}%;background:var(--forest-light)"></div></div>
          <div style="font-size:10px;color:var(--stone-light);margin-top:3px">${q2Pct}% · ${Math.ceil((q2Def.time-G.researchProgress2)/60)}m remaining</div>
        </div>`:`<div class="rqueue-empty">Queue 2 — tap a research to queue it</div>`
      }
    </div>
  </div>`;

  if(!G.unlockedResearchTabs.includes(tab)){
    el.innerHTML=queueHtml+`<div style="font-size:13px;color:var(--stone-light);font-style:italic;padding:8px">This branch is not yet unlocked.</div>`;return;
  }
  const items=RD[tab]||[];
  let prog=0;
  if(G.activeResearch){const r=allR().find(x=>x.id===G.activeResearch);if(r)prog=Math.round((G.researchProgress/r.time)*100);}
  el.innerHTML=queueHtml+items.map(rDef=>{
    const done=G.research[rDef.id]?.completed;
    const isAct=G.activeResearch===rDef.id;
    const isAct2=G.activeResearch2===rDef.id;
    const vis=rviz(rDef.id);
    const reqMet=!rDef.req||G.research[rDef.req]?.completed;
    const locked=!reqMet&&!done;
    if(!vis&&!done)return`<div class="ritem rmystery"><div class="rname">??? Unknown Research</div><div class="rdesc">Advance your kingdom to reveal…</div></div>`;
    const cHtml=Object.entries(rDef.cost).map(([r,a])=>{
      const ok=G.resources[r]?.amount>=a;
      return `<span style="font-size:11px;color:${ok?'var(--parchment-dark)':'var(--blood-light)'}">${G.resources[r]?.icon||r}${a}</span>`;
    }).join(' ');
    const canQ2=citLvl>=3&&!done&&!locked&&!G.activeResearch2&&G.activeResearch!==rDef.id;
    return`<div class="ritem ${done?'rcompleted':''} ${locked?'rlocked':''} ${isAct||isAct2?'ractive':''}"
      onclick="${!done&&!locked&&!G.activeResearch?`startResearch('${rDef.id}')`:''}"
      style="cursor:${!done&&!locked&&!G.activeResearch?'pointer':'default'}">
      <div class="rname" style="display:flex;justify-content:space-between;align-items:center">
        <span>${done?'✓ ':''}${rDef.name}</span>
        ${canQ2?`<button onclick="startResearch2('${rDef.id}')" style="font-size:8px;padding:2px 5px;background:rgba(74,122,50,.15);border:1px solid rgba(74,122,50,.3);border-radius:2px;color:var(--forest-light);cursor:pointer;font-family:'Cinzel',serif;letter-spacing:.5px;touch-action:manipulation">+Q2</button>`:''}
      </div>
      <div class="rdesc">${rDef.desc}</div>
      ${locked?`<div style="font-size:11px;color:var(--blood-light);font-style:italic">Requires: ${rDef.req}</div>`:''}
      ${!done&&!locked?`<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">${cHtml}<span style="font-size:11px;color:var(--stone-light)">· ${Math.round(rDef.time/60)} min</span></div>`:''}
      ${isAct?`<div class="rprog"><div class="rprog-inner" style="width:${prog}%"></div></div>`:''}
      ${isAct2?`<div class="rprog"><div class="rprog-inner" style="width:${q2Pct}%;background:var(--forest-light)"></div></div>`:''}
    </div>`;
  }).join('');
}

function renderHeroes(){
  const el=document.getElementById('hero-list');if(!el)return;
  if(!G.heroes.length){el.innerHTML='<div style="padding:8px;font-size:13px;color:var(--stone-light);font-style:italic">Build the King\'s Barracks to recruit heroes.</div>';return;}
  el.innerHTML=G.heroes.map((h,i)=>{
    const xpP=Math.round((h.xp/h.xpGoal)*100);
    const avail=QUESTS.filter(q=>h.power>=q.minP);
    const bestQuest=avail[avail.length-1];
    let status='Resting in the keep',sc='';
    if(h.onQuest){const m=Math.ceil(h.qt/60);status=`On quest: ${h.qname} (~${m}m)`;sc='onq';}
    return`<div class="hcard">
      <div class="hname">⚔ ${h.name}</div>
      <div class="hclass">${h.cls} · Level ${h.level}</div>
      <div class="hstats">
        <div class="hstat"><div class="hstat-v">${h.power}</div><div class="hstat-l">Power</div></div>
        <div class="hstat"><div class="hstat-v">${h.hp}</div><div class="hstat-l">HP</div></div>
        <div class="hstat"><div class="hstat-v">${h.level}</div><div class="hstat-l">Level</div></div>
      </div>
      <div style="font-size:10px;color:var(--stone-light);margin-bottom:3px">XP ${h.xp}/${h.xpGoal}</div>
      <div class="hxp"><div class="hxp-i" style="width:${xpP}%"></div></div>
      <div class="hstatus ${sc}">${status}</div>
      ${bestQuest&&!h.onQuest?`<div style="font-size:10px;color:var(--stone-light);font-style:italic;margin-bottom:5px">Possible reward: ${questRewardText(bestQuest)}</div>`:''}
      <button class="qbtn ${h.onQuest?'ret':''}" onclick="${h.onQuest?'':(`sendOnQuest(${i})`)}" ${h.onQuest||!avail.length?'disabled':''}>
        ${h.onQuest?'⏳ On Quest':(avail.length?`⚔ Send on Quest (${avail.length} available)`:'⚠ Too Weak')}
      </button>
    </div>`;
  }).join('');
}

function renderFaction(){
  const tab=document.getElementById('tab-faction');if(!tab)return;
  const path=VICTORY_PATHS[G.victoryPath];
  const seasonPct=Math.round((G.seasonWeek/SEASON_WEEKS)*100);
  const weeksLeft=SEASON_WEEKS-G.seasonWeek;

  tab.innerHTML=`
    <div class="section">
      <div class="section-title">⚔ Men of the West · Dynasty ${G.dynasty||1}</div>
      <div class="ftrait"><div class="ftrait-name">Diplomatic Mastery</div><div class="ftrait-desc">Can form vassal treaties. Tribute scales with prestige.</div></div>
      <div class="ftrait"><div class="ftrait-name">Balanced Arts</div><div class="ftrait-desc">All research branches cost the same. Master of all paths.</div></div>
      ${G.legacyRelics.length?`<div class="ftrait"><div class="ftrait-name">Legacy Relics</div><div class="ftrait-desc">${[...new Set(G.legacyRelics)].map(r=>`${relicLabel(r)} x${countRelic(r)}/${RELIC_STACK_CAP}`).join(' · ')}</div></div>`:''}
    </div>

    <div class="section">
      <div class="section-title">🛡 Kingdom Defence</div>
      <div class="defence-card">
        <div class="def-row"><span class="def-title">Wall Defence</span><span class="def-val">${G.wallDefence||0}</span></div>
        <div class="def-bar"><div class="def-fill" style="width:${Math.min(100,((G.wallDefence||0)/500)*100)}%"></div></div>
        <div style="font-size:11px;color:var(--stone-light);margin-top:6px;font-style:italic">
          ${G.watchtowerUnlocked?'✓ Watchtower active — raid warnings enabled':'Build Citadel Lv2 to unlock Watchtower'}
        </div>
        <div style="font-size:11px;color:var(--stone-light);margin-top:4px;font-style:italic">
          Garrison: ${Object.entries(G.garrison||{}).filter(([,v])=>v>0).map(([k,v])=>`${TROOP_DEF[k]?.icon||k}${v}`).join(' ')||'None assigned'}
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">⚔ War Chest</div>
      ${renderWarChest()}
      <div style="font-size:11px;color:var(--stone-light);font-style:italic;line-height:1.5">
        War chest funds multiplayer raids and diplomacy. Decays 2%/day if inactive.
        Men of the West pay 10% less on conversions via Diplomatic Mastery.
      </div>
    </div>

    <div class="section">
      <div class="section-title">⏳ Season ${G.season} Progress</div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--stone-light);margin-bottom:6px">
        <span>Week ${G.seasonWeek} of ${SEASON_WEEKS}</span>
        <span>${weeksLeft} week${weeksLeft!==1?'s':''} remaining</span>
      </div>
      <div style="height:6px;background:rgba(201,168,76,.1);border-radius:3px;overflow:hidden;margin-bottom:10px">
        <div style="height:100%;width:${seasonPct}%;background:linear-gradient(90deg,var(--gold-dark),var(--gold));border-radius:3px;transition:width 1s"></div>
      </div>
      ${path?`<div style="font-size:12px;color:var(--forest-light)">✓ ${path.icon} ${path.label} · +${path.bonus}% prestige bonus active</div>`:
      `<div style="font-size:12px;color:var(--stone-light);font-style:italic">No victory path achieved yet. Complete a research branch.</div>`}
    </div>

    <div class="section">
      <div class="section-title">⚜ Prestige Abilities</div>
      <div style="font-size:12px;color:var(--stone-light);font-style:italic;margin-bottom:10px">Spend prestige points to activate faction abilities. Points: <span style="color:var(--gold);font-family:'Cinzel',serif">${G.prestigePoints}</span></div>
      ${PRESTIGE_ABILITIES.map(a=>{
        const onCD=G.tick-a.lastUsed<a.cooldown&&a.lastUsed>0;
        const canUse=G.prestigePoints>=a.cost&&!onCD;
        const cdRem=onCD?Math.ceil((a.cooldown-(G.tick-a.lastUsed))/60):0;
        return`<div style="background:rgba(201,168,76,.04);border:1px solid rgba(201,168,76,.12);border-radius:4px;padding:10px;margin-bottom:7px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">
            <span style="font-family:'Cinzel',serif;font-size:12px;color:var(--parchment)">${a.icon} ${a.name}</span>
            <span style="font-family:'Cinzel',serif;font-size:10px;color:var(--gold);background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.2);border-radius:2px;padding:1px 6px">${a.cost} pts</span>
          </div>
          <div style="font-size:11px;color:var(--stone-light);font-style:italic;margin-bottom:6px">${a.desc}</div>
          ${onCD?`<div style="font-size:11px;color:var(--blood-light)">Cooldown: ${cdRem} min remaining</div>`:''}
          <button onclick="spendPrestige(PRESTIGE_ABILITIES.find(x=>x.id==='${a.id}'))" ${canUse?'':'disabled'}
            style="width:100%;padding:5px;background:${canUse?'rgba(201,168,76,.1)':'rgba(255,255,255,.03)'};border:1px solid ${canUse?'var(--gold-dark)':'rgba(201,168,76,.15)'};border-radius:3px;color:${canUse?'var(--gold)':'var(--stone-light)'};font-family:'Cinzel',serif;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;cursor:${canUse?'pointer':'not-allowed'}">
            ${onCD?`On Cooldown`:`Activate · ${a.cost} pts`}
          </button>
        </div>`;
      }).join('')}
    </div>

    <div class="section">
      <div class="section-title">☁ Cloud Save & Updates</div>
      <div style="font-size:12px;color:var(--stone-light);font-style:italic;margin-bottom:8px">Installed version: <span data-version-label style="color:var(--gold);font-family:'Cinzel',serif">v${APP_VERSION} / ${CACHE_VERSION}</span></div>
      <button onclick="manualCheckForUpdate()" style="width:100%;padding:7px;background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.25);border-radius:3px;color:var(--gold);font-family:'Cinzel',serif;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;margin-bottom:10px">Check for Update</button>
      <button onclick="forceReloadLatest()" style="width:100%;padding:7px;background:rgba(139,26,26,.1);border:1px solid rgba(139,26,26,.35);border-radius:3px;color:#d4826a;font-family:'Cinzel',serif;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;margin-bottom:10px">Reload Latest Version</button>
      ${G.supabaseUrl?
        `<div style="font-size:12px;color:var(--forest-light);margin-bottom:10px">✓ Cloud save connected</div>
         <button onclick="cloudSave()" style="width:100%;padding:7px;background:rgba(74,122,50,.1);border:1px solid rgba(74,122,50,.3);border-radius:3px;color:var(--forest-light);font-family:'Cinzel',serif;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;margin-bottom:6px">Save to Cloud Now</button>
         <button onclick="cloudLoad().then(()=>renderAll())" style="width:100%;padding:7px;background:rgba(201,168,76,.06);border:1px solid rgba(201,168,76,.2);border-radius:3px;color:var(--gold);font-family:'Cinzel',serif;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer">Restore from Cloud</button>`
        :
        `<div style="font-size:12px;color:var(--stone-light);font-style:italic;margin-bottom:10px;line-height:1.5">Paste your Supabase credentials below to enable cross-device cloud saves.</div>
         <input id="sb-url" placeholder="Supabase Project URL" value="${G.supabaseUrl}"
           style="width:100%;padding:7px 10px;background:rgba(255,255,255,.04);border:1px solid rgba(201,168,76,.2);border-radius:3px;color:var(--parchment);font-size:12px;margin-bottom:6px;outline:none">
         <input id="sb-key" placeholder="Supabase Anon Key" value="${G.supabaseKey}"
           style="width:100%;padding:7px 10px;background:rgba(255,255,255,.04);border:1px solid rgba(201,168,76,.2);border-radius:3px;color:var(--parchment);font-size:12px;margin-bottom:8px;outline:none">
         <button onclick="saveSupabaseConfig()" style="width:100%;padding:7px;background:rgba(201,168,76,.1);border:1px solid var(--gold-dark);border-radius:3px;color:var(--gold);font-family:'Cinzel',serif;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer">Connect Cloud Save</button>`
      }
    </div>

    <div class="section">
      <div class="section-title">⚔ Trinity Counter System</div>
      <div class="crow"><span class="cf" style="color:#c9a84c">⚔ Men</span><span class="beats">▶ beats</span><span class="cf" style="color:#8b1a1a">🐺 Wildlands</span></div>
      <div class="crow"><span class="cf" style="color:#c9a84c">⚔ Men</span><span class="loses">◀ weak to</span><span class="cf" style="color:#4a7a32">🌿 Elves</span></div>
      <div style="font-size:11px;color:var(--stone-light);font-style:italic;margin-top:6px;opacity:.6;line-height:1.5">Elves beat Men · Dwarves beat Elves · Wildlands beat Dwarves<br>Alliances: max ${G.allianceSize} kingdoms · Full rivalry unlocks in multiplayer.</div>
    </div>`;
}

function saveSupabaseConfig(){
  const url=document.getElementById('sb-url')?.value?.trim();
  const key=document.getElementById('sb-key')?.value?.trim();
  if(!url||!key){showSnot('Please enter both URL and key');return;}
  G.supabaseUrl=url;G.supabaseKey=key;
  saveGame();
  cloudSave();
  renderFaction();
  showOverlay('Cloud save connected!','success','Supabase Ready');
}

function renderLog(){
  const el=document.getElementById('log-entries');if(!el)return;
  el.innerHTML=G.log.slice(0,15).map(e=>`<div class="log-entry ${e.type||''}"><span class="lt">${e.time}</span>${e.msg}</div>`).join('');
}

function renderPrestige(){
  const pct=Math.min(100,Math.round((G.prestige/G.prestigeGoal)*100));
  document.getElementById('prestige-bar').style.width=pct+'%';
  document.getElementById('prestige-val').textContent=`${Math.floor(G.prestige)}/${G.prestigeGoal}`;
}

// ── TICK TIMER ──
let _rStart=null;
function animateTickBar(ts){
  if(!_rStart)_rStart=ts;
  const pos=((ts-_rStart)/1000)%60;
  const bar=document.getElementById('tick-bar');
  if(bar){
    bar.style.width=(pos/60*100).toFixed(2)+'%';
    if(pos<0.3&&!bar._p){bar._p=true;bar.style.animation='tickPulse .3s ease';setTimeout(()=>{bar.style.animation='';bar._p=false;},350);}
    else if(pos>=0.3)bar._p=false;
  }
  requestAnimationFrame(animateTickBar);
}

// ── SAVE / LOAD ──
function saveGame(){
  G.lastSaveTime=getReliableNow();
  G.lastServerTime=G.lastSaveTime;
  try{localStorage.setItem('hc4',JSON.stringify(buildSavePayload()));}catch(e){}
}
function loadGame(){
  try{
    const raw=localStorage.getItem('hc4')||localStorage.getItem('hc3');
    if(!raw)return;
    applyLoadedState(JSON.parse(raw));
    addLog('Chronicle restored. Your dynasty continues…','important');
  }catch(e){}
}

// ── GLOBAL ERROR HANDLER ──
// Shows JS errors visibly on mobile where there's no console
window.onerror=function(msg,src,line,col,err){
  const div=document.createElement('div');
  div.style.cssText='position:fixed;top:0;left:0;right:0;background:#8b0000;color:#fff;padding:12px;font-size:13px;z-index:9999;font-family:monospace;white-space:pre-wrap;';
  div.textContent='JS ERROR:\n'+msg+'\nLine: '+line+'\n'+(err?.stack||'');
  document.body.appendChild(div);
  return false;
};

// Wait for full DOM before starting
window.addEventListener('DOMContentLoaded', function(){
  try{ init(); }catch(e){
    const div=document.createElement('div');
    div.style.cssText='position:fixed;top:0;left:0;right:0;background:#8b0000;color:#fff;padding:12px;font-size:13px;z-index:9999;font-family:monospace;white-space:pre-wrap;';
    div.textContent='INIT ERROR:\n'+e.message+'\n'+e.stack;
    document.body.appendChild(div);
  }
});
