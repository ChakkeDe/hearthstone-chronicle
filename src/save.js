// Save, load, and cloud persistence helpers.

const SAVE_VERSION = 1;
const LOCAL_SAVE_KEYS = ['hc4', 'hc3'];
const LOCAL_RESET_SENTINEL = 'hc_local_reset_pending';

let _suspendPersistence = false;

function isPlainObject(value){
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function asFiniteNumber(value, fallback){
  return Number.isFinite(value) ? value : fallback;
}

function asArray(value, fallback=[]){
  return Array.isArray(value) ? value : fallback;
}

function asString(value, fallback=''){
  return typeof value === 'string' ? value : fallback;
}

function derivePrestigeGoal(savedDynasty, savedPrestigeGoal){
  if(Number.isFinite(savedPrestigeGoal) && savedPrestigeGoal > 0) return savedPrestigeGoal;
  const dynasty = Math.max(0, asFiniteNumber(savedDynasty, 0));
  return 1000 + (dynasty * 250);
}

function safeSaveObject(raw){
  return isPlainObject(raw) ? raw : null;
}

function clearPersistedLocalSaveData(){
  try{
    LOCAL_SAVE_KEYS.forEach(key=>localStorage.removeItem(key));
  }catch(e){}
}

function markPendingLocalReset(){
  try{
    sessionStorage.setItem(LOCAL_RESET_SENTINEL, '1');
  }catch(e){}
}

function consumePendingLocalReset(){
  try{
    const pending = sessionStorage.getItem(LOCAL_RESET_SENTINEL) === '1';
    if(pending) sessionStorage.removeItem(LOCAL_RESET_SENTINEL);
    return pending;
  }catch(e){
    return false;
  }
}

function sanitizeResourceSnapshot(savedResources){
  const out = {};
  if(!isPlainObject(savedResources)) return out;
  Object.entries(savedResources).forEach(([key, value])=>{
    if(!isPlainObject(value)) return;
    out[key] = {
      amount: asFiniteNumber(value.amount, 0),
      rate: asFiniteNumber(value.rate, 0),
      max: asFiniteNumber(value.max, 0),
    };
  });
  return out;
}

function normalizeSavedResearch(savedResearch){
  const current = G.research || {};
  const next = {};
  Object.keys(current).forEach(id=>{
    const saved = savedResearch?.[id];
    next[id] = {
      completed: typeof saved === 'boolean' ? saved : !!saved?.completed,
    };
  });
  return next;
}

function sanitizeTroops(savedTroops){
  if(!isPlainObject(savedTroops)) return;
  Object.entries(savedTroops).forEach(([type, troop])=>{
    if(!G.troops[type] || !isPlainObject(troop)) return;
    G.troops[type].total = Math.max(0, asFiniteNumber(troop.total, G.troops[type].total));
    G.troops[type].available = Math.max(0, asFiniteNumber(troop.available, G.troops[type].available));
    G.troops[type].injured = Math.max(0, asFiniteNumber(troop.injured, G.troops[type].injured));
    G.troops[type].training = Math.max(0, asFiniteNumber(troop.training, G.troops[type].training));
    G.troops[type].trainEnd = Math.max(0, asFiniteNumber(troop.trainEnd, G.troops[type].trainEnd));
  });
}

function sanitizeHospital(savedHospital){
  if(!isPlainObject(savedHospital)) return;
  G.hospital.capacity = Math.max(0, asFiniteNumber(savedHospital.capacity, G.hospital.capacity));
  G.hospital.recovering = Math.max(0, asFiniteNumber(savedHospital.recovering, G.hospital.recovering));
  G.hospital.recoverEnd = Math.max(0, asFiniteNumber(savedHospital.recoverEnd, G.hospital.recoverEnd));
}

function sanitizeGarrison(savedGarrison){
  if(!isPlainObject(savedGarrison)) return;
  Object.keys(G.garrison).forEach(type=>{
    G.garrison[type] = Math.max(0, asFiniteNumber(savedGarrison[type], G.garrison[type]));
  });
}

function sanitizeStorageLevels(savedStorageLevels){
  if(!isPlainObject(savedStorageLevels)) return;
  Object.keys(G.storageLevels).forEach(key=>{
    G.storageLevels[key] = Math.max(0, asFiniteNumber(savedStorageLevels[key], G.storageLevels[key]));
  });
}

function sanitizeManaBuffs(savedManaBuffs){
  if(!isPlainObject(savedManaBuffs)) return;
  Object.keys(G.manaBuffs).forEach(key=>{
    G.manaBuffs[key] = Math.max(0, asFiniteNumber(savedManaBuffs[key], G.manaBuffs[key]));
  });
}

function sanitizeAutoFarm(savedAutoFarm){
  if(!isPlainObject(savedAutoFarm)) return {};
  const next = {};
  Object.entries(savedAutoFarm).forEach(([farmId, value])=>{
    if(!isPlainObject(value)) return;
    next[farmId] = {
      ...value,
      enabled: !!value.enabled,
    };
    if(Number.isFinite(value.floor)) next[farmId].floor = value.floor;
    if(Number.isFinite(value.troopFloor) && !Number.isFinite(next[farmId].floor)){
      next[farmId].floor = value.troopFloor;
    }
  });
  return next;
}

async function cloudSave(){
  if(_suspendPersistence) return;
  if(!G.supabaseUrl || !G.supabaseKey) return;
  try{
    const payload = buildSavePayload();
    const res = await fetch(`${G.supabaseUrl}/rest/v1/saves`,{
      method:'POST',
      headers:{
        'apikey':G.supabaseKey,
        'Authorization':`Bearer ${G.supabaseKey}`,
        'Content-Type':'application/json',
        'Prefer':'resolution=merge-duplicates',
      },
      body:JSON.stringify({id:'player_1',data:JSON.stringify(payload),updated_at:new Date().toISOString()}),
    });
    if(res.ok) addLog('Kingdom chronicle saved to the cloud.','');
  }catch(e){
    console.warn('Cloud save failed:',e);
  }
}

async function cloudLoad(){
  if(_suspendPersistence) return false;
  if(!G.supabaseUrl || !G.supabaseKey) return false;
  try{
    await fetchServerTime();
    const res = await fetch(`${G.supabaseUrl}/rest/v1/saves?id=eq.player_1&select=data,updated_at`,{
      headers:{'apikey':G.supabaseKey,'Authorization':`Bearer ${G.supabaseKey}`},
    });
    if(!res.ok) return false;
    const rows = await res.json();
    if(!Array.isArray(rows) || !rows.length) return false;
    const rawData = rows[0]?.data;
    const parsed = safeSaveObject(typeof rawData === 'string' ? JSON.parse(rawData) : rawData);
    if(!parsed) return false;
    const dbUpdatedAt = new Date(rows[0].updated_at).getTime();
    parsed.lastSaveTime = dbUpdatedAt;
    parsed.lastServerTime = dbUpdatedAt;
    applyLoadedState(parsed);
    G._tickAtLastLoad = G.tick;
    addLog('Dynasty restored from the cloud.','important');
    return true;
  }catch(e){
    return false;
  }
}

function buildSavePayload(){
  return {
    saveVersion: SAVE_VERSION,
    year:G.year,
    era:G.era,
    prestige:G.prestige,
    prestigeGoal:G.prestigeGoal,
    prestigeRate:G.prestigeRate,
    prestigePoints:G.prestigePoints,
    season:G.season,
    seasonWeek:G.seasonWeek,
    seasonTick:G.seasonTick,
    seasonComplete:G.seasonComplete,
    dynasty:G.dynasty,
    legacyRelics:G.legacyRelics,
    governedVillages:G.governedVillages,
    adminCap:G.adminCap,
    allianceSize:G.allianceSize,
    victoryPath:G.victoryPath,
    victoryBonus:G.victoryBonus,
    lastSaveTime:getReliableNow(),
    lastActiveTime:G.lastActiveTime || getReliableNow(),
    lastServerTime:G.lastServerTime || getReliableNow(),
    offlineCapHours:G.offlineCapHours,
    _lastKnownOfflineCap:G.offlineCapHours * 3600,
    resources:Object.fromEntries(Object.entries(G.resources).map(([k,v])=>[k,{amount:v.amount,rate:v.rate,max:v.max}])),
    buildings:G.buildings,
    research:G.research,
    heroes:G.heroes,
    activeResearch:G.activeResearch,
    researchProgress:G.researchProgress,
    activeResearch2:G.activeResearch2,
    researchProgress2:G.researchProgress2,
    tick:G.tick,
    activeTab:G.activeTab,
    activeResearchTab:G.activeResearchTab,
    revealedBuildings:G.revealedBuildings,
    revealedResearch:G.revealedResearch,
    showLockedBuildings:G.showLockedBuildings,
    showMaxedBuildings:G.showMaxedBuildings,
    unlockedResearchTabs:G.unlockedResearchTabs,
    flags:{
      costReduction:G.costReduction,
      wardProtect:G.wardProtect,
      hasAlchemy:G.hasAlchemy,
      hasFarsight:G.hasFarsight,
      hasSiege:G.hasSiege,
      questTimeMulti:G.questTimeMulti,
      fortBonus:G.fortBonus,
    },
    troops:G.troops,
    hospital:G.hospital,
    npcFarms:G.npcFarms,
    activeRaids:G.activeRaids,
    combatLog:G.combatLog,
    autoFarm:G.autoFarm,
    raidReports:G.raidReports,
    wallDefence:G.wallDefence,
    garrison:G.garrison,
    watchtowerUnlocked:G.watchtowerUnlocked,
    warChest:G.warChest,
    warChestCap:G.warChestCap,
    warChestWeeklyConverted:G.warChestWeeklyConverted,
    lastWarChestDecay:G.lastWarChestDecay,
    storageLevels:G.storageLevels,
    manaBuffs:G.manaBuffs,
    kingdomName:G.kingdomName,
    playerName:G.playerName,
    tutorialStep:G.tutorialStep,
    tutorialDone:G.tutorialDone,
    milestonesReached:G.milestonesReached,
    supabaseUrl:G.supabaseUrl,
    supabaseKey:G.supabaseKey,
    log:G.log.slice(0,20),
  };
}

function applyLoadedState(rawSave){
  const s = safeSaveObject(rawSave);
  if(!s) return;

  const savedDynasty = Math.max(0, asFiniteNumber(s.dynasty, 0));

  G.year = Math.max(1, asFiniteNumber(s.year, 1));
  G.era = asString(s.era, G.era || 'First Age');
  G.prestige = Math.max(0, asFiniteNumber(s.prestige, 0));
  G.prestigeGoal = derivePrestigeGoal(savedDynasty, s.prestigeGoal);
  G.prestigeRate = Math.max(0, asFiniteNumber(s.prestigeRate, 0));
  G.prestigePoints = Math.max(0, asFiniteNumber(s.prestigePoints, 0));
  G.season = Math.max(1, asFiniteNumber(s.season, 1));
  G.seasonWeek = Math.max(1, asFiniteNumber(s.seasonWeek, 1));
  G.seasonTick = Math.max(0, asFiniteNumber(s.seasonTick, 0));
  G.seasonComplete = !!s.seasonComplete;
  G.dynasty = savedDynasty;
  G.legacyRelics = capRelicStacks(asArray(s.legacyRelics, []));
  G.governedVillages = isPlainObject(s.governedVillages) ? s.governedVillages : {};
  G.adminCap = Math.max(1, asFiniteNumber(s.adminCap, 1));
  G.allianceSize = Math.max(1, asFiniteNumber(s.allianceSize, G.allianceSize || 8));
  G.victoryPath = asString(s.victoryPath, 'mixed');
  G.victoryBonus = Math.max(0, asFiniteNumber(s.victoryBonus, 0));
  G.lastSaveTime = Math.max(0, asFiniteNumber(s.lastSaveTime, Date.now()));
  G.lastActiveTime = Math.max(0, asFiniteNumber(s.lastActiveTime, G.lastSaveTime));
  G.lastServerTime = Math.max(0, asFiniteNumber(s.lastServerTime, G.lastSaveTime));
  G.offlineCapHours = Math.max(1, asFiniteNumber(s.offlineCapHours, G.offlineCapHours || 12));
  G._lastKnownOfflineCap = Math.max(0, asFiniteNumber(s._lastKnownOfflineCap, G.offlineCapHours * 3600));

  const savedResources = sanitizeResourceSnapshot(s.resources);
  Object.entries(savedResources).forEach(([key, value])=>{
    if(!G.resources[key]) return;
    G.resources[key].amount = Math.max(0, asFiniteNumber(value.amount, G.resources[key].amount));
    G.resources[key].rate = asFiniteNumber(value.rate, G.resources[key].rate);
    G.resources[key].max = Math.max(0, asFiniteNumber(value.max, G.resources[key].max));
  });

  asArray(s.buildings, []).forEach(b=>{
    if(!isPlainObject(b)) return;
    const current = G.buildings.find(x=>x.id===b.id);
    if(current) current.level = Math.max(0, asFiniteNumber(b.level, current.level));
  });

  G.research = normalizeSavedResearch(s.research);
  G.heroes = asArray(s.heroes, []).filter(isPlainObject);
  normalizeHeroes();

  G.activeResearch = typeof s.activeResearch === 'string' ? s.activeResearch : null;
  G.researchProgress = Math.max(0, asFiniteNumber(s.researchProgress, 0));
  G.activeResearch2 = typeof s.activeResearch2 === 'string' ? s.activeResearch2 : null;
  G.researchProgress2 = Math.max(0, asFiniteNumber(s.researchProgress2, 0));
  G.tick = Math.max(0, asFiniteNumber(s.tick, 0));
  G.activeTab = asString(s.activeTab, G.activeTab || 'kingdom');
  G.activeResearchTab = asString(s.activeResearchTab, G.activeResearchTab || 'economy');
  G.revealedBuildings = asArray(s.revealedBuildings, G.revealedBuildings).filter(v=>typeof v === 'string');
  G.revealedResearch = asArray(s.revealedResearch, G.revealedResearch).filter(v=>typeof v === 'string');
  G.showLockedBuildings = !!s.showLockedBuildings;
  G.showMaxedBuildings = !!s.showMaxedBuildings;
  G.unlockedResearchTabs = asArray(s.unlockedResearchTabs, G.unlockedResearchTabs).filter(v=>typeof v === 'string');

  const flags = isPlainObject(s.flags) ? s.flags : {};
  G.costReduction = flags.costReduction ?? G.costReduction;
  G.wardProtect = !!flags.wardProtect;
  G.hasAlchemy = !!flags.hasAlchemy;
  G.hasFarsight = !!flags.hasFarsight;
  G.hasSiege = !!flags.hasSiege;
  G.questTimeMulti = flags.questTimeMulti ?? G.questTimeMulti;
  G.fortBonus = asFiniteNumber(flags.fortBonus, G.fortBonus);

  sanitizeTroops(s.troops);
  sanitizeHospital(s.hospital);
  mergeSavedNpcFarms(s.npcFarms);

  G.activeRaids = asArray(s.activeRaids, []).filter(isPlainObject);
  G.combatLog = asArray(s.combatLog, []).filter(isPlainObject);
  G.raidReports = asArray(s.raidReports, []).filter(isPlainObject);
  G.autoFarm = sanitizeAutoFarm(s.autoFarm);
  G.wallDefence = Math.max(0, asFiniteNumber(s.wallDefence, G.wallDefence));
  sanitizeGarrison(s.garrison);
  G.watchtowerUnlocked = !!s.watchtowerUnlocked;
  G.warChest = Math.max(0, asFiniteNumber(s.warChest, 0));
  G.warChestCap = Math.max(0, asFiniteNumber(s.warChestCap, G.warChestCap));
  G.warChestWeeklyConverted = Math.max(0, asFiniteNumber(s.warChestWeeklyConverted, 0));
  G.lastWarChestDecay = Math.max(0, asFiniteNumber(s.lastWarChestDecay, 0));
  sanitizeStorageLevels(s.storageLevels);
  sanitizeManaBuffs(s.manaBuffs);

  G.kingdomName = asString(s.kingdomName, G.kingdomName || 'Arnethia');
  G.playerName = asString(s.playerName, G.playerName || '');
  G.tutorialStep = Math.max(0, asFiniteNumber(s.tutorialStep, 0));
  G.tutorialDone = !!s.tutorialDone;
  G.milestonesReached = asArray(s.milestonesReached, []).filter(v=>typeof v === 'string');
  G.supabaseUrl = asString(s.supabaseUrl, G.supabaseUrl || '');
  G.supabaseKey = asString(s.supabaseKey, G.supabaseKey || '');
  G.log = asArray(s.log, G.log).filter(isPlainObject);

  normalizeDerivedBuildingState();
}

function mergeSavedNpcFarms(savedFarms){
  if(!Array.isArray(savedFarms) || !savedFarms.length){
    G.npcFarms = NPC_FARMS.map(f=>({...f}));
    return;
  }
  const savedById = Object.fromEntries(
    savedFarms
      .filter(isPlainObject)
      .filter(f=>typeof f.id === 'string')
      .map(f=>[f.id, f])
  );
  G.npcFarms = NPC_FARMS.map(base=>({
    ...base,
    ...(savedById[base.id] || {}),
    loot:{...(base.loot || {}), ...((savedById[base.id] || {}).loot || {})},
    tribute:{...(base.tribute || {}), ...((savedById[base.id] || {}).tribute || {})},
  }));
}

function saveGame(){
  if(_suspendPersistence) return;
  G.lastSaveTime = getReliableNow();
  G.lastServerTime = G.lastSaveTime;
  try{
    localStorage.setItem('hc4', JSON.stringify(buildSavePayload()));
  }catch(e){}
}

function loadGame(){
  try{
    const raw = LOCAL_SAVE_KEYS.map(key=>localStorage.getItem(key)).find(Boolean);
    if(!raw) return;
    const parsed = safeSaveObject(JSON.parse(raw));
    if(!parsed) return;
    applyLoadedState(parsed);
    addLog('Chronicle restored. Your dynasty continues...','important');
  }catch(e){}
}

function clearLocalSave(){
  const ok = window.confirm('Clear your local save and restart from a fresh kingdom? This cannot be undone.');
  if(!ok) return;
  // Suspend autosave/cloud sync first so pagehide cannot write the old kingdom back.
  _suspendPersistence = true;
  if(typeof _offlineReady !== 'undefined') _offlineReady = false;
  if(typeof G !== 'undefined'){
    G.supabaseUrl = '';
    G.supabaseKey = '';
  }
  clearPersistedLocalSaveData();
  markPendingLocalReset();
  window.location.replace(window.location.href);
}
