const G={
  year:1,era:'First Age',tick:0,
  prestige:0,prestigeGoal:1000,prestigeRate:0,
  prestigePoints:0,          // spendable prestige currency
  season:1,seasonWeek:1,seasonTick:0,
  seasonComplete:false,
  victoryPath:'mixed',       // 'military','economic','diplomatic','research','mixed'
  victoryBonus:0,            // % bonus from path progress
  dynasty:0,                 // number of prestige resets completed
  legacyRelics:[],           // relics carried across resets
  governedVillages:{},       // {farmId:{control,victories,governed}}
  adminCap:1,
  allianceSize:8,            // hard cap
  lastSaveTime: Date.now(),  // save timestamp
  lastActiveTime: Date.now(), // last real game tick timestamp for AFK calculation
  offlineCapHours:12,
  // Base resource rates are normalized from BASE_RESOURCE_RATE during init/load.
  resources:{
    gold: {amount:110, rate:1,  max:500, icon:'🪙',name:'Gold'},
    food: {amount:140, rate:1.5,max:500, icon:'🌾',name:'Food'},
    wood: {amount:120, rate:1.5,max:500, icon:'🪵',name:'Wood'},
    stone:{amount:80, rate:1,  max:500, icon:'⚙', name:'Stone'},
    iron: {amount:0, rate:0.35,max:300,icon:'⛏', name:'Iron'},
    mana: {amount:0, rate:0,max:200,icon:'✨',name:'Mana'},
  },
  buildings:[],research:{},heroes:[],
  activeResearch:null,researchProgress:0,
  mapTiles:[],log:[],logDirty:true,
  activeResearchTab:'economy',activeTab:'kingdom',
  showLockedBuildings:false,
  showMaxedBuildings:false,
  revealedBuildings:['farm','lumber','mine','market'],
  revealedResearch:['trade_routes','crop_rotation','swordsmanship','fortification'],
  unlockedResearchTabs:['economy','military'],
  costReduction:null,wardProtect:false,hasAlchemy:false,
  hasFarsight:false,hasSiege:false,questTimeMulti:null,fortBonus:0,
  // ==== COMBAT STATE ====
  troops:{
    infantry:{total:0,available:0,injured:0,training:0,trainEnd:0},
    archers: {total:0,available:0,injured:0,training:0,trainEnd:0},
    cavalry: {total:0,available:0,injured:0,training:0,trainEnd:0},
    siege:   {total:0,available:0,injured:0,training:0,trainEnd:0},
  },
  hospital:{capacity:100,recovering:0,recoverEnd:0},
  npcFarms:[],activeRaids:[],combatLog:[],
  raidReports:[],
  autoFarm:{},                    // {farmId: {enabled, ...legacySettings}}
  // ==== DEFENCE ====
  wallDefence:0,
  garrison:{infantry:0,archers:0,cavalry:0},
  watchtowerUnlocked:false,
  // ==== WAR CHEST ====
  warChest:0,
  warChestCap:500,
  warChestDecayRate:0.02,         // 2% per day
  warChestWeeklyConverted:0,
  warChestWeeklyLimit:1000,
  lastWarChestDecay:0,
  // ==== DUAL RESEARCH ====
  activeResearch2:null,
  researchProgress2:0,
  // ==== STORAGE ====
  storageLevels:{granary:0,vault:0,timberyard:0,armoury:0,manawell:0},
  manaBuffs:{harvestEnd:0,battleEnd:0,wardEnd:0},
  // ==== UI FLAGS ====
  cityDirty:true,
  logDirty:true,
  // ==== KINGDOM IDENTITY ====
  kingdomName:'Arnethia',
  playerName:'',
  // ==== TUTORIAL ====
  tutorialStep:0,
  tutorialDone:false,
  // ==== MILESTONES ====
  milestonesReached:[],
  // Supabase config
  supabaseUrl:'',supabaseKey:'',
};

function earlyBoost(){
  // Tapers from 5x at 0 buildings to 1x at 25 total levels - much slower fade
  const t=G.buildings.reduce((s,b)=>s+b.level,0);
  return Math.max(1, 2.25-(t*0.10));
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

const APP_VERSION = '1.2.8';
const CACHE_VERSION = 'hc-v50';
const RELIC_STACK_CAP = 5;

const BASE_RESOURCE_MAX={gold:900,food:900,wood:900,stone:900,iron:600,mana:400};
const BASE_RESOURCE_RATE={gold:1,food:1.5,wood:1.5,stone:1,iron:0.35,mana:0};
const BUILDING_RATE_BONUS={
  farm:{food:2},
  lumber:{wood:2},
  mine:{stone:2},
  market:{gold:3},
  ironworks:{iron:1.25},
  tower:{mana:2},
};
const CITADEL_CAP_PER_LEVEL=700;
const STORAGE_CAP_PER_LEVEL={granary:700,vault:700,timberyard:700,armoury:650,manawell:650};

const MANA_ABILITIES=[
  {id:'harvest',name:'Harvest Blessing',icon:'✨',cost:110,duration:600,desc:'+50% resource income for 10 minutes.'},
  {id:'battle',name:'Battle Hymn',icon:'⚔',cost:145,duration:900,desc:'+25% army power for 15 minutes.'},
  {id:'ward',name:'Ley Ward',icon:'🛡',cost:90,duration:900,desc:'-25% raid injuries for 15 minutes.'},
];

const VILLAGE_FOCUS={
  balanced:{label:'Balanced',desc:'Keep tribute steady across all outputs.'},
  gold:{label:'Treasury',desc:'Push more coin from this village treasury.'},
  food:{label:'Granary',desc:'Turn the village toward food tribute.'},
  wood:{label:'Lumber',desc:'Focus the village on timber output.'},
  stone:{label:'Masonry',desc:'Direct workers toward stone tribute.'},
  iron:{label:'Foundry',desc:'Drive more iron from local forges.'},
  mana:{label:'Sanctum',desc:'Draw out arcane remnants and mana tribute.'},
};

const GOVERNOR_TRAITS={
  steward:{label:'Steward',desc:'+20% tribute from this village.'},
  warden:{label:'Warden',desc:'+40 wall defence while this village is governed.'},
  quartermaster:{label:'Quartermaster',desc:'+10% loot capacity on raids after this village joins your realm.'},
};

const HERO_LEVEL_CAP = 20;

// ==== UPDATE CHECKER ====
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
    <span>* ${msg}</span>
    <button onclick="applyUpdate()" style="background:rgba(201,168,76,.2);border:1px solid var(--gold);
      border-radius:3px;padding:4px 10px;color:var(--gold);font-family:'Cinzel',serif;
      font-size:10px;letter-spacing:1px;cursor:pointer;touch-action:manipulation;">Update</button>
    <button onclick="this.parentElement.remove()" style="background:none;border:none;
      color:var(--stone-light);font-size:16px;cursor:pointer;padding:0 4px;touch-action:manipulation;">x</button>`;
  document.body.appendChild(el);
}

async function manualCheckForUpdate(){
  if(!('serviceWorker' in navigator)){
    showSnot('Updates are not supported in this browser');
    return;
  }
  showSnot(`Checking for updates - v${APP_VERSION}`);
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

  // ==== ADVANCE G.tick first - this fixes ALL absolute-tick timers ====
  // Troop training, hospital, raids, respawns all use G.tick comparisons
  G.tick+=ticks;

  // Resources
  Object.values(G.resources).forEach(r=>{
    if(r.rate>0) r.amount=Math.min(r.max, r.amount+(r.rate*boost/60)*ticks);
  });

  // Prestige
  const pRate=1+(G.prestigeRate>0?G.prestigeRate*(1+(G.victoryBonus/100)):0);
  G.prestige=Math.min(G.prestigeGoal, G.prestige+(pRate/60)*ticks);
  G.prestigePoints=Math.min(9999, G.prestigePoints+Math.floor((pRate*ticks)/300));

  applyVillageTribute(ticks/60);

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

  seasonTick(ticks);

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

// ==== VICTORY PATHS ====
function checkVictoryPath(){
  const completed=Object.entries(VICTORY_PATHS).filter(([,path])=>path.check());
  if(!completed.length)return;
  const currentValid=G.victoryPath!=='mixed' && VICTORY_PATHS[G.victoryPath]?.check();
  if(currentValid){
    G.victoryBonus=VICTORY_PATHS[G.victoryPath].bonus;
    return;
  }
  const [key,path]=completed[0];
  if(G.victoryPath!==key){
    G.victoryPath=key;
    G.victoryBonus=path.bonus;
    addLog(`${path.icon} ${path.label} path achieved! +${path.bonus}% renown bonus active.`,'important');
    showOverlay(`${path.label}\n+${path.bonus}% renown bonus!`,'success','Victory Path Achieved');
  }
}

// ==== PRESTIGE SPENDING ====
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

// ==== SEASON STRUCTURE ====

function seasonTick(ticks=1){
  if(G.seasonComplete)return;
  G.seasonTick+=ticks;
  while(G.seasonTick>=TICKS_PER_WEEK){
    G.seasonTick-=TICKS_PER_WEEK;
    G.seasonWeek++;
    if(G.seasonWeek>SEASON_WEEKS){
      endSeason();
      break;
    }
    addLog(`The annals turn. Season ${G.season}, Week ${G.seasonWeek} begins across the realm.`,'important');
    showOverlay(`Season ${G.season} - Week ${G.seasonWeek}\nA new week dawns over Arnethia.`, 'success', 'Chronicle Updated');
  }
}

function endSeason(){
  if(G.seasonComplete)return;
  G.seasonComplete=true;
  const path=VICTORY_PATHS[G.victoryPath];
  const finalPrestige=Math.floor(G.prestige*(1+(G.victoryBonus/100)))+strongholdSeasonRenown();
  showSeasonEndScreen(finalPrestige, path);
}

function showSeasonEndScreen(finalPrestige, path){
  const existing=document.getElementById('season-overlay');
  if(existing)existing.remove();
  const overlay=document.createElement('div');
  overlay.id='season-overlay';
  overlay.style.cssText=`position:fixed;inset:0;background:rgba(5,4,2,.97);z-index:1000;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;`;
  const relicOptions=[
    {id:'relic_gold',name:'Merchant\'s Seal',icon:'🪙',desc:'+10% gold income in future dynasties'},
    {id:'relic_combat',name:'Sword of Ages',icon:'⚔',desc:'+15% hero power in future dynasties'},
    {id:'relic_research',name:'Ancient Tome',icon:'📚',desc:'-10% research time in future dynasties'},
  ];
  const allRelicsCapped=relicOptions.every(r=>countRelic(r.id)>=RELIC_STACK_CAP);
  const pathText=path?(path.icon+' '+path.label+' · +'+path.bonus+'% bonus applied'):'Mixed path';
  const introText=allRelicsCapped?'Your relic vault is full. Advance the dynasty without claiming an extra relic.':'Your realm endures. Choose the legacy that will strengthen it next.';
  const continueText=allRelicsCapped?'All legacy relics are already at the cap. No additional relic will be granted this season.':'Select a relic to continue';
  const buttonText=allRelicsCapped?'Advance Dynasty - Relics Maxed':'Advance Dynasty';
  const relicCards=relicOptions.map(r=>{
    const stacks=countRelic(r.id);
    const capped=stacks>=RELIC_STACK_CAP;
    return `
      <div onclick="selectRelic('${r.id}')" data-relic="${r.id}" data-capped="${capped?1:0}" style="background:rgba(201,168,76,.06);border:1px solid rgba(201,168,76,.2);border-radius:4px;padding:10px 14px;cursor:${capped?'not-allowed':'pointer'};display:flex;align-items:center;gap:10px;transition:all .2s;opacity:${capped?0.45:1}">
        <span style="font-size:22px">${r.icon}</span>
        <div><div style="font-family:'Cinzel',serif;font-size:12px;color:var(--parchment)">${r.name}</div>
        <div style="font-size:11px;color:var(--stone-light);font-style:italic">${r.desc} · ${stacks}/${RELIC_STACK_CAP}${capped?' max':''}</div></div>
      </div>`;
  }).join('');
  overlay.innerHTML=`
    <div style="font-family:'Cinzel',serif;text-align:center;max-width:400px;width:100%">
      <div style="font-size:11px;letter-spacing:3px;color:var(--gold-dark);text-transform:uppercase;margin-bottom:8px">Season ${G.season} Complete</div>
      <div style="font-size:26px;color:var(--gold);font-weight:700;margin-bottom:4px">Dynasty ${G.dynasty+1} Ascends</div>
      <div style="font-size:14px;color:var(--parchment-dark);font-style:italic;margin-bottom:20px">${introText}</div>
      <div style="background:rgba(201,168,76,.08);border:1px solid var(--panel-border);border-radius:6px;padding:14px;margin-bottom:20px">
        <div style="font-size:13px;color:var(--gold-dark);margin-bottom:6px;letter-spacing:1px;text-transform:uppercase">Season Renown</div>
        <div style="font-size:32px;color:var(--gold);font-weight:700;font-family:'Cinzel',serif">${finalPrestige.toLocaleString()}</div>
        <div style="font-size:12px;color:var(--forest-light);margin-top:4px">${pathText}</div>
      </div>
      <div style="font-size:12px;color:var(--gold-dark);letter-spacing:1px;text-transform:uppercase;margin-bottom:10px">Choose Your Legacy Relic</div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">${relicCards}</div>
      <div style="font-size:11px;color:var(--forest-light);font-style:italic;margin-bottom:16px">Every second dynasty also grants +1 realm administration slot.</div>
      <button onclick="beginNewDynasty()" id="new-dynasty-btn" ${allRelicsCapped?'':'disabled'} style="width:100%;padding:12px;background:rgba(201,168,76,.1);border:1px solid var(--gold-dark);border-radius:4px;color:var(--gold);font-family:'Cinzel',serif;font-size:13px;letter-spacing:2px;text-transform:uppercase;cursor:${allRelicsCapped?'pointer':'not-allowed'};opacity:${allRelicsCapped?'1':'.4'}">
        ${buttonText}
      </button>
      <div style="font-size:11px;color:var(--stone-light);font-style:italic;margin-top:8px">${continueText}</div>
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
  const relicIds=['relic_gold','relic_combat','relic_research'];
  const allRelicsCapped=relicIds.every(id=>countRelic(id)>=RELIC_STACK_CAP);
  if(!_selectedRelic && !allRelicsCapped){
    showSnot('Select a relic to continue');
    return;
  }
  if(_selectedRelic){
    if(countRelic(_selectedRelic)>=RELIC_STACK_CAP){
      if(!allRelicsCapped){
        showSnot('Relic stack cap reached');
        return;
      }
      _selectedRelic=null;
    }else{
      G.legacyRelics.push(_selectedRelic);
    }
  }
  G.dynasty++;
  G.season++;
  G.seasonWeek=1;
  G.seasonTick=0;
  G.seasonComplete=false;
  G.victoryPath='mixed';
  G.victoryBonus=0;
  G.prestige=0;
  G.prestigePoints=0;
  G.prestigeGoal+=250;
  G.npcFarms.forEach(farm=>{
    const state=getVillageState(farm.id);
    if(isFrontierTarget(farm)){
      Object.entries(state.garrison||{}).forEach(([type,qty])=>{
        if(qty>0&&G.troops[type])G.troops[type].available+=qty;
      });
      state.captured=false;
      state.control=0;
      state.defenseWins=0;
      state.garrison={infantry:0,archers:0,cavalry:0};
      farm.available=true;
      farm.respawnAt=0;
    }
  });

  if(_selectedRelic==='relic_gold') G.resources.gold.rate+=2;
  if(_selectedRelic==='relic_combat') G.heroes.forEach(h=>h.power=Math.round(h.power*1.15));
  if(G.dynasty%2===0) G.adminCap++;

  _selectedRelic=null;
  const overlay=document.getElementById('season-overlay');
  if(overlay)overlay.remove();

  addLog(`Dynasty ${G.dynasty} rises. The realm carries its strength forward.`,'important');
  showOverlay(`Dynasty ${G.dynasty} Advances\nSeason ${G.season} begins with your kingdom intact.`,'success','New Dynasty');
  renderAll();
  saveGame();
}



// Cost helper — cheap early levels, steeper later. Base * 1.65^(level-1)
function bCost(base, l){
  return Math.round(base * Math.pow(1.65, l-1));
}


function expectedStorageCaps(){
  const citadelLvl=blvl('citadel');
  return {
    gold:BASE_RESOURCE_MAX.gold+(citadelLvl*CITADEL_CAP_PER_LEVEL)+(blvl('vault')*STORAGE_CAP_PER_LEVEL.vault),
    food:BASE_RESOURCE_MAX.food+(citadelLvl*CITADEL_CAP_PER_LEVEL)+(blvl('granary')*STORAGE_CAP_PER_LEVEL.granary),
    wood:BASE_RESOURCE_MAX.wood+(citadelLvl*CITADEL_CAP_PER_LEVEL)+(blvl('timberyard')*STORAGE_CAP_PER_LEVEL.timberyard),
    stone:BASE_RESOURCE_MAX.stone+(citadelLvl*CITADEL_CAP_PER_LEVEL),
    iron:BASE_RESOURCE_MAX.iron+(citadelLvl*CITADEL_CAP_PER_LEVEL)+(blvl('armoury')*STORAGE_CAP_PER_LEVEL.armoury),
    mana:BASE_RESOURCE_MAX.mana+(citadelLvl*CITADEL_CAP_PER_LEVEL)+(blvl('manawell')*STORAGE_CAP_PER_LEVEL.manawell),
  };
}

function hasResearch(id){
  return !!G.research[id]?.completed;
}

function currentAdminCap(){
  return G.adminCap+Math.floor(blvl('citadel')/2)+(hasResearch('provincial_rule')?1:0);
}

function villageTributeResearchMultiplier(){
  let mult=1;
  if(hasResearch('guild_ledgers'))mult+=0.15;
  if(hasResearch('provincial_rule'))mult+=0.10;
  return mult;
}

function normalizeDerivedBuildingState(){
  Object.entries(BASE_RESOURCE_RATE).forEach(([key,val])=>{
    if(G.resources[key])G.resources[key].rate=val;
  });
  const caps=expectedStorageCaps();
  Object.entries(caps).forEach(([key,val])=>{
    if(G.resources[key])G.resources[key].max=val;
  });
  Object.entries(BUILDING_RATE_BONUS).forEach(([buildingId, bonus])=>{
    const lvl=blvl(buildingId);
    Object.entries(bonus).forEach(([key,val])=>{
      G.resources[key].rate+=lvl*val;
    });
  });
  if(hasResearch('trade_routes'))G.resources.gold.rate*=1.25;
  if(hasResearch('crop_rotation'))G.resources.food.rate*=1.30;
  if(hasResearch('stonemasons'))G.resources.stone.rate*=1.50;
  if(hasResearch('banking')){
    G.resources.gold.rate+=5;
    G.resources.gold.max*=2;
  }
  if(hasResearch('storehouses')){
    Object.values(G.resources).forEach(r=>r.max=Math.floor(r.max*1.35));
  }
  if(hasResearch('guild_ledgers'))G.resources.gold.rate+=6;
  if(hasResearch('runic_script'))G.resources.mana.rate+=1;
  if(hasResearch('mana_reservoirs')){
    G.resources.mana.rate+=2;
    G.resources.mana.max+=400;
  }
  G.resources.gold.rate+=hasResearch('envoys')?10:0;
  G.resources.gold.rate=Math.round(G.resources.gold.rate*10)/10;
  G.resources.food.rate=Math.round(G.resources.food.rate*10)/10;
  G.resources.wood.rate=Math.round(G.resources.wood.rate*10)/10;
  G.resources.stone.rate=Math.round(G.resources.stone.rate*10)/10;
  G.resources.iron.rate=Math.round(G.resources.iron.rate*10)/10;
  G.resources.mana.rate=Math.round(G.resources.mana.rate*10)/10;

  G.costReduction=hasResearch('trade_alliance')?0.85:null;
  G.wardProtect=hasResearch('warding');
  G.hasAlchemy=hasResearch('alchemy');
  G.hasFarsight=hasResearch('farseeing');
  G.hasSiege=hasResearch('siegecraft');
  G.questTimeMulti=hasResearch('cavalry')?0.5:null;
  G.fortBonus=hasResearch('fortification')?40:0;
  G.prestigeRate=(blvl('citadel')*25)+(hasResearch('treaties')?20:0);
  G.wallDefence=blvl('citadel')*50;
  G.warChestCap=500+(blvl('citadel')*200);
  G.watchtowerUnlocked=blvl('citadel')>=2;
  if(blvl('tower')>0&&!G.unlockedResearchTabs.includes('arcane'))G.unlockedResearchTabs.push('arcane');
  if(blvl('citadel')>0&&!G.unlockedResearchTabs.includes('diplomacy'))G.unlockedResearchTabs.push('diplomacy');
  const hospitalLvl=blvl('hospital');
  G.hospital.capacity=hospitalLvl>0?(150+(hospitalLvl*150)):100;
  refreshResearchVisibility();
  Object.values(G.resources).forEach(r=>{
    r.amount=Math.min(r.amount,r.max);
  });
}

function normalizeHeroes(){
  G.heroes=(G.heroes||[]).map(h=>{
    const maxHp=Math.max(100,h.maxHp||100);
    const level=Math.max(1,h.level||1);
    const onQuest=!!h.onQuest;
    return {
      ...h,
      level,
      maxHp,
      hp:onQuest?Math.min(maxHp,Math.max(1,h.hp??maxHp)):maxHp,
      assignment:h.assignment||'',
    };
  });
}

function initCombat(){
  G.npcFarms=NPC_FARMS.map(f=>({...f}));
}

function isManaBuffActive(id){
  const key=`${id}End`;
  return (G.manaBuffs?.[key]||0)>G.tick;
}

function manaBuffRemaining(id){
  const key=`${id}End`;
  return Math.max(0,Math.ceil(((G.manaBuffs?.[key]||0)-G.tick)/60));
}

function activateManaAbility(id){
  const ability=MANA_ABILITIES.find(a=>a.id===id);
  if(!ability){showSnot('Unknown mana ritual');return;}
  if((G.resources.mana.amount||0)<ability.cost){showSnot('Not enough mana');return;}
  if(isManaBuffActive(id)){showSnot(`${ability.name} is already active`);return;}
  G.resources.mana.amount-=ability.cost;
  G.manaBuffs[`${id}End`]=G.tick+ability.duration;
  addLog(`${ability.name} is invoked. ${ability.desc}`,'important');
  showOverlay(`${ability.name}\n${ability.desc}`,'success','Mana Ritual');
  renderAll();
  saveGame();
}

function heroArmyBonusFor(h){
  return Math.min(0.18,0.03+(h.level*0.005));
}

function totalAssignedHeroArmyBonus(){
  return G.heroes.reduce((sum,h)=>sum+((h.assignment==='army')?heroArmyBonusFor(h):0),0);
}

function heroCityDefenseBonusFor(h){
  return 40+(h.level*12)+Math.round(h.power*1.5);
}

function totalAssignedCityHeroBonus(){
  return G.heroes.reduce((sum,h)=>sum+((h.assignment==='city')?heroCityDefenseBonusFor(h):0),0);
}

function assignHeroToArmy(i){
  const h=G.heroes[i];
  if(!h)return;
  if(h.onQuest){showSnot('Hero must return from quest first');return;}
  h.assignment='army';
  h.autoQuest=false;
  addLog(`${h.name} is assigned to the field army. Army power rises by ${Math.round(heroArmyBonusFor(h)*100)}%.`,'important');
  renderAll();
  saveGame();
}

function assignHeroToCity(i){
  const h=G.heroes[i];
  if(!h)return;
  if(h.onQuest){showSnot('Hero must return from quest first');return;}
  h.assignment='city';
  h.autoQuest=false;
  addLog(`${h.name} is assigned to the city watch. Wall defence rises by ${heroCityDefenseBonusFor(h)}.`, 'important');
  renderAll();
  saveGame();
}

function releaseHeroFromArmy(i){
  const h=G.heroes[i];
  if(!h)return;
  h.assignment='';
  addLog(`${h.name} returns from army command and can quest again.`);
  renderAll();
  saveGame();
}

function releaseHeroFromCity(i){
  const h=G.heroes[i];
  if(!h)return;
  h.assignment='';
  addLog(`${h.name} returns from the city watch and can quest again.`);
  renderAll();
  saveGame();
}

// ==== TROOP TRAINING ====
function trainTroops(type,qty){
  const def=TROOP_DEF[type];
  if(!def)return;
  if(qty<1){showSnot('Enter a troop amount');return;}
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

function maxTrainQty(type){
  const def=TROOP_DEF[type];
  if(!def)return 0;
  const limits=Object.entries(def.cost).map(([r,v])=>Math.floor((G.resources[r]?.amount||0)/v));
  return Math.max(0,Math.min(...limits));
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

// ==== NPC FARM ATTACK ====
function calcAttackPower(sent){
  const base=Object.entries(sent).reduce((sum,[type,qty])=>{
    return sum+(TROOP_DEF[type]?.atk||0)*qty;
  },0);
  const bonus=totalAssignedHeroArmyBonus()+(isManaBuffActive('battle')?0.25:0);
  return Math.floor(base*(1+bonus));
}

function calcReadyTroopPower(){
  const base=Object.entries(G.troops).reduce((sum,[type,t])=>{
    return sum+(TROOP_DEF[type]?.atk||0)*(t.available||0);
  },0);
  const bonus=totalAssignedHeroArmyBonus()+(isManaBuffActive('battle')?0.25:0);
  return Math.floor(base*(1+bonus));
}

function calcLootCapacity(sent){
  const base=Object.entries(sent).reduce((sum,[type,qty])=>{
    return sum+(TROOP_DEF[type]?.carry||0)*qty;
  },0);
  const logisticsBonus=hasResearch('campaign_logistics')?0.2:0;
  return Math.floor(base*(1+totalQuartermasterBonus()+logisticsBonus));
}

function farmLootTotal(farm){
  return Object.values(scaledFarmLoot(farm)).reduce((sum,val)=>sum+val,0);
}

function getVillageState(farmId){
  if(!G.governedVillages[farmId]){
    G.governedVillages[farmId]={control:0,victories:0,governed:false,captured:false,defenseWins:0,focus:'balanced',trait:'steward',garrison:{infantry:0,archers:0,cavalry:0}};
  }
  if(G.governedVillages[farmId].captured==null)G.governedVillages[farmId].captured=false;
  if(G.governedVillages[farmId].defenseWins==null)G.governedVillages[farmId].defenseWins=0;
  if(!G.governedVillages[farmId].garrison)G.governedVillages[farmId].garrison={infantry:0,archers:0,cavalry:0};
  return G.governedVillages[farmId];
}

function isStronghold(farm){
  return farm?.kind==='stronghold';
}

function isOrcHorde(farm){
  return farm?.kind==='horde';
}

function isFrontierTarget(farm){
  return isStronghold(farm)||isOrcHorde(farm);
}

function hasAnyRaidVictory(){
  return G.combatLog.some(e=>e.type==='victory');
}

function raidVictoryCount(){
  return G.combatLog.filter(e=>e.type==='victory').length;
}

function scaledFarmLoot(farm){
  if(!farm?.lootScale)return farm?.loot||{};
  const loot={};
  Object.entries(farm.lootScale).forEach(([key,pct])=>{
    loot[key]=Math.max(1,Math.floor((G.resources[key]?.max||0)*pct));
  });
  return loot;
}

function canSeeFarm(farm){
  if(isOrcHorde(farm))return orcHordeUnlocked();
  if(isStronghold(farm)){
    return G.seasonWeek>=Math.max(1,(farm.captureWeek||1)-1) || capturedStrongholds().length>0 || governedVillageCount()>=2;
  }
  const victories=raidVictoryCount();
  if(farm.id==='n1')return true;
  if(['n2','n3'].includes(farm.id))return victories>=1;
  if(['n4','n6'].includes(farm.id))return victories>=3 || blvl('barracks')>=2;
  if(['n5','n7'].includes(farm.id))return governedVillageCount()>=1 || victories>=5 || blvl('barracks')>=3;
  if(farm.id==='n8')return governedVillageCount()>=2 || victories>=7 || blvl('barracks')>=4;
  return false;
}

function combatRevealHint(){
  const victories=raidVictoryCount();
  if(victories===0)return 'Only the Peasant Village lies plainly before your scouts. Win there first, and the nearby roads and crossings will begin to reveal themselves.';
  if(victories<3)return 'Your first victory has stirred the borderlands. River Crossing and the Abandoned Fort now lie within reach.';
  if(governedVillageCount()===0)return 'Repeated victories will push the realm outward. Bring a village under tribute to reveal the wider frontier.';
  if(governedVillageCount()<2)return 'Your banner now carries farther. Keep raiding and governing villages to uncover the far trade routes and frontier sites.';
  return '';
}

function weekUnlockLead(){
  const upcoming=G.npcFarms
    .filter(f=>isStronghold(f)&&G.seasonWeek<(f.captureWeek||1))
    .sort((a,b)=>(a.captureWeek||99)-(b.captureWeek||99))[0];
  if(!upcoming)return '';
  const weeksAway=(upcoming.captureWeek||1)-G.seasonWeek;
  if(weeksAway<=0)return '';
  return `${upcoming.name} unlocks in Week ${upcoming.captureWeek}${weeksAway>0?` (${weeksAway} week${weeksAway!==1?'s':''} away)`:''}.`;
}

function governedVillageCount(){
  return Object.values(G.governedVillages||{}).filter(v=>v.governed).length;
}

function capturedStrongholds(){
  return G.npcFarms.filter(f=>isStronghold(f)&&getVillageState(f.id).captured);
}

function strongholdSeasonRenown(){
  return G.npcFarms.reduce((sum,farm)=>{
    const state=getVillageState(farm.id);
    if(isStronghold(farm)&&state.captured)return sum+(farm.seasonalRenown||0);
    if(isOrcHorde(farm)&&state.captured)return sum+(farm.seasonalRenown||0);
    return sum;
  },0);
}

function orcHordeUnlocked(){
  const strongholds=G.npcFarms.filter(isStronghold);
  return strongholds.length>0&&strongholds.every(f=>{
    const state=getVillageState(f.id);
    return state.captured&&state.defenseWins>=3;
  });
}

function villageTributeMultiplier(){
  return (1+(G.dynasty*0.05)+(G.victoryPath==='diplomatic'?0.15:0))*villageTributeResearchMultiplier();
}

function cityGarrisonPower(){
  const troopBonus=hasResearch('campaign_logistics')?1.1:1;
  const troopPower=Object.entries(G.garrison||{}).reduce((sum,[type,qty])=>{
    return sum+(((TROOP_DEF[type]?.atk||0)*qty)*troopBonus);
  },0);
  return Math.floor(troopPower);
}

function currentWallDefence(){
  return (G.wallDefence||0)+totalWardenWallBonus()+cityGarrisonPower()+totalAssignedCityHeroBonus();
}

function refreshResearchVisibility(){
  const visible=new Set(G.revealedResearch||[]);
  ['trade_routes','crop_rotation','swordsmanship','fortification'].forEach(id=>visible.add(id));
  allR().forEach(r=>{
    if(G.research[r.id]?.completed)visible.add(r.id);
    if(r.req&&G.research[r.req]?.completed)visible.add(r.id);
  });
  allR().forEach(r=>{
    if(G.research[r.id]?.completed&&(r.unlocks||[]).length){
      r.unlocks.forEach(id=>visible.add(id));
    }
  });
  G.revealedResearch=[...visible];
}

function villageFocusOptions(farm){
  return ['balanced',...Object.keys(farm.tribute||{})];
}

function villageFocusLabel(id){
  return VILLAGE_FOCUS[id]?.label||id;
}

function villageFocusDesc(id){
  return VILLAGE_FOCUS[id]?.desc||'';
}

function governorTraitLabel(id){
  return GOVERNOR_TRAITS[id]?.label||id;
}

function governorTraitDesc(id){
  return GOVERNOR_TRAITS[id]?.desc||'';
}

function totalQuartermasterBonus(){
  return Object.values(G.governedVillages||{}).filter(v=>v.governed&&v.trait==='quartermaster').length*0.1;
}

function totalWardenWallBonus(){
  return Object.values(G.governedVillages||{}).filter(v=>v.governed&&v.trait==='warden').length*40;
}

function villageTributePerMinute(farm){
  if(isFrontierTarget(farm))return {};
  const tribute={};
  const state=getVillageState(farm.id);
  const focus=state.focus||'balanced';
  const traitMult=state.trait==='steward'?1.2:1;
  Object.entries(farm.tribute||{}).forEach(([key,val])=>{
    let focusMult=1;
    if(focus!=='balanced'){
      focusMult=focus===key?1.8:0.7;
    }
    tribute[key]=val*villageTributeMultiplier()*focusMult*traitMult;
  });
  return tribute;
}

function tributeRateString(tribute, perHour=false){
  const mult=perHour?60:1;
  const suffix=perHour?'/h':'/m';
  return Object.entries(tribute).map(([key,val])=>`${G.resources[key]?.icon||key}${(val*mult).toFixed(1)}${suffix}`).join(' ');
}

function villageTributeString(farm, perHour=false){
  return tributeRateString(villageTributePerMinute(farm), perHour);
}

function addVillageControl(farmId, amount){
  const farm=G.npcFarms.find(f=>f.id===farmId);
  if(!farm)return;
  const state=getVillageState(farmId);
  if(state.governed||state.captured)return;
  const before=state.control||0;
  state.victories=(state.victories||0)+1;
  state.control=Math.min(farm.controlNeed||100, before+amount);
  if(before<(farm.controlNeed||100)&&state.control>=(farm.controlNeed||100)){
    addLog(`${farm.name} is ready to be brought under your banner.`,'important');
    showOverlay(`${farm.name}\nControl established. You can now govern this village.`,'success','Village Ready');
  }
}

function totalVillageTributePerMinute(){
  const totals={};
  G.npcFarms.forEach(farm=>{
    const state=getVillageState(farm.id);
    if(!state.governed)return;
    Object.entries(villageTributePerMinute(farm)).forEach(([key,val])=>{
      totals[key]=(totals[key]||0)+val;
    });
  });
  return totals;
}

function applyVillageTribute(minutes){
  if(minutes<=0)return;
  G.npcFarms.forEach(farm=>{
    const state=getVillageState(farm.id);
    if(!state.governed)return;
    Object.entries(villageTributePerMinute(farm)).forEach(([key,val])=>{
      if(G.resources[key]){
        G.resources[key].amount=Math.min(G.resources[key].max,G.resources[key].amount+(val*minutes));
      }
    });
  });
}

function canGovernVillage(farm){
  const state=getVillageState(farm.id);
  if(isFrontierTarget(farm))return false;
  return !state.governed&&(state.control||0)>=(farm.controlNeed||100)&&governedVillageCount()<currentAdminCap();
}

function governVillage(farmId){
  const farm=G.npcFarms.find(f=>f.id===farmId);
  if(!farm)return;
  const state=getVillageState(farmId);
  if(state.governed){showSnot('Village already governed');return;}
  if((state.control||0)<(farm.controlNeed||100)){showSnot('Win more raids to establish control');return;}
  if(governedVillageCount()>=currentAdminCap()){showSnot('Increase administration capacity first');return;}
  state.governed=true;
  state.focus=state.focus||'balanced';
  state.trait=state.trait||'steward';
  addLog(`${farm.name} now sends tribute to ${G.kingdomName}.`,'important');
  showOverlay(`${farm.name}\nNow governed. Tribute begins to flow each minute.`,'success','Village Governed');
  renderAll();
  saveGame();
}

function setVillageFocus(farmId, focus){
  const farm=G.npcFarms.find(f=>f.id===farmId);
  if(!farm)return;
  const state=getVillageState(farmId);
  if(!state.governed){showSnot('Govern the village first');return;}
  if(!villageFocusOptions(farm).includes(focus)){showSnot('That focus is not available here');return;}
  if(state.focus===focus)return;
  state.focus=focus;
  addLog(`${farm.name} now follows a ${villageFocusLabel(focus)} focus.`,'important');
  renderAll();
  saveGame();
}

function setVillageTrait(farmId, trait){
  const farm=G.npcFarms.find(f=>f.id===farmId);
  if(!farm)return;
  const state=getVillageState(farmId);
  if(!state.governed){showSnot('Govern the village first');return;}
  if(!GOVERNOR_TRAITS[trait]){showSnot('Unknown governor trait');return;}
  if(state.trait===trait)return;
  state.trait=trait;
  addLog(`${farm.name} now follows a ${governorTraitLabel(trait)} governor.`,'important');
  renderAll();
  saveGame();
}

function adjustCityGarrison(type,delta){
  if(delta>0){
    const move=Math.min(delta,G.troops[type]?.available||0);
    if(move<=0){showSnot(`No ${TROOP_DEF[type]?.name||type} available`);return;}
    G.troops[type].available-=move;
    G.garrison[type]=(G.garrison[type]||0)+move;
  }else{
    const move=Math.min(Math.abs(delta),G.garrison[type]||0);
    if(move<=0)return;
    G.garrison[type]-=move;
    G.troops[type].available+=move;
  }
  renderAll();
  saveGame();
}

function canCaptureFrontier(farm){
  const state=getVillageState(farm.id);
  if(!isFrontierTarget(farm)||state.captured)return false;
  if((state.control||0)<(farm.controlNeed||100))return false;
  if(isStronghold(farm))return G.seasonWeek>=(farm.captureWeek||1);
  if(isOrcHorde(farm))return orcHordeUnlocked();
  return false;
}

function captureFrontier(farmId){
  const farm=G.npcFarms.find(f=>f.id===farmId);
  if(!farm||!isFrontierTarget(farm))return;
  const state=getVillageState(farmId);
  if(!canCaptureFrontier(farm)){
    if(isStronghold(farm)&&G.seasonWeek<(farm.captureWeek||1))showSnot(`Capture unlocks in week ${farm.captureWeek}`);
    else if(isOrcHorde(farm)&&!orcHordeUnlocked())showSnot('Hold and defend all strongholds three times first');
    else showSnot('Win more raids to establish control');
    return;
  }
  state.captured=true;
  state.defenseWins=state.defenseWins||0;
  addLog(`${farm.name} is captured and now must be held against the frontier.`,'important');
  showOverlay(`${farm.name}\nFrontier stronghold captured. Station troops to hold it.`,'success','Stronghold Captured');
  renderAll();
  saveGame();
}

function strongholdGarrisonPower(state){
  const g=state.garrison||{};
  return Object.entries(g).reduce((sum,[type,qty])=>sum+((TROOP_DEF[type]?.atk||0)*qty),0);
}

function adjustStrongholdGarrison(farmId,type,delta){
  const farm=G.npcFarms.find(f=>f.id===farmId);
  if(!farm||!isFrontierTarget(farm))return;
  const state=getVillageState(farmId);
  if(!state.captured){showSnot('Capture the frontier site first');return;}
  if(!state.garrison)state.garrison={infantry:0,archers:0,cavalry:0};
  if(delta>0){
    const move=Math.min(delta,G.troops[type]?.available||0);
    if(move<=0){showSnot(`No ${TROOP_DEF[type]?.name||type} available`);return;}
    G.troops[type].available-=move;
    state.garrison[type]+=move;
  }else{
    const move=Math.min(Math.abs(delta),state.garrison[type]||0);
    if(move<=0)return;
    state.garrison[type]-=move;
    G.troops[type].available+=move;
  }
  renderAll();
  saveGame();
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

function raidEfficiencyGrade({victory, lootRatio, injuryRate}){
  if(!victory)return 'F';
  const score=(lootRatio*100)-((injuryRate||0)*120);
  if(score>=92)return 'S';
  if(score>=78)return 'A';
  if(score>=62)return 'B';
  if(score>=45)return 'C';
  return 'D';
}

function addRaidReport(report){
  G.raidReports.unshift(report);
  G.raidReports=G.raidReports.slice(0,12);
}

function attackNPC(farmId,sent){
  const farm=G.npcFarms.find(f=>f.id===farmId);
  if(!farm||!canSeeFarm(farm)){showSnot('Target not available');return;}
  if(!farm.available){showSnot('Target not available');return;}
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
  const farmLoot=scaledFarmLoot(farm);

  if(victory){
    // Loot calculation
    const cap=calcLootCapacity(raid.sent);
    let lootTotal=Object.values(farmLoot).reduce((a,b)=>a+b,0);
    const lootRatio=Math.min(1,cap/lootTotal);
    const loot={};
    Object.entries(farmLoot).forEach(([res,amt])=>{
      loot[res]=Math.floor(amt*lootRatio);
      if(G.resources[res])G.resources[res].amount=Math.min(G.resources[res].max,G.resources[res].amount+loot[res]);
    });

    // NPC — troops injured not killed
    const injuryRate=Math.max(0,(farm.def/atkPow)*0.3)*(isManaBuffActive('ward')?0.75:1);
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
    addRaidReport({
      farmName:farm.name,
      icon:farm.icon,
      victory:true,
      lootTotal:Object.values(loot).reduce((a,b)=>a+b,0),
      cap,
      lootRatio,
      powerSent:atkPow,
      powerRequired:farm.def,
      injured:totalInjured,
      injuryRate,
      grade:raidEfficiencyGrade({victory:true,lootRatio,injuryRate}),
      time:`Yr.${G.year}`,
    });
    G.prestige+=10;
    addVillageControl(farm.id, isFrontierTarget(farm)?Math.max(25,30+(farm.level*8)):Math.max(20,35+(farm.level*5)));
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
    addRaidReport({
      farmName:farm.name,
      icon:farm.icon,
      victory:false,
      lootTotal:0,
      cap:calcLootCapacity(raid.sent),
      lootRatio:0,
      powerSent:atkPow,
      powerRequired:farm.def,
      injured:totalInjured,
      injuryRate:1,
      grade:'F',
      time:`Yr.${G.year}`,
    });
    if(totalInjured>0) recoverInjured(totalInjured);
  }

  G.combatLog=G.combatLog.slice(0,20);
  G.activeRaids=G.activeRaids.filter(r=>r.id!==raid.id);
  setBadge('combat',G.activeTab!=='combat');
  renderCombat();
}

// ==== HOSPITAL RECOVERY ====
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

function resolveFrontierPressure(){
  const captured=capturedStrongholds();
  if(captured.length){
    captured.forEach(farm=>{
      const state=getVillageState(farm.id);
      const defendPower=strongholdGarrisonPower(state);
      const attackPower=Math.floor(farm.def*(0.72+(state.defenseWins*0.08)));
      if(defendPower>=attackPower){
        state.defenseWins=Math.min(3,(state.defenseWins||0)+1);
        const attrition=Math.max(1,Math.floor(Object.values(state.garrison||{}).reduce((s,v)=>s+v,0)*0.08));
        let remaining=attrition;
        ['infantry','archers','cavalry'].forEach(type=>{
          const loss=Math.min(state.garrison[type]||0,remaining);
          state.garrison[type]-=loss;
          G.troops[type].injured+=loss;
          remaining-=loss;
        });
        addLog(`${farm.name} repelled an Orc assault. Defence count: ${state.defenseWins}/3.`,'important');
      }else{
        Object.entries(state.garrison||{}).forEach(([type,qty])=>{
          if(qty>0)G.troops[type].injured+=qty;
        });
        state.garrison={infantry:0,archers:0,cavalry:0};
        state.captured=false;
        state.control=Math.max(0,(farm.controlNeed||100)-40);
        addLog(`${farm.name} was overrun by frontier forces and falls back out of your control.`,'danger');
        showOverlay(`${farm.name}\nLost to an Orc counterattack.`, 'danger', 'Stronghold Lost');
      }
    });
  }
  if(captured.length>=2){
    const cityDef=currentWallDefence();
    const cityAtk=350+(captured.length*180);
    if(cityDef<cityAtk){
      const stolen={};
      ['gold','food','wood','stone','iron'].forEach(key=>{
        const loss=Math.floor((G.resources[key].amount||0)*0.08);
        if(loss>0){
          G.resources[key].amount=Math.max(0,G.resources[key].amount-loss);
          stolen[key]=loss;
        }
      });
      const lootText=Object.entries(stolen).map(([k,v])=>`${G.resources[k].icon}${v}`).join(' ');
      addLog(`Orc raiders struck Arnethia while the frontier was stretched thin. Lost ${lootText}.`,'danger');
      showOverlay(`Your city was raided.\nLost ${lootText||'supplies'}.`,'danger','City Raided');
    }else{
      addLog('Watchtowers spot an Orc raid, but the walls and garrison hold firm.','important');
    }
  }
}

// ==== RENDER COMBAT ====
function renderCombat(){
  const tab=document.getElementById('tab-combat');if(!tab)return;
  const scrollTop=tab.scrollTop;
  const sendValues={};
  tab.querySelectorAll('.send-input').forEach(input=>{ sendValues[input.id]=input.value; });
  const trainValues={};
  tab.querySelectorAll('[id^="train-qty-"]').forEach(input=>{ trainValues[input.id]=input.value; });
  const barracksLvl=blvl('barracks');
  const readyPower=calcReadyTroopPower();
  const heroArmyBonus=Math.round(totalAssignedHeroArmyBonus()*100);
  const manaBattle=!!isManaBuffActive('battle');
  const manaWard=!!isManaBuffActive('ward');

  if(barracksLvl===0){
    tab.innerHTML=`<div class="section"><div class="section-title">⚔ Combat</div>
      <div style="font-size:13px;color:var(--stone-light);font-style:italic;padding:8px 0">
        Let the realm gather strength first. When the Market and Iron Foundry are in place, raise the King's Barracks and call your first warband.
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
      <div class="train-entry">
        <input type="number" inputmode="numeric" pattern="[0-9]*" autocomplete="off" id="train-qty-${type}" min="1" max="999" value="10"
          style="width:50px;padding:4px;background:rgba(255,255,255,.04);border:1px solid rgba(201,168,76,.2);border-radius:3px;color:var(--parchment);font-size:11px;text-align:center;">
        <button class="train-btn train-max-btn" onclick="setTrainMax('${type}')" ${t.training>0?'disabled':''}>Max</button>
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
        `Capacity: ${150+hospitalLvl*150}`}</span>
    </div>
    ${G.hospital.recovering>0?
      `<div style="font-size:11px;color:var(--forest-light)">${G.hospital.recovering} troops recovering…
        ${Math.ceil((G.hospital.recoverEnd-G.tick)/60)}m remaining</div>
        <div class="raid-progress" style="margin-top:4px"><div class="raid-progress-inner" style="width:${Math.round(((G.tick-(G.hospital.recoverEnd-G.hospital.recovering*10))/(G.hospital.recovering*10))*100)}%;background:var(--forest-light)"></div></div>`
      :`<div style="font-size:11px;color:var(--stone-light);font-style:italic">${hospitalLvl===0?'Build a Hospital to recover injured troops faster.':'No troops recovering.'}</div>`
    }
  </div>`;

  const armyBonusHtml=`<div class="hospital-card" style="background:rgba(201,168,76,.05);border-color:rgba(201,168,76,.18)">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
      <span style="font-family:'Cinzel',serif;font-size:11px;color:var(--gold)">⚔ Army Command</span>
      <span style="font-size:10px;color:var(--stone-light)">${G.heroes.filter(h=>h.assignment==='army').length} hero${G.heroes.filter(h=>h.assignment==='army').length!==1?'es':''} assigned</span>
    </div>
    <div style="font-size:11px;color:var(--stone-light);line-height:1.5">
      Hero command bonus: <span style="color:var(--forest-light)">+${heroArmyBonus}% power</span>
      ${manaBattle?` · <span style="color:var(--gold)">Battle Hymn active (${manaBuffRemaining('battle')}m)</span>`:''}
      ${manaWard?` · <span style="color:var(--gold)">Ley Ward active (${manaBuffRemaining('ward')}m)</span>`:''}
    </div>
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

  const renderFarmCard=farm=>{
    const state=getVillageState(farm.id);
    const af=G.autoFarm[farm.id]||{enabled:false};
    const hasRaidHistory=G.combatLog.some(e=>e.msg.includes(farm.name)&&e.type==='victory');
    const activeRaid=G.activeRaids.find(r=>r.farmId===farm.id);
    const lootStr=Object.entries(scaledFarmLoot(farm)).map(([r,v])=>`${G.resources[r]?.icon||r}${v}`).join(' ');
    const minsToRespawn=farm.available?0:Math.ceil((farm.respawnAt-G.tick)/60);
    const canBeat=readyPower>=farm.def;
    const controlNeed=farm.controlNeed||100;
    const controlPct=Math.min(100,Math.round(((state.control||0)/controlNeed)*100));
    const canGovern=canGovernVillage(farm);
    const canCapture=canCaptureFrontier(farm);
    const isCapturedFrontier=isFrontierTarget(farm)&&state.captured;
    const garrison=state.garrison||{infantry:0,archers:0,cavalry:0};
    const garrisonText=Object.entries(garrison).filter(([,v])=>v>0).map(([k,v])=>`${TROOP_DEF[k]?.icon||k}${v}`).join(' ')||'No garrison';
    const autoControls=`<div class="autofarm-row">
          <div class="toggle-wrap">
            <div class="toggle ${af.enabled?'on':''}" onclick="toggleAutoFarm('${farm.id}')"></div>
            <span class="toggle-label">Auto-raid ${af.enabled?'ON ⚡':'OFF'}</span>
          </div>
          <button class="train-btn" onclick="disableAutoFarm('${farm.id}')" style="width:auto;padding-inline:10px">Stop Auto</button>
        </div>
        <div style="font-size:10px;color:var(--stone-light);margin-top:6px;font-style:italic">
          Auto raids only launch while the game is open and your available army can beat this target.
        </div>
        ${af.enabled&&activeRaid?`<div style="font-size:10px;color:var(--stone-light);margin-top:6px;font-style:italic">Auto-raid will stop after the current raid returns.</div>`:''}
        ${af.enabled&&!farm.available&&!activeRaid?`<div style="font-size:10px;color:var(--stone-light);margin-top:6px;font-style:italic">Auto-raid is armed and waiting for this target to reopen.</div>`:''}
        ${af.enabled&&farm.available&&!activeRaid&&!canBeat?`<div style="font-size:10px;color:var(--stone-light);margin-top:6px;font-style:italic">Waiting for enough available army power to beat ${farm.name}.</div>`:''}
        ${!hasRaidHistory&&!af.enabled&&!activeRaid?`<div style="font-size:10px;color:var(--stone-light);margin-top:6px;font-style:italic">Win one raid here to unlock auto-raids.</div>`:''}`;
    const frontierStatus=isStronghold(farm)
      ?(state.captured
        ?`Captured · Defence ${state.defenseWins||0}/3 · Garrison ${garrisonText}`
        :(G.seasonWeek<(farm.captureWeek||1)
          ?`${farm.name} unlocks in Week ${farm.captureWeek} · ${Math.max(1,(farm.captureWeek||1)-G.seasonWeek)} week${Math.max(1,(farm.captureWeek||1)-G.seasonWeek)!==1?'s':''} to prepare`
          :`Control ${Math.floor(state.control||0)}/${controlNeed} · Capture ready once control is filled`))
      :(isOrcHorde(farm)
        ?(state.captured
          ?'Orc Horde broken · Multiplayer transfer route secured'
          :(orcHordeUnlocked()
            ?`Horde exposed · Control ${Math.floor(state.control||0)}/${controlNeed}`
            :'Hold all strongholds and defend each 3 times to reveal the Horde'))
        :'');
const frontierButtons=isCapturedFrontier?`
        <div style="font-size:10px;color:var(--stone-light);margin-top:8px;font-style:italic">Garrison troops to hold this frontier site. If it falls, Orcs can push deeper into your lands.</div>
        <div class="garrison-grid">
          ${['infantry','archers','cavalry'].map(type=>`
            <div class="garrison-row">
              <span>${TROOP_DEF[type].icon} ${garrison[type]||0}</span>
              <div class="garrison-controls">
                <button class="train-btn" onclick="adjustStrongholdGarrison('${farm.id}','${type}',10)">+10</button>
                <button class="train-btn" onclick="adjustStrongholdGarrison('${farm.id}','${type}',-10)">-10</button>
              </div>
            </div>`).join('')}
        </div>`:'';
    const actionButtons=canGovern
      ?`<button class="attack-btn" style="margin-top:8px;background:rgba(74,122,50,.14);border-color:rgba(74,122,50,.35);color:var(--forest-light)" onclick="governVillage('${farm.id}')">Crown as Tributary</button>`
      :canCapture
        ?`<button class="attack-btn" style="margin-top:8px;background:rgba(74,122,50,.14);border-color:rgba(74,122,50,.35);color:var(--forest-light)" onclick="captureFrontier('${farm.id}')">${isOrcHorde(farm)?'Break the Orc Horde':'Capture Stronghold'}</button>`
        :((state.control||0)>=controlNeed&&governedVillageCount()>=currentAdminCap()&&!isFrontierTarget(farm))
          ?`<div style="font-size:10px;color:var(--blood-light);margin-top:8px;font-style:italic">Administration full (${governedVillageCount()}/${currentAdminCap()}). Raise Citadel or advance a dynasty.</div>`
          :'';
    return`<div class="npc-card ${isFrontierTarget(farm)?'frontier-target':'primary-target'} ${farm.available&&canBeat&&!state.governed&&!isCapturedFrontier?'can-raid':''}">
      <div class="npc-header">
        <span class="npc-name">${farm.icon} ${farm.name}</span>
        <span class="npc-level">Lv ${farm.level}</span>
      </div>
      <div class="npc-loot">Loot: ${lootStr}</div>
      <div style="font-size:10px;color:${state.governed||isCapturedFrontier?'var(--forest-light)':'var(--stone-light)'};margin-bottom:6px">
        ${state.governed?`Governed · ${villageFocusLabel(state.focus||'balanced')} focus · Passive tribute ${villageTributeString(farm,true)}`:(isFrontierTarget(farm)?frontierStatus:`Control ${Math.floor(state.control||0)}/${controlNeed} · ${state.victories||0} victories`)}
      </div>
      <div class="raid-progress" style="margin-bottom:6px"><div class="raid-progress-inner" style="width:${isCapturedFrontier?100:controlPct}%;background:${state.governed||isCapturedFrontier?'linear-gradient(90deg,var(--forest-light),var(--gold))':'linear-gradient(90deg,var(--blood-light),var(--gold))'}"></div></div>
      <div class="npc-power-row">
        <span>Required: ${farm.def}</span>
        <span class="${canBeat?'ok':'low'}">Available power: ${readyPower}</span>
      </div>
      ${state.governed?
        `<div style="font-size:11px;color:var(--forest-light);font-style:italic">Tributary secured. No further raids needed.</div>`:
        isCapturedFrontier?`${frontierButtons}`:
        !farm.available?
        `<div style="font-size:11px;color:var(--stone-light);font-style:italic">Respawns in ${minsToRespawn}m</div>
        ${isFrontierTarget(farm)?'':autoControls}`
        :`<div style="font-size:10px;color:var(--gold-dark);margin-bottom:6px;font-family:'Cinzel',serif">Send troops:</div>
        <div class="troop-send">
          ${Object.entries(TROOP_DEF).filter(([type])=>blvl('barracks')>=TROOP_DEF[type].reqBarracks&&type!=='siege').map(([type,def])=>`
            <div>
              <div class="send-label">${def.icon} ${def.name} (${G.troops[type].available})</div>
              <input type="number" inputmode="numeric" pattern="[0-9]*" autocomplete="off" class="send-input" id="send-${farm.id}-${type}" min="0" max="${G.troops[type].available}" value="0" placeholder="0">
            </div>`).join('')}
        </div>
        <button class="attack-btn" onclick="launchAttack('${farm.id}')">⚔ Attack</button>
        ${isFrontierTarget(farm)?'':autoControls}
        ${actionButtons}
        `}
    </div>`;
  };
  const visibleFarms=G.npcFarms.filter(canSeeFarm);
  const villageTargets=visibleFarms.filter(f=>!isFrontierTarget(f));
  const frontierTargets=visibleFarms.filter(isFrontierTarget);
  const revealHint=combatRevealHint();
  const npcHtml=villageTargets.map(renderFarmCard).join('');
  const frontierHtml=frontierTargets.length?`
    <div class="section section-subtle">
      <div class="section-title">🛡 Frontier</div>
      <div class="section-lead">These sites matter later in the season. They are kept quieter until your realm is ready to push outward.${weekUnlockLead()?` ${weekUnlockLead()}`:''}</div>
      <div class="npc-list">${frontierTargets.map(renderFarmCard).join('')}</div>
    </div>`:'';

  const raidReportHtml=G.raidReports.length?`
    <div class="section section-subtle">
      <div class="section-title">🏷 Raid Efficiency</div>
      <div class="combat-log">
        ${G.raidReports.map(r=>`<div class="report-card ${r.victory?'victory':'defeat'}">
          <div class="report-top"><span>${r.icon} ${r.farmName}</span><span class="report-grade">${r.grade}</span></div>
          <div class="report-meta">${r.time} · Power ${r.powerSent}/${r.powerRequired} · Loot ${r.lootTotal}/${r.cap||0} · Injured ${r.injured}</div>
          <div class="report-meta">${r.victory?`Fill ${Math.round((r.lootRatio||0)*100)}%`:'Repelled'}${r.victory?` · ${r.grade==='S'?'Perfect haul':r.grade==='A'?'Strong return':r.grade==='B'?'Solid return':r.grade==='C'?'Loose formation':'Wasteful raid'}`:''}</div>
        </div>`).join('')}
      </div>
    </div>`:'';

  const combatLogHtml=G.combatLog.length?`
    <div class="section section-subtle">
      <div class="section-title">📜 Battle Reports</div>
      <div class="combat-log">
        ${G.combatLog.map(e=>`<div class="clog-entry ${e.type||''}"><span style="font-size:9px;color:var(--gold-dark);font-family:'Cinzel',serif">${e.time}</span> ${e.msg}</div>`).join('')}
      </div>
    </div>`:'';

  tab.innerHTML=`
    <div class="section">
      <div class="section-title">⚔ Army</div>
      ${hospitalHtml}
      ${armyBonusHtml}
      <div class="troop-grid">${troopsHtml}</div>
    </div>
    ${activeRaidsHtml}
    <div class="section">
      <div class="section-title">🗺 Raiding Grounds</div>
      <div class="section-lead">Beyond the walls lie villages ripe for raiding. Repeated victories bend them toward your banner, until tribute begins to flow back to the crown.</div>
      ${revealHint?`<div class="combat-reveal-hint">${revealHint}</div>`:''}
      <div class="npc-list">${npcHtml}</div>
    </div>
    ${frontierHtml}
    ${raidReportHtml}
    ${combatLogHtml}`;
  Object.entries(sendValues).forEach(([id,val])=>{
    const input=document.getElementById(id);
    if(input&&document.activeElement?.id!==id)input.value=val;
  });
  Object.entries(trainValues).forEach(([id,val])=>{
    const input=document.getElementById(id);
    if(input&&document.activeElement?.id!==id)input.value=val;
  });
  tab.scrollTop=scrollTop;
}

function trainFromInput(type){
  const el=document.getElementById('train-qty-'+type);
  const qty=parseInt(el?.value,10);
  trainTroops(type,Number.isFinite(qty)?qty:1);
}

function setTrainMax(type){
  const el=document.getElementById('train-qty-'+type);
  if(!el)return;
  el.value=Math.min(999,maxTrainQty(type));
}

function setAutoFarmFloor(farmId,val){
  if(!G.autoFarm[farmId])G.autoFarm[farmId]={enabled:false};
  // Legacy no-op retained for save/UI compatibility with older builds.
  G.autoFarm[farmId].floor=parseInt(val);
}

function powerBreakdown(){
  const buildingPower=G.buildings.reduce((sum,b)=>sum+(b.level*90),0);
  const researchPower=Object.values(G.research).filter(r=>r.completed).length*180;
  const heroPower=G.heroes.reduce((sum,h)=>sum+(h.power*12),0);
  const readyTroopPower=Object.entries(G.troops).reduce((sum,[type,t])=>sum+((TROOP_DEF[type]?.atk||0)*(t.available||0)),0);
  const garrisonPower=cityGarrisonPower();
  const frontierPower=G.npcFarms.reduce((sum,farm)=>sum+strongholdGarrisonPower(getVillageState(farm.id)),0);
  const prestigePower=Math.floor(G.prestige*0.5);
  return {
    buildingPower,
    researchPower,
    heroPower,
    readyTroopPower,
    garrisonPower,
    frontierPower,
    prestigePower,
  };
}

function showPowerBreakdown(){
  const p=powerBreakdown();
  const total=Object.values(p).reduce((sum,val)=>sum+val,0);
  showOverlay(
    `Buildings: ${Math.floor(p.buildingPower)}\nResearch: ${Math.floor(p.researchPower)}\nHeroes: ${Math.floor(p.heroPower)}\nReady troops: ${Math.floor(p.readyTroopPower)}\nCity garrison: ${Math.floor(p.garrisonPower)}\nFrontier garrisons: ${Math.floor(p.frontierPower)}\nRenown weight: ${Math.floor(p.prestigePower)}\nTotal: ${Math.floor(total)}`,
    'success',
    'Power Breakdown'
  );
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

// ==== POWER LEVEL ====
function calcPower(){
  const p=powerBreakdown();
  return Math.floor(Object.values(p).reduce((sum,val)=>sum+val,0));
}

function renderPower(){
  const p=calcPower();
  const el=document.getElementById('power-val');
  if(el) el.textContent=p.toLocaleString();
}

// ==== FLOATING RESOURCE BAR ====
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

// ==== WAR CHEST ====
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

// ==== AUTO-FARM ====
function toggleAutoFarm(farmId){
  if(!G.autoFarm[farmId]) G.autoFarm[farmId]={enabled:false};
  G.autoFarm[farmId].enabled=!G.autoFarm[farmId].enabled;
  if(G.autoFarm[farmId].enabled) addLog(`Auto-raid enabled for ${G.npcFarms.find(f=>f.id===farmId)?.name}. It will only launch while the game is open and your available army can win.`);
  else addLog(`Auto-raid stopped for ${G.npcFarms.find(f=>f.id===farmId)?.name}.`);
  renderCombat();
}

function disableAutoFarm(farmId){
  if(!G.autoFarm[farmId]){
    G.autoFarm[farmId]={enabled:false};
  }
  const wasEnabled=!!G.autoFarm[farmId].enabled;
  G.autoFarm[farmId].enabled=false;
  if(wasEnabled)addLog(`Auto-raid stopped for ${G.npcFarms.find(f=>f.id===farmId)?.name}.`);
  renderCombat();
}

function checkAutoFarm(){
  if(!G.npcFarms) return;
  G.npcFarms.forEach(farm=>{
    const af=G.autoFarm[farm.id];
    if(!af?.enabled||!farm.available)return;
    if(getVillageState(farm.id).governed)return;
    if(G.activeRaids.find(r=>r.farmId===farm.id))return;
    if(calcReadyTroopPower()<farm.def)return;

    const raidPlan=planRaidTroops(farm);
    if(raidPlan.canBeat) attackNPC(farm.id,raidPlan.sent);
  });
}

// ==== DUAL RESEARCH QUEUE ====
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

// ==== HELPERS ====
function canAfford(costs){return Object.entries(costs).every(([r,a])=>G.resources[r]?.amount>=a);}
function spend(costs){Object.entries(costs).forEach(([r,a])=>{G.resources[r].amount-=a;});}
function blvl(id){return G.buildings.find(b=>b.id===id)?.level||0;}
function chkReq(bDef){if(!bDef.req)return true;return Object.entries(bDef.req).every(([id,l])=>blvl(id)>=l);}

// Temporary debug helper for diagnosing resource income mismatches on mobile.
function getResourceDebugSnapshot(){
  const resourceBuildingMap={
    gold:['market'],
    food:['farm'],
    wood:['lumber'],
    stone:['mine'],
    iron:['ironworks','mine'],
    mana:['tower']
  };
  const resourceResearchMap={
    gold:['trade_routes','banking','guild_ledgers','envoys'],
    food:['crop_rotation'],
    wood:[],
    stone:['stonemasons'],
    iron:[],
    mana:['runic_script','mana_reservoirs']
  };
  const resourceBuffMap={
    gold:['earlyBoost',isManaBuffActive('harvest')?'Harvest Blessing':null],
    food:['earlyBoost',isManaBuffActive('harvest')?'Harvest Blessing':null],
    wood:['earlyBoost',isManaBuffActive('harvest')?'Harvest Blessing':null],
    stone:['earlyBoost',isManaBuffActive('harvest')?'Harvest Blessing':null],
    iron:['earlyBoost',isManaBuffActive('harvest')?'Harvest Blessing':null,'Mine iron trickle'],
    mana:['earlyBoost',isManaBuffActive('harvest')?'Harvest Blessing':null]
  };
  const totalBuildingLevels=G.buildings.reduce((sum,b)=>sum+(b.level||0),0);
  const activeManaBuffs=MANA_ABILITIES.filter(a=>isManaBuffActive(a.id)).map(a=>`${a.name} (${manaBuffRemaining(a.id)}m)`);
  const tributeSummary=totalVillageTributePerMinute();
  const relevantResearchCompleted=[...new Set(Object.values(resourceResearchMap).flat())].filter(Boolean).filter(id=>hasResearch(id));
  const buildingSummaryIds=['farm','lumber','mine','market','ironworks','tower','granary','vault','timberyard','armoury','manawell'];
  const buildingSummary=buildingSummaryIds.map(id=>{
    const def=BD.find(b=>b.id===id);
    return {id,name:def?.name||id,level:blvl(id)};
  });
  const resources={};
  ['gold','food','wood','stone','iron','mana'].forEach(key=>{
    const buildingIds=resourceBuildingMap[key]||[];
    const buildingLevels=buildingIds.map(id=>{
      const def=BD.find(b=>b.id===id);
      return {
        id,
        name:def?.name||id,
        level:blvl(id),
        buildingBonus:BUILDING_RATE_BONUS[id]?.[key]||0
      };
    });
    const expectedBuildingContribution=buildingLevels.reduce((sum,entry)=>sum+(entry.level*entry.buildingBonus),0);
    resources[key]={
      amount:G.resources?.[key]?.amount ?? null,
      rate:G.resources?.[key]?.rate ?? null,
      effectiveRate:effectiveResourceRate(key),
      max:G.resources?.[key]?.max ?? null,
      capText:`${Math.floor(G.resources?.[key]?.amount||0)} / ${G.resources?.[key]?.max||0}`,
      buildingLevels,
      expectedBuildingContribution,
      relevantResearch:(resourceResearchMap[key]||[]).map(id=>({id,completed:hasResearch(id)})),
      activeModifiers:(resourceBuffMap[key]||[]).filter(Boolean),
      tributePerMinute:tributeSummary[key]||0
    };
  });
  return {
    appVersion:APP_VERSION,
    cacheVersion:CACHE_VERSION,
    earlyBoost:earlyBoost(),
    totalBuildingLevels,
    activeManaBuffs,
    relevantResearchCompleted,
    tributeSummary,
    buildingSummary,
    resources
  };
}

function debugStoneIncome(){
  const snapshot=getResourceDebugSnapshot();
  const stoneSnapshot={
    appVersion:snapshot.appVersion,
    cacheVersion:snapshot.cacheVersion,
    stoneAmount:snapshot.resources.stone.amount,
    stoneRate:snapshot.resources.stone.rate,
    effectiveStoneRate:snapshot.resources.stone.effectiveRate,
    earlyBoost:snapshot.earlyBoost,
    mineLevel:blvl('mine'),
    mineBuildingState:G.buildings.find(b=>b.id==='mine')||null,
    stoneQuarryDefinition:BD.find(b=>b.id==='mine')||null,
    mineRateBonus:BUILDING_RATE_BONUS.mine||null,
    stonemasonsCompleted:hasResearch('stonemasons'),
    totalBuildingLevels:snapshot.totalBuildingLevels
  };
  console.group('debugStoneIncome');
  console.log('Stone income snapshot',stoneSnapshot);
  console.groupEnd();
  return stoneSnapshot;
}
window.debugStoneIncome=debugStoneIncome;

function closeStoneDebugPanel(){
  document.getElementById('stone-debug-panel')?.remove();
}

function showStoneDebugPanel(){
  closeStoneDebugPanel();
  const data=getStoneDebugSnapshot();
  const mineSummary=data.mineBuildingState
    ? `id: ${data.mineBuildingState.id}\nlevel: ${data.mineBuildingState.level}`
    : 'No mine building entry found';
  const panel=document.createElement('div');
  panel.id='stone-debug-panel';
  panel.style.cssText=`position:fixed;inset:0;background:rgba(5,4,2,.82);z-index:1200;
    display:flex;align-items:flex-end;justify-content:center;padding:16px;`;
  panel.innerHTML=`
    <div style="width:min(100%,420px);max-height:min(78vh,680px);overflow:auto;
      background:linear-gradient(180deg,rgba(21,17,10,.98),rgba(12,9,5,.98));
      border:1px solid rgba(201,168,76,.28);border-radius:10px;
      box-shadow:0 18px 45px rgba(0,0,0,.55);padding:14px 14px 12px;color:var(--parchment)">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px">
        <div>
          <div style="font-family:'Cinzel',serif;font-size:13px;letter-spacing:1.1px;color:var(--gold)">Temporary Debug UI</div>
          <div style="font-size:11px;color:var(--stone-light);line-height:1.35">Stone income diagnostic for mobile testing</div>
        </div>
        <button onclick="closeStoneDebugPanel()" style="flex:0 0 auto;background:none;border:1px solid rgba(201,168,76,.22);
          border-radius:4px;color:var(--stone-light);padding:4px 8px;font-size:16px;line-height:1;cursor:pointer">✕</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
        <div style="background:rgba(201,168,76,.05);border:1px solid rgba(201,168,76,.12);border-radius:6px;padding:8px">
          <div style="font-size:10px;color:var(--stone-light);text-transform:uppercase;letter-spacing:1px">Version</div>
          <div style="font-size:12px;color:var(--gold);font-family:'Cinzel',serif">v${data.appVersion}</div>
        </div>
        <div style="background:rgba(201,168,76,.05);border:1px solid rgba(201,168,76,.12);border-radius:6px;padding:8px">
          <div style="font-size:10px;color:var(--stone-light);text-transform:uppercase;letter-spacing:1px">Cache</div>
          <div style="font-size:12px;color:var(--gold);font-family:'Cinzel',serif">${data.cacheVersion}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
        <div style="background:rgba(255,255,255,.03);border:1px solid rgba(201,168,76,.10);border-radius:6px;padding:8px">
          <div style="font-size:10px;color:var(--stone-light);text-transform:uppercase;letter-spacing:1px">Stone Amount</div>
          <div style="font-size:15px;color:var(--parchment);font-family:'Cinzel',serif">${Math.floor(data.stoneAmount||0)}</div>
        </div>
        <div style="background:rgba(255,255,255,.03);border:1px solid rgba(201,168,76,.10);border-radius:6px;padding:8px">
          <div style="font-size:10px;color:var(--stone-light);text-transform:uppercase;letter-spacing:1px">Stone Rate</div>
          <div style="font-size:15px;color:var(--parchment);font-family:'Cinzel',serif">${Number(data.stoneRate||0).toFixed(2)}/min</div>
        </div>
        <div style="background:rgba(255,255,255,.03);border:1px solid rgba(201,168,76,.10);border-radius:6px;padding:8px">
          <div style="font-size:10px;color:var(--stone-light);text-transform:uppercase;letter-spacing:1px">Effective Rate</div>
          <div style="font-size:15px;color:var(--parchment);font-family:'Cinzel',serif">${Number(data.effectiveStoneRate||0).toFixed(2)}/min</div>
        </div>
        <div style="background:rgba(255,255,255,.03);border:1px solid rgba(201,168,76,.10);border-radius:6px;padding:8px">
          <div style="font-size:10px;color:var(--stone-light);text-transform:uppercase;letter-spacing:1px">Early Boost</div>
          <div style="font-size:15px;color:var(--parchment);font-family:'Cinzel',serif">${Number(data.earlyBoost||0).toFixed(2)}x</div>
        </div>
      </div>
      <div style="background:rgba(255,255,255,.03);border:1px solid rgba(201,168,76,.10);border-radius:6px;padding:10px;margin-bottom:10px">
        <div style="font-size:10px;color:var(--stone-light);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Quarry Summary</div>
        <div style="font-size:12px;color:var(--parchment);line-height:1.45">blvl('mine'): <span style="color:var(--gold)">${data.mineLevel}</span></div>
        <div style="font-size:12px;color:var(--parchment);line-height:1.45">Total building levels: <span style="color:var(--gold)">${data.totalBuildingLevels}</span></div>
        <div style="font-size:12px;color:var(--parchment);line-height:1.45">Stonemasons complete: <span style="color:${data.stonemasonsCompleted?'var(--forest-light)':'var(--stone-light)'}">${data.stonemasonsCompleted}</span></div>
        <div style="font-size:12px;color:var(--parchment);line-height:1.45">Rate bonus table: <span style="color:var(--gold)">${JSON.stringify(data.mineRateBonus)}</span></div>
      </div>
      <div style="background:rgba(255,255,255,.03);border:1px solid rgba(201,168,76,.10);border-radius:6px;padding:10px;margin-bottom:10px">
        <div style="font-size:10px;color:var(--stone-light);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Mine Building Entry</div>
        <pre style="margin:0;white-space:pre-wrap;word-break:break-word;font:11px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace;color:var(--parchment)">${mineSummary}</pre>
      </div>
      <div style="background:rgba(255,255,255,.03);border:1px solid rgba(201,168,76,.10);border-radius:6px;padding:10px">
        <div style="font-size:10px;color:var(--stone-light);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Stone Quarry Definition</div>
        <pre style="margin:0;white-space:pre-wrap;word-break:break-word;font:11px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace;color:var(--parchment)">${JSON.stringify({
          id:data.stoneQuarryDefinition?.id||null,
          name:data.stoneQuarryDefinition?.name||null,
          max:data.stoneQuarryDefinition?.max||null,
          req:data.stoneQuarryDefinition?.req||null,
          costLevel1:data.stoneQuarryDefinition?.cost?data.stoneQuarryDefinition.cost(1):null,
          effectAtMineLevel:data.stoneQuarryDefinition?.eff?data.stoneQuarryDefinition.eff(data.mineLevel||0):null
        },null,2)}</pre>
      </div>
    </div>`;
  panel.addEventListener('click',e=>{ if(e.target===panel)closeStoneDebugPanel(); });
  document.body.appendChild(panel);
}
window.showStoneDebugPanel=showStoneDebugPanel;
window.closeStoneDebugPanel=closeStoneDebugPanel;

function getResourceDebugSnapshot(){
  const resourceBuildingMap={
    gold:['market'],
    food:['farm'],
    wood:['lumber'],
    stone:['mine'],
    iron:['ironworks','mine'],
    mana:['tower']
  };
  const resourceResearchMap={
    gold:['trade_routes','banking','guild_ledgers','envoys'],
    food:['crop_rotation'],
    wood:[],
    stone:['stonemasons'],
    iron:[],
    mana:['runic_script','mana_reservoirs']
  };
  const resourceBuffMap={
    gold:['earlyBoost',isManaBuffActive('harvest')?'Harvest Blessing':null],
    food:['earlyBoost',isManaBuffActive('harvest')?'Harvest Blessing':null],
    wood:['earlyBoost',isManaBuffActive('harvest')?'Harvest Blessing':null],
    stone:['earlyBoost',isManaBuffActive('harvest')?'Harvest Blessing':null],
    iron:['earlyBoost',isManaBuffActive('harvest')?'Harvest Blessing':null,'Mine iron trickle'],
    mana:['earlyBoost',isManaBuffActive('harvest')?'Harvest Blessing':null]
  };
  const totalBuildingLevels=G.buildings.reduce((sum,b)=>sum+(b.level||0),0);
  const activeManaBuffs=MANA_ABILITIES.filter(a=>isManaBuffActive(a.id)).map(a=>`${a.name} (${manaBuffRemaining(a.id)}m)`);
  const tributeSummary=totalVillageTributePerMinute();
  const relevantResearchCompleted=[...new Set(Object.values(resourceResearchMap).flat())].filter(Boolean).filter(id=>hasResearch(id));
  const buildingSummaryIds=['farm','lumber','mine','market','ironworks','tower','granary','vault','timberyard','armoury','manawell'];
  const buildingSummary=buildingSummaryIds.map(id=>{
    const def=BD.find(b=>b.id===id);
    return {id,name:def?.name||id,level:blvl(id)};
  });
  const resources={};
  ['gold','food','wood','stone','iron','mana'].forEach(key=>{
    const buildingIds=resourceBuildingMap[key]||[];
    const buildingLevels=buildingIds.map(id=>{
      const def=BD.find(b=>b.id===id);
      return {id,name:def?.name||id,level:blvl(id),buildingBonus:BUILDING_RATE_BONUS[id]?.[key]||0};
    });
    const expectedBuildingContribution=buildingLevels.reduce((sum,entry)=>sum+(entry.level*entry.buildingBonus),0);
    resources[key]={
      amount:G.resources?.[key]?.amount ?? null,
      rate:G.resources?.[key]?.rate ?? null,
      effectiveRate:effectiveResourceRate(key),
      max:G.resources?.[key]?.max ?? null,
      capText:`${Math.floor(G.resources?.[key]?.amount||0)} / ${G.resources?.[key]?.max||0}`,
      buildingLevels,
      expectedBuildingContribution,
      relevantResearch:(resourceResearchMap[key]||[]).map(id=>({id,completed:hasResearch(id)})),
      activeModifiers:(resourceBuffMap[key]||[]).filter(Boolean),
      tributePerMinute:tributeSummary[key]||0
    };
  });
  return {
    appVersion:APP_VERSION,
    cacheVersion:CACHE_VERSION,
    earlyBoost:earlyBoost(),
    totalBuildingLevels,
    activeManaBuffs,
    relevantResearchCompleted,
    tributeSummary,
    buildingSummary,
    resources
  };
}

function closeResourceDebugPanel(){
  document.getElementById('resource-debug-panel')?.remove();
}

function resourceDebugResearchText(entries){
  const done=entries.filter(r=>r.completed).map(r=>r.id);
  return done.length?done.join(', '):'none';
}

function showResourceDebugPanel(){
  closeResourceDebugPanel();
  const data=getResourceDebugSnapshot();
  const resourceRows=['gold','food','wood','stone','iron','mana'].map(key=>{
    const r=data.resources[key];
    const buildingText=r.buildingLevels.length
      ? r.buildingLevels.map(entry=>`${entry.name} Lv${entry.level}`).join(', ')
      : 'none';
    const modifierText=[
      ...r.activeModifiers,
      r.tributePerMinute>0?`Tribute +${r.tributePerMinute.toFixed(2)}/min`:null
    ].filter(Boolean).join(', ')||'none';
    return `
      <tr>
        <td style="padding:8px 6px;vertical-align:top;color:var(--gold);font-family:'Cinzel',serif;text-transform:capitalize">${key}</td>
        <td style="padding:8px 6px;vertical-align:top">${Math.floor(r.amount||0)}</td>
        <td style="padding:8px 6px;vertical-align:top">${Number(r.rate||0).toFixed(2)}</td>
        <td style="padding:8px 6px;vertical-align:top">${Number(r.effectiveRate||0).toFixed(2)}</td>
        <td style="padding:8px 6px;vertical-align:top">${r.capText}</td>
        <td style="padding:8px 6px;vertical-align:top">${buildingText}</td>
        <td style="padding:8px 6px;vertical-align:top">+${Number(r.expectedBuildingContribution||0).toFixed(2)}/min</td>
        <td style="padding:8px 6px;vertical-align:top">research: ${resourceDebugResearchText(r.relevantResearch)}<br>mods: ${modifierText}</td>
      </tr>`;
  }).join('');
  const panel=document.createElement('div');
  panel.id='resource-debug-panel';
  panel.style.cssText=`position:fixed;inset:0;background:rgba(5,4,2,.84);z-index:1200;
    display:flex;align-items:flex-end;justify-content:center;padding:14px 14px calc(env(safe-area-inset-bottom) + 64px);`;
  panel.innerHTML=`
    <div style="position:relative;width:min(100%,760px);max-height:min(80vh,760px);overflow-y:auto;overflow-x:hidden;
      -webkit-overflow-scrolling:touch;background:linear-gradient(180deg,rgba(21,17,10,.985),rgba(12,9,5,.985));
      border:1px solid rgba(201,168,76,.28);border-radius:10px;box-shadow:0 18px 45px rgba(0,0,0,.55);
      padding:14px 14px 16px;color:var(--parchment)">
      <div style="position:sticky;top:0;z-index:1;background:linear-gradient(180deg,rgba(21,17,10,.99),rgba(21,17,10,.92));
        padding-bottom:10px;margin-bottom:10px;border-bottom:1px solid rgba(201,168,76,.12)">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px">
          <div>
            <div style="font-family:'Cinzel',serif;font-size:13px;letter-spacing:1.1px;color:var(--gold)">Temporary Debug UI</div>
            <div style="font-size:11px;color:var(--stone-light);line-height:1.35">Resource income diagnostic for mobile testing</div>
          </div>
          <button onclick="closeResourceDebugPanel()" style="flex:0 0 auto;background:none;border:1px solid rgba(201,168,76,.22);
            border-radius:4px;color:var(--stone-light);padding:4px 8px;font-size:16px;line-height:1;cursor:pointer">✕</button>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:10px">
        <div style="background:rgba(201,168,76,.05);border:1px solid rgba(201,168,76,.12);border-radius:6px;padding:8px">
          <div style="font-size:10px;color:var(--stone-light);text-transform:uppercase;letter-spacing:1px">Version</div>
          <div style="font-size:12px;color:var(--gold);font-family:'Cinzel',serif">v${data.appVersion}</div>
        </div>
        <div style="background:rgba(201,168,76,.05);border:1px solid rgba(201,168,76,.12);border-radius:6px;padding:8px">
          <div style="font-size:10px;color:var(--stone-light);text-transform:uppercase;letter-spacing:1px">Cache</div>
          <div style="font-size:12px;color:var(--gold);font-family:'Cinzel',serif">${data.cacheVersion}</div>
        </div>
        <div style="background:rgba(255,255,255,.03);border:1px solid rgba(201,168,76,.10);border-radius:6px;padding:8px">
          <div style="font-size:10px;color:var(--stone-light);text-transform:uppercase;letter-spacing:1px">Early Boost</div>
          <div style="font-size:15px;color:var(--parchment);font-family:'Cinzel',serif">${Number(data.earlyBoost||0).toFixed(2)}x</div>
        </div>
        <div style="background:rgba(255,255,255,.03);border:1px solid rgba(201,168,76,.10);border-radius:6px;padding:8px">
          <div style="font-size:10px;color:var(--stone-light);text-transform:uppercase;letter-spacing:1px">Total Building Levels</div>
          <div style="font-size:15px;color:var(--parchment);font-family:'Cinzel',serif">${data.totalBuildingLevels}</div>
        </div>
      </div>
      <div style="background:rgba(255,255,255,.03);border:1px solid rgba(201,168,76,.10);border-radius:6px;padding:10px;margin-bottom:10px">
        <div style="font-size:10px;color:var(--stone-light);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Global Modifiers</div>
        <div style="font-size:12px;line-height:1.5;color:var(--parchment)">Active mana buffs: ${data.activeManaBuffs.length?data.activeManaBuffs.join(', '):'none'}</div>
        <div style="font-size:12px;line-height:1.5;color:var(--parchment)">Relevant research complete: ${data.relevantResearchCompleted.length?data.relevantResearchCompleted.join(', '):'none'}</div>
        <div style="font-size:12px;line-height:1.5;color:var(--parchment)">Village tribute per minute: ${Object.keys(data.tributeSummary).length?tributeRateString(data.tributeSummary):'none'}</div>
      </div>
      <div style="background:rgba(255,255,255,.03);border:1px solid rgba(201,168,76,.10);border-radius:6px;padding:10px;margin-bottom:10px">
        <div style="font-size:10px;color:var(--stone-light);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Building Summary</div>
        <pre style="margin:0;white-space:pre-wrap;word-break:break-word;font:11px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace;color:var(--parchment)">${data.buildingSummary.map(entry=>`${entry.name}: Lv${entry.level}`).join('\n')}</pre>
      </div>
      <div style="background:rgba(255,255,255,.03);border:1px solid rgba(201,168,76,.10);border-radius:6px;padding:10px">
        <div style="font-size:10px;color:var(--stone-light);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Resource Table</div>
        <div style="overflow-x:auto;-webkit-overflow-scrolling:touch">
          <table style="width:100%;min-width:760px;border-collapse:collapse;font-size:11px;line-height:1.4">
            <thead>
              <tr style="text-align:left;color:var(--stone-light);border-bottom:1px solid rgba(201,168,76,.12)">
                <th style="padding:6px">Resource</th>
                <th style="padding:6px">Amount</th>
                <th style="padding:6px">Base Rate</th>
                <th style="padding:6px">Effective</th>
                <th style="padding:6px">Cap</th>
                <th style="padding:6px">Buildings</th>
                <th style="padding:6px">Building Bonus</th>
                <th style="padding:6px">Research / Buffs</th>
              </tr>
            </thead>
            <tbody>${resourceRows}</tbody>
          </table>
        </div>
      </div>
    </div>`;
  panel.addEventListener('click',e=>{ if(e.target===panel)closeResourceDebugPanel(); });
  document.body.appendChild(panel);
}
window.showResourceDebugPanel=showResourceDebugPanel;
window.closeResourceDebugPanel=closeResourceDebugPanel;

// ==== INIT ====
function init(){
  const pendingLocalReset=consumePendingLocalReset();
  BD.forEach(b=>G.buildings.push({id:b.id,level:0}));
  allR().forEach(r=>{ G.research[r.id]={completed:false}; });
  G.mapTiles=MAP_DEF.map(t=>({...t}));
  initCombat();
  normalizeDerivedBuildingState();
  addLog('Your kingdom of Arnethia rises from humble beginnings.','important');
  addLog('Raise storehouses, mills, and quarries first. Let the realm gather strength before you call the banners to war.');

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
  if(pendingLocalReset){
    // A local reset was requested on the previous page instance. Purge again
    // defensively and skip load sources so the next kingdom always starts fresh.
    clearPersistedLocalSaveData();
    G._tickAtLastLoad=G.tick;
    _offlineReady=true;
    renderAll();
    return;
  }
  cloudLoad().then(loaded=>{
    if(!loaded){
      loadGame();
      G._tickAtLastLoad=G.tick;
    }
    applyOfflineProgress().then(()=>{
      _offlineReady=true;
      renderAll();
      if(G.seasonComplete){
        const path=VICTORY_PATHS[G.victoryPath];
        const finalPrestige=Math.floor(G.prestige*(1+(G.victoryBonus/100)));
        showSeasonEndScreen(finalPrestige, path);
      }
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

// ==== TICK ====
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
  const harvestBoost=isManaBuffActive('harvest')?1.5:1;
  const boost=earlyBoost()*(rally?2:1)*harvestBoost;
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
    applyVillageTribute(1);
  }
  // Secondary iron from quarry — 0.2/min per mine level
  const mineLvl=blvl('mine');
  if(mineLvl>0&&G.tick%60===0) G.resources.iron.amount=Math.min(G.resources.iron.max, G.resources.iron.amount+(mineLvl*0.1));
  if(G.tick%480===0)resolveFrontierPressure();
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

// ==== TABS ====
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

// ==== BADGES ====
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

// ==== BUILD ====
function buildBuilding(id){
  const bDef=BD.find(b=>b.id===id);
  const bState=G.buildings.find(b=>b.id===id);
  if(!bDef||!bState)return;
  if(bState.level>=bDef.max)return;
  if(!chkReq(bDef)){showSnot(`Requires: ${buildingRequirementText(bDef)}`);return;}
  const nl=bState.level+1;
  let costs=bDef.cost(nl);
  if(G.costReduction)costs=Object.fromEntries(Object.entries(costs).map(([k,v])=>[k,Math.floor(v*G.costReduction)]));
  if(!canAfford(costs)){showSnot('Insufficient resources');return;}
  spend(costs);bState.level=nl;bDef.onBuild(nl);G.prestige+=10*nl;G.cityDirty=true;
  if(bDef.unlocks)bDef.unlocks.forEach(uid=>revealB(uid));
  normalizeDerivedBuildingState();
  addLog(`${bDef.name} upgraded to level ${nl}. ${bDef.eff(nl)}.`,'important');
  const mt=G.mapTiles.find(t=>t.id===id);if(mt)mt.built=true;
  showOverlay(`${bDef.icon} ${bDef.name} — Level ${nl}\n${bDef.eff(nl)}`,'success','Constructed');
  renderAll();
}

// ==== RESEARCH ====
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
  normalizeDerivedBuildingState();
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
  normalizeDerivedBuildingState();
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

// ==== HEROES ====
function spawnHero(){
  const used=G.heroes.map(h=>h.name);
  const avail=HERO_NAMES.filter(n=>!used.includes(n));
  if(!avail.length)return;
  const name=avail[0],cls=HERO_CLS[G.heroes.length%HERO_CLS.length];
  G.heroes.push({name,cls,level:1,xp:0,xpGoal:100,power:5+G.heroes.length*2,hp:100,maxHp:100,onQuest:false,qt:0,qname:'',qDef:null,_ret:false,autoQuest:false,assignment:''});
  addLog(`${name} the ${cls} joins your banner!`,'important');
  showOverlay(`${name} the ${cls} is ready.`,'success','Hero Arrived');
  setBadge('heroes',G.activeTab!=='heroes');
}
function sendOnQuest(i){
  const h=G.heroes[i];if(!h||h.onQuest)return;
  if(h.assignment==='army'){showSnot('Withdraw this hero from the army first');return;}
  if(h.assignment==='city'){showSnot('Withdraw this hero from city defence first');return;}
  const avail=QUESTS.filter(q=>h.power>=q.minP);
  if(!avail.length){showSnot('Hero too weak for available quests');return;}
  const q=avail[Math.floor(Math.random()*avail.length)];
  let t=q.t;if(G.questTimeMulti)t=Math.round(t*G.questTimeMulti);
  h.onQuest=true;h.qt=t;h.qname=q.name;h.qDef=q;h._ret=false;
  addLog(`${h.name} departs for: ${q.name}. Reward: ${questRewardText(q)}. ~${Math.round(t/60)} min.`);
  renderHeroes();
}

function sendHeroOnBestQuest(h){
  if(!h||h.onQuest||h.level>=HERO_LEVEL_CAP||h.assignment==='army'||h.assignment==='city')return false;
  const avail=QUESTS.filter(q=>h.power>=q.minP);
  if(!avail.length)return false;
  const q=avail[avail.length-1];
  let t=q.t;if(G.questTimeMulti)t=Math.round(t*G.questTimeMulti);
  h.onQuest=true;h.qt=t;h.qname=q.name;h.qDef=q;h._ret=false;
  addLog(`${h.name} automatically departs for: ${q.name}. Reward: ${questRewardText(q)}. ~${Math.round(t/60)} min.`);
  return true;
}

function toggleHeroAutoQuest(i){
  const h=G.heroes[i];
  if(!h)return;
  if(h.assignment==='army'||h.assignment==='city'){
    showSnot('Withdraw this hero from command duty to auto-quest');
    return;
  }
  h.autoQuest=!h.autoQuest;
  if(h.autoQuest&&h.level>=HERO_LEVEL_CAP){
    h.autoQuest=false;
    showSnot(`${h.name} has reached the hero level cap`);
    return;
  }
  addLog(`${h.name} auto-quest ${h.autoQuest?'enabled':'disabled'}.`);
  if(h.autoQuest&&!h.onQuest) sendHeroOnBestQuest(h);
  renderHeroes();
}

function questRewardText(q){
  return `${Object.entries(q.rew).map(([res,amt])=>`${G.resources[res]?.icon||res}${amt}`).join(' ')} · XP ${q.xp}`;
}

function completeQuest(h){
  const q=h.qDef;
  const maxHp=h.maxHp||100;
  let returnedWounded=false;
  if(Math.random()<q.danger&&!G.wardProtect){
    h.hp=Math.max(1,h.hp-30);
    returnedWounded=true;
    addLog(`⚠ ${h.name} returns wounded!`,'danger');
    showOverlay(`${h.name} returns wounded from ${q.name}.`,'danger','Hero Injured');
  } else if(Math.random()<q.danger&&G.wardProtect){
    addLog(`🛡 Wards of Protection saved ${h.name}!`);
  }
  Object.entries(q.rew).forEach(([res,amt])=>{if(G.resources[res])G.resources[res].amount=Math.min(G.resources[res].max,G.resources[res].amount+amt);});
  const rewardText=questRewardText(q);
  h.xp+=q.xp;
  if(h.xp>=h.xpGoal&&h.level<HERO_LEVEL_CAP){
    h.level++;h.xp-=h.xpGoal;h.xpGoal=Math.round(h.xpGoal*1.5);h.power=Math.round(h.power*1.15);
    addLog(`${h.name} reached level ${h.level}! Power: ${h.power}`,'important');
    showOverlay(`${h.name} reached Level ${h.level}!\nPower now: ${h.power}`,'success','Level Up!');
  }else if(h.level>=HERO_LEVEL_CAP){
    h.xp=Math.min(h.xp,h.xpGoal);
  }
  if(returnedWounded){
    const healAmount=maxHp-h.hp;
    h.hp=maxHp;
    if(healAmount>0)addLog(`${h.name} recovers back to full strength in the keep.`,'important');
  }
  h.onQuest=false;h.qt=0;h.qname='';h._ret=true;
  G.prestige+=15;
  addLog(`${h.name} returns from ${q.name}. Rewards: ${rewardText}.`);
  showOverlay(`${rewardText}\n+15 renown`,'success','Quest Rewards');
  setBadge('heroes',G.activeTab!=='heroes');
  if(h.level>=HERO_LEVEL_CAP&&h.autoQuest){
    h.autoQuest=false;
    addLog(`${h.name} reached the hero level cap and stops auto-questing.`,'important');
  }else if(h.autoQuest){
    sendHeroOnBestQuest(h);
  }
  renderAll();
}

// ==== LOG ====
function addLog(msg,type){
  G.log.unshift({msg,type,time:`Yr.${G.year}`});
  if(G.log.length>40)G.log.pop();
  G.logDirty=true;
}

// ==== OVERLAYS ====
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

// ==== RENDER ====
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
  const tribute=totalVillageTributePerMinute();
  const tributeText=Object.keys(tribute).length?Object.entries(tribute).map(([k,v])=>`${G.resources[k]?.icon||k}${v.toFixed(1)}/m`).join(' '):'No tributaries yet';
  const goalText=governedVillageCount()===0
    ? 'First long-term goal: strengthen the realm, win your first raids, and bring a nearby village beneath your banner as a tributary.'
    : `Realm goal: hold ${governedVillageCount()}/${currentAdminCap()} governed villages and keep tribute flowing.`;
  const rows=[
    boost>1?`<div class="boost-row boost-row-strong">⚡ Early Kingdom Bonus: ${boost.toFixed(1)}x income active</div>`:'',
    governedVillageCount()>0?`<div class="boost-row boost-row-realm">👑 Realm: ${governedVillageCount()}/${currentAdminCap()} villages governed · Tribute ${tributeText}</div>`:'',
    `<div class="boost-row boost-row-hint">${goalText}</div>`
  ].filter(Boolean).join('');
  el.innerHTML=rows+
    Object.entries(G.resources).map(([k,r])=>{
      const pct=Math.min(100,Math.round((r.amount/r.max)*100));
      const capColor=pct>=95?'var(--blood-light)':pct>=75?'#e8a020':'var(--forest-light)';
      const nearCap=pct>=95;
      const gain=effectiveResourceRate(k);
      const capText=resourceCapText(k,r);
      return`<div class="rc ${nearCap?'near-cap':''}" data-resource-card="${k}" role="button" tabindex="0" onclick="showResourceStorageTimes()" ontouchend="showResourceStorageTimes()" title="Storage time" style="${nearCap?'border-color:rgba(192,57,43,.4);':''}">
        <div class="rc-top">
          <div class="rc-ident"><div class="rc-icon">${r.icon}</div><div class="rc-name">${r.name}</div></div>
          <div class="rc-amount" onclick="showResourceStorageTimes()" ontouchend="showResourceStorageTimes()">${Math.floor(r.amount)}</div>
        </div>
        <div class="rc-meta">
          <span class="rc-pill rc-rate ${gain<0?'neg':''}" onclick="showResourceStorageTimes()" ontouchend="showResourceStorageTimes()">${gain>0?'+':''}${gain.toFixed(1)}/min</span>
          <span class="rc-pill rc-stock">${Math.floor(r.amount)}/${r.max}</span>
        </div>
        <div class="rc-captext">${capText}</div>
        <div class="rc-capbar"><div class="rc-capfill" style="width:${pct}%;background:${capColor}"></div></div>
        ${nearCap?`<div class="rc-warning">⚠ Near full</div>`:''}
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
  const harvestBoost=isManaBuffActive('harvest')?1.5:1;
  let gain=(r.rate||0)*earlyBoost()*(rally?2:1)*harvestBoost;
  if(key==='iron')gain+=blvl('mine')*0.1;
  gain+=totalVillageTributePerMinute()[key]||0;
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

function buildingRequirementHtml(bDef){
  if(!bDef.req)return '';
  const parts=Object.entries(bDef.req).map(([id,level])=>{
    const cur=blvl(id);
    const met=cur>=level;
    const name=BD.find(b=>b.id===id)?.name||id;
    return `<span style="color:${met?'var(--forest-light)':'var(--blood-light)'}">${name} ${cur}/${level}</span>`;
  });
  return `<div style="font-size:11px;color:var(--stone-light);font-style:italic;margin-bottom:4px">Requires: ${parts.join(' · ')}</div>`;
}

function buildingRequirementText(bDef){
  if(!bDef.req)return '';
  return Object.entries(bDef.req).map(([id,level])=>{
    const cur=blvl(id);
    const name=BD.find(b=>b.id===id)?.name||id;
    return `${name} ${cur}/${level}`;
  }).join(', ');
}

function hasBuiltParentForBuilding(id){
  return BD.some(b=>b.unlocks?.includes(id)&&blvl(b.id)>=1);
}

function isBuildingVisible(bDef){
  return bviz(bDef.id)||blvl(bDef.id)>0||chkReq(bDef)||hasBuiltParentForBuilding(bDef.id);
}

function renderBuildings(){
  const el=document.getElementById('building-list');if(!el)return;
  let html=`<div class="build-toolbar">
    <button class="bbtn" onclick="toggleLockedBuildings()" style="width:auto;padding-inline:10px">
      ${G.showLockedBuildings?'Hide Locked Buildings':'Show Locked Buildings'}
    </button>
    <button class="bbtn" onclick="toggleMaxedBuildings()" style="width:auto;padding-inline:10px">
      ${G.showMaxedBuildings?'Hide Maxed':'Show Maxed'}
    </button>
  </div>`;
  BD.forEach(bDef=>{
    const vis=isBuildingVisible(bDef);
    const lvl=blvl(bDef.id);
    const maxed=lvl>=bDef.max;
    if(maxed&&!G.showMaxedBuildings)return;
    if(!vis){
      if(G.showLockedBuildings){
        html+=`<div class="bcard" style="opacity:.6">
          <div class="bheader"><span class="bname">${bDef.icon} ${bDef.name}</span><span class="blvl">Locked</span></div>
          <div class="bdesc">${bDef.desc}</div>
          ${buildingRequirementHtml(bDef)||'<div style="font-size:11px;color:var(--stone-light);font-style:italic;margin-bottom:4px">Progress further to reveal this structure.</div>'}
        </div>`;
        return;
      }
      // show mystery if parent built
      const parentBuilt=hasBuiltParentForBuilding(bDef.id);
      if(!parentBuilt)return;
      html+=`<div class="mystery"><div class="mystery-icon">🔒</div>
        <div><div class="mystery-title">??? Unknown Structure</div>
        <div class="mystery-hint">Develop your kingdom further to reveal…</div></div></div>`;
      return;
    }
    const bState=G.buildings.find(b=>b.id===bDef.id);
    const nl=(bState?.level||0)+1,req=chkReq(bDef);
    let costs=bDef.cost(nl);
    if(G.costReduction&&!maxed)costs=Object.fromEntries(Object.entries(costs).map(([k,v])=>[k,Math.floor(v*G.costReduction)]));
    const aff=!maxed&&canAfford(costs)&&req;
    const cHtml=maxed?'<span style="font-size:11px;color:var(--gold-dark)">Maximum level</span>':
      Object.entries(costs).map(([r,a])=>`<span class="bcost ${G.resources[r]?.amount>=a?'':'no'}">${G.resources[r]?.icon||r} ${a}</span>`).join('');
    html+=`<div class="bcard ${aff?'can':''} ${maxed?'maxed':''}">
      <div class="bheader"><span class="bname">${bDef.icon} ${bDef.name}</span><span class="blvl">Lv ${lvl}/${bDef.max}</span></div>
      <div class="bdesc">${bDef.desc}</div>
      ${lvl>0?`<div class="beff">${bDef.eff(lvl)}</div>`:''}
      ${!req?buildingRequirementHtml(bDef):''}
      <div class="bcosts">${cHtml}</div>
      ${!maxed?`<button class="bbtn" onclick="buildBuilding('${bDef.id}')" ${aff?'':'disabled'}>${lvl===0?'Construct':'Upgrade'} — Level ${nl}</button>`:''}
    </div>`;
  });
  el.innerHTML=html;
}

function toggleLockedBuildings(){
  G.showLockedBuildings=!G.showLockedBuildings;
  renderBuildings();
  saveGame();
}

function toggleMaxedBuildings(){
  G.showMaxedBuildings=!G.showMaxedBuildings;
  renderBuildings();
  saveGame();
}

// ==== ISOMETRIC CITY VIEW ====
let _popupBuildingId=null;

function renderMap(){
  const el=document.getElementById('city-map');if(!el)return;

  // Build tap zones over the composite image
  const zones=CITY_ZONES.map(z=>{
    const lvl=blvl(z.id);
    const bDef=BD.find(x=>x.id===z.id);if(!bDef)return'';
    const revealed=isBuildingVisible(bDef);
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

// ==== BUILDING POPUP ====
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
    :`Next level: ${costStr}${!reqMet?`<div style="margin-top:6px">${buildingRequirementHtml(bDef)}</div>`:''}`;

  const btn=document.getElementById('bp-btn');
  if(maxed){btn.textContent='Maxed Out';btn.disabled=true;}
  else if(!reqMet){btn.textContent=`Needs: ${buildingRequirementText(bDef)}`;btn.disabled=true;}
  else if(!affordable){btn.textContent='Need more resources';btn.disabled=true;}
  else{btn.textContent=`${lvl===0?'âš’ Construct':'âš’ Upgrade'} — Level ${nextLvl}`;btn.disabled=false;}

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
      ${locked?`<div style="font-size:11px;color:var(--blood-light);font-style:italic">Requires: ${allR().find(x=>x.id===rDef.req)?.name||rDef.req}</div>`:''}
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
    const inArmy=h.assignment==='army';
    const inCity=h.assignment==='city';
    const armyBonus=Math.round(heroArmyBonusFor(h)*100);
    const cityBonus=heroCityDefenseBonusFor(h);
    let status='Resting in the keep',sc='';
    if(h.onQuest){const m=Math.ceil(h.qt/60);status=`On quest: ${h.qname} (~${m}m)`;sc='onq';}
    else if(inArmy){status=`Assigned to the field army (+${armyBonus}% army power)`;sc='ret';}
    else if(inCity){status=`Assigned to city defence (+${cityBonus} wall defence)`;sc='ret';}
    else if(h.level>=HERO_LEVEL_CAP){status=`At level cap (${HERO_LEVEL_CAP})`;sc='ret';}
    return`<div class="hcard">
      <div class="hname">Hero: ${h.name}</div>
      <div class="hclass">${h.cls} - Level ${h.level}/${HERO_LEVEL_CAP}</div>
      <div class="hstats">
        <div class="hstat"><div class="hstat-v">${h.power}</div><div class="hstat-l">Power</div></div>
        <div class="hstat"><div class="hstat-v">${h.hp}</div><div class="hstat-l">HP</div></div>
        <div class="hstat"><div class="hstat-v">${h.level}</div><div class="hstat-l">Level</div></div>
      </div>
      <div style="font-size:10px;color:var(--stone-light);margin-bottom:3px">XP ${h.xp}/${h.xpGoal}</div>
      <div class="hxp"><div class="hxp-i" style="width:${xpP}%"></div></div>
      <div class="hstatus ${sc}">${status}</div>
      ${bestQuest&&!h.onQuest&&!inArmy&&!inCity?`<div style="font-size:10px;color:var(--stone-light);font-style:italic;margin-bottom:5px">Possible reward: ${questRewardText(bestQuest)}</div>`:''}
      <div class="hero-actions">
        <button class="qbtn ${h.onQuest?'ret':''}" onclick="${h.onQuest?'':(`sendOnQuest(${i})`)}" ${h.onQuest||inArmy||inCity||!avail.length||h.level>=HERO_LEVEL_CAP?'disabled':''} style="flex:1">
          ${h.onQuest?'On Quest':(inArmy?'In Army':(inCity?'On Watch':(avail.length?`Quest (${avail.length})`:'Too Weak')))}
        </button>
        <button class="qbtn hero-auto-btn ${h.autoQuest?'ret':''}" onclick="toggleHeroAutoQuest(${i})" ${h.level>=HERO_LEVEL_CAP||inArmy||inCity?'disabled':''}>
          ${h.autoQuest?'Auto On':'Auto'}
        </button>
      </div>
      <div class="hero-actions" style="margin-top:6px">
        <button class="qbtn ${inArmy?'ret':''}" onclick="${inArmy?`releaseHeroFromArmy(${i})`:`assignHeroToArmy(${i})`}" ${h.onQuest||inCity?'disabled':''} style="flex:1">
          ${inArmy?'Withdraw from Army':`Assign to Army (+${armyBonus}%)`}
        </button>
        <button class="qbtn ${inCity?'ret':''}" onclick="${inCity?`releaseHeroFromCity(${i})`:`assignHeroToCity(${i})`}" ${h.onQuest||inArmy?'disabled':''} style="flex:1">
          ${inCity?'Leave City Watch':`City Defence (+${cityBonus})`}
        </button>
      </div>
    </div>`;
  }).join('');
}

function renderFaction(){
  const tab=document.getElementById('tab-faction');if(!tab)return;
  const path=VICTORY_PATHS[G.victoryPath];
  const seasonPct=Math.round((G.seasonWeek/SEASON_WEEKS)*100);
  const weeksLeft=SEASON_WEEKS-G.seasonWeek;
  const nextWeekLead=weekUnlockLead();
  const tribute=totalVillageTributePerMinute();
  const governed=G.npcFarms.filter(f=>getVillageState(f.id).governed);
  const assignedArmyHeroes=G.heroes.filter(h=>h.assignment==='army');
  const assignedCityHeroes=G.heroes.filter(h=>h.assignment==='city');
  const activeManaBuffs=MANA_ABILITIES.filter(a=>isManaBuffActive(a.id));
  const strongholds=G.npcFarms.filter(isStronghold);
  const capturedSites=capturedStrongholds();
  const villageCards=governed.length?governed.map(farm=>{
    const state=getVillageState(farm.id);
    const options=villageFocusOptions(farm);
    const trait=state.trait||'steward';
    return `<div class="village-card">
      <div class="village-card-top">
        <div>
          <div class="village-card-name">${farm.icon} ${farm.name}</div>
          <div class="village-card-meta">${villageFocusLabel(state.focus||'balanced')} focus · ${governorTraitLabel(trait)} governor · Passive tribute ${villageTributeString(farm,true)}</div>
        </div>
        <div class="village-card-level">Lv ${farm.level}</div>
      </div>
      <div class="village-card-desc">${villageFocusDesc(state.focus||'balanced')}</div>
      <div class="village-focus-row">
        ${options.map(option=>`<button class="village-focus-btn ${state.focus===option?'active':''}" onclick="setVillageFocus('${farm.id}','${option}')">${villageFocusLabel(option)}</button>`).join('')}
      </div>
      <div class="village-card-desc" style="margin-top:8px">${governorTraitDesc(trait)}</div>
      <div class="village-focus-row">
        ${Object.entries(GOVERNOR_TRAITS).map(([id,def])=>`<button class="village-focus-btn ${trait===id?'active':''}" onclick="setVillageTrait('${farm.id}','${id}')">${def.label}</button>`).join('')}
      </div>
    </div>`;
  }).join(''):'';

  tab.innerHTML=`
    <div class="section">
      <div class="section-title">⚔ Men of the West · Dynasty ${G.dynasty||1}</div>
      <div class="ftrait"><div class="ftrait-name">Diplomatic Mastery</div><div class="ftrait-desc">Can form vassal treaties. Tribute scales with renown and dynasty growth.</div></div>
      <div class="ftrait"><div class="ftrait-name">Balanced Arts</div><div class="ftrait-desc">All research branches cost the same. Master of all paths.</div></div>
      ${G.legacyRelics.length?`<div class="ftrait"><div class="ftrait-name">Legacy Relics</div><div class="ftrait-desc">${[...new Set(G.legacyRelics)].map(r=>`${relicLabel(r)} x${countRelic(r)}/${RELIC_STACK_CAP}`).join(' · ')}</div></div>`:''}
    </div>

    <div class="section">
      <div class="section-title">👑 Realm Expansion</div>
      <div class="ftrait"><div class="ftrait-name">Administration</div><div class="ftrait-desc">${governedVillageCount()} / ${currentAdminCap()} governed villages. Base capacity ${G.adminCap}, Citadel adds ${Math.floor(blvl('citadel')/2)}, and Provincial Rule adds ${hasResearch('provincial_rule')?1:0}.</div></div>
      <div class="ftrait"><div class="ftrait-name">Passive Tribute per Hour</div><div class="ftrait-desc">${Object.keys(tribute).length?tributeRateString(tribute,true).replace(/ /g,' · '):'No villages are paying tribute yet.'}</div></div>
      <div class="ftrait"><div class="ftrait-name">Governed Villages</div><div class="ftrait-desc">${governed.length?governed.map(f=>`${f.icon} ${f.name}`).join(' · '):'None yet. Win repeated raids to fill control, then crown the village from Combat.'}</div></div>
      <div class="ftrait"><div class="ftrait-name">Governor Corps</div><div class="ftrait-desc">${governed.length?`Stewards boost tribute, Wardens add ${totalWardenWallBonus()} wall defence, and Quartermasters add ${Math.round(totalQuartermasterBonus()*100)}% raid carry capacity.`:'No governors assigned yet.'}</div></div>
      ${governed.length?`<div class="village-card-list">${villageCards}</div>`:''}
    </div>

    <div class="section">
      <div class="section-title">🛡 Frontier War</div>
      <div class="ftrait"><div class="ftrait-name">Strongholds Held</div><div class="ftrait-desc">${capturedSites.length}/${strongholds.length} strongholds captured. End-of-season renown from frontier: ${strongholdSeasonRenown()}.</div></div>
      <div class="ftrait"><div class="ftrait-name">Orc Horde Gate</div><div class="ftrait-desc">${orcHordeUnlocked()?'The Orc Horde is exposed. Break it to secure the multiplayer transfer route.':'Capture all three strongholds and successfully defend each of them three times to reveal the Orc Horde.'}</div></div>
      <div class="ftrait"><div class="ftrait-name">Frontier Risk</div><div class="ftrait-desc">${capturedSites.length>=2?'Your expanding frontier is provoking Orc retaliation against both strongholds and the capital.':'Holding more frontier territory will draw stronger Orc retaliation.'}</div></div>
    </div>

    <div class="section">
      <div class="section-title">🛡 Kingdom Defence</div>
      <div class="defence-card">
        <div class="def-row"><span class="def-title">Wall Defence</span><span class="def-val">${currentWallDefence()}</span></div>
        <div class="def-bar"><div class="def-fill" style="width:${Math.min(100,(currentWallDefence()/1200)*100)}%"></div></div>
        <div style="font-size:11px;color:var(--stone-light);margin-top:6px;line-height:1.45">
          Base walls ${G.wallDefence||0} ? Wardens +${totalWardenWallBonus()} ? Garrison +${cityGarrisonPower()} ? City heroes +${totalAssignedCityHeroBonus()}
        </div>
        <div style="font-size:11px;color:var(--stone-light);margin-top:6px;font-style:italic">
          ${G.watchtowerUnlocked?'✓ Watchtower active — raid warnings enabled':'Build Citadel Lv2 to unlock Watchtower'}
        </div>
        <div style="font-size:11px;color:var(--stone-light);margin-top:4px;font-style:italic">
          Garrison: ${Object.entries(G.garrison||{}).filter(([,v])=>v>0).map(([k,v])=>`${TROOP_DEF[k]?.icon||k}${v}`).join(' ')||'None assigned'}
        </div>
        <div style="font-size:11px;color:var(--stone-light);margin-top:4px;font-style:italic">
          City heroes: ${assignedCityHeroes.length?assignedCityHeroes.map(h=>`${h.name} (+${heroCityDefenseBonusFor(h)})`).join(' ? '):'None assigned'}
        </div>
        <div class="garrison-grid" style="margin-top:8px">
          ${['infantry','archers','cavalry'].map(type=>`
            <div class="garrison-row">
              <span>${TROOP_DEF[type].icon} ${G.garrison[type]||0}</span>
              <div class="garrison-controls">
                <button class="train-btn" onclick="adjustCityGarrison('${type}',10)">+10</button>
                <button class="train-btn" onclick="adjustCityGarrison('${type}',-10)">-10</button>
              </div>
            </div>`).join('')}
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
      ${nextWeekLead?`<div style="font-size:11px;color:var(--gold-dark);font-style:italic;margin-bottom:10px">${nextWeekLead}</div>`:''}
      ${G.seasonComplete?`<div style="font-size:12px;color:var(--gold)">Season complete. Advance your dynasty to begin the next chapter.</div>`:
      (path?`<div style="font-size:12px;color:var(--forest-light)">✓ ${path.icon} ${path.label} · +${path.bonus}% renown bonus active</div>`:
      `<div style="font-size:12px;color:var(--stone-light);font-style:italic">No victory path achieved yet. Complete a research branch.</div>`)}
    </div>

    <div class="section">
      <div class="section-title">⚜ Crown Abilities</div>
      <div style="font-size:12px;color:var(--stone-light);font-style:italic;margin-bottom:10px">Spend renown points to activate faction abilities. Points: <span style="color:var(--gold);font-family:'Cinzel',serif">${G.prestigePoints}</span></div>
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
      <div class="section-title">✨ Mana Rituals</div>
      <div style="font-size:12px;color:var(--stone-light);font-style:italic;margin-bottom:10px">Stored mana can be spent on short kingdom and army rituals instead of sitting capped.</div>
      ${MANA_ABILITIES.map(a=>{
        const active=isManaBuffActive(a.id);
        const rem=manaBuffRemaining(a.id);
        const canUse=!active&&(G.resources.mana.amount>=a.cost);
        return `<div style="background:rgba(201,168,76,.04);border:1px solid rgba(201,168,76,.12);border-radius:4px;padding:10px;margin-bottom:7px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">
            <span style="font-family:'Cinzel',serif;font-size:12px;color:var(--parchment)">${a.icon} ${a.name}</span>
            <span style="font-family:'Cinzel',serif;font-size:10px;color:var(--gold);background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.2);border-radius:2px;padding:1px 6px">${a.cost} mana</span>
          </div>
          <div style="font-size:11px;color:var(--stone-light);font-style:italic;margin-bottom:6px">${a.desc}</div>
          ${active?`<div style="font-size:11px;color:var(--forest-light);margin-bottom:6px">Active · ${rem} min remaining</div>`:''}
          <button onclick="activateManaAbility('${a.id}')" ${canUse?'':'disabled'}
            style="width:100%;padding:5px;background:${canUse?'rgba(201,168,76,.1)':'rgba(255,255,255,.03)'};border:1px solid ${canUse?'var(--gold-dark)':'rgba(201,168,76,.15)'};border-radius:3px;color:${canUse?'var(--gold)':'var(--stone-light)'};font-family:'Cinzel',serif;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;cursor:${canUse?'pointer':'not-allowed'}">
            ${active?'Already Active':`Invoke · ${a.cost} mana`}
          </button>
        </div>`;
      }).join('')}
    </div>

    <div class="section">
      <div class="section-title">Save Data</div>
      <div class="ftrait">
        <div class="ftrait-name">Local Chronicle</div>
        <div class="ftrait-desc">Clear the save on this device and restart from a fresh kingdom if you want a clean early-game test.</div>
      </div>
      <button onclick="showResourceDebugPanel()"
        style="width:100%;padding:8px;background:rgba(201,168,76,.06);border:1px solid rgba(201,168,76,.22);border-radius:4px;color:var(--gold);font-family:'Cinzel',serif;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;margin-bottom:8px">
        Temporary Debug Resources
      </button>
      <button onclick="clearLocalSave()"
        style="width:100%;padding:8px;background:rgba(138,45,45,.12);border:1px solid rgba(138,45,45,.4);border-radius:4px;color:var(--blood-light);font-family:'Cinzel',serif;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer">
        Clear Local Save
      </button>
    </div>

    <div class="section">
      <div class="section-title">⚔ Hero Commands</div>
      <div class="ftrait"><div class="ftrait-name">Field Army</div><div class="ftrait-desc">${assignedArmyHeroes.length?`${assignedArmyHeroes.map(h=>`${h.name} (+${Math.round(heroArmyBonusFor(h)*100)}%)`).join(' · ')}. Total army bonus: +${Math.round(totalAssignedHeroArmyBonus()*100)}%.`:'No heroes are assigned to the field army yet.'}</div></div>
      <div class="ftrait"><div class="ftrait-name">Command Rule</div><div class="ftrait-desc">Heroes assigned to the army boost raid power and pause their questing until withdrawn.</div></div>
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

// ==== TICK TIMER ====
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


// ==== GLOBAL ERROR HANDLER ====
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









