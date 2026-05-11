// Save, load, and cloud persistence helpers.

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
    if(res.ok) addLog('Kingdom chronicle saved to the cloud.','');
  }catch(e){console.warn('Cloud save failed:',e);}
}

async function cloudLoad(){
  if(!G.supabaseUrl||!G.supabaseKey)return false;
  try{
    await fetchServerTime();
    const res=await fetch(`${G.supabaseUrl}/rest/v1/saves?id=eq.player_1&select=data,updated_at`,{
      headers:{'apikey':G.supabaseKey,'Authorization':`Bearer ${G.supabaseKey}`},
    });
    if(!res.ok)return false;
    const rows=await res.json();
    if(!rows.length)return false;
    const s=JSON.parse(rows[0].data);
    const dbUpdatedAt=new Date(rows[0].updated_at).getTime();
    s.lastSaveTime=dbUpdatedAt;
    s.lastServerTime=dbUpdatedAt;
    applyLoadedState(s);
    G._tickAtLastLoad=G.tick;
    addLog('Dynasty restored from the cloud.','important');
    return true;
  }catch(e){return false;}
}

function buildSavePayload(){
  return {
    year:G.year,prestige:G.prestige,prestigeRate:G.prestigeRate,
    prestigePoints:G.prestigePoints,season:G.season,seasonWeek:G.seasonWeek,
    seasonTick:G.seasonTick,seasonComplete:G.seasonComplete,dynasty:G.dynasty,legacyRelics:G.legacyRelics,
    governedVillages:G.governedVillages,adminCap:G.adminCap,
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
    showLockedBuildings:G.showLockedBuildings,
    showMaxedBuildings:G.showMaxedBuildings,
    unlockedResearchTabs:G.unlockedResearchTabs,
    flags:{costReduction:G.costReduction,wardProtect:G.wardProtect,hasAlchemy:G.hasAlchemy,
           hasFarsight:G.hasFarsight,hasSiege:G.hasSiege,questTimeMulti:G.questTimeMulti,fortBonus:G.fortBonus},
    troops:G.troops,hospital:G.hospital,npcFarms:G.npcFarms,
    activeRaids:G.activeRaids,combatLog:G.combatLog,autoFarm:G.autoFarm,
    raidReports:G.raidReports,
    wallDefence:G.wallDefence,garrison:G.garrison,watchtowerUnlocked:G.watchtowerUnlocked,
    warChest:G.warChest,warChestCap:G.warChestCap,warChestWeeklyConverted:G.warChestWeeklyConverted,
    lastWarChestDecay:G.lastWarChestDecay,storageLevels:G.storageLevels,manaBuffs:G.manaBuffs,
    supabaseUrl:G.supabaseUrl,supabaseKey:G.supabaseKey,
    log:G.log.slice(0,20),
  };
}

function applyLoadedState(s){
  G.year=s.year||1;G.prestige=s.prestige||0;G.prestigeRate=s.prestigeRate||0;
  G.prestigePoints=s.prestigePoints||0;
  G.season=s.season||1;G.seasonWeek=s.seasonWeek||1;G.seasonTick=s.seasonTick||0;
  G.seasonComplete=!!s.seasonComplete;
  G.dynasty=s.dynasty||0;G.legacyRelics=capRelicStacks(s.legacyRelics||[]);
  G.governedVillages=s.governedVillages||{};
  G.adminCap=s.adminCap||1;
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
  normalizeHeroes();
  G.activeResearch=s.activeResearch||null;G.researchProgress=s.researchProgress||0;G.tick=s.tick||0;
  if(s.revealedBuildings)G.revealedBuildings=s.revealedBuildings;
  if(s.revealedResearch)G.revealedResearch=s.revealedResearch;
  G.showLockedBuildings=!!s.showLockedBuildings;
  G.showMaxedBuildings=!!s.showMaxedBuildings;
  if(s.unlockedResearchTabs)G.unlockedResearchTabs=s.unlockedResearchTabs;
  if(s.flags){const f=s.flags;G.costReduction=f.costReduction;G.wardProtect=f.wardProtect;G.hasAlchemy=f.hasAlchemy;G.hasFarsight=f.hasFarsight;G.hasSiege=f.hasSiege;G.questTimeMulti=f.questTimeMulti;G.fortBonus=f.fortBonus;}
  if(s.troops)Object.assign(G.troops,s.troops);
  if(s.hospital)Object.assign(G.hospital,s.hospital);
  mergeSavedNpcFarms(s.npcFarms);
  if(s.activeRaids)G.activeRaids=s.activeRaids;
  if(s.combatLog)G.combatLog=s.combatLog;
  if(s.raidReports)G.raidReports=s.raidReports;
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
  if(s.manaBuffs)Object.assign(G.manaBuffs,s.manaBuffs);
  if(s.supabaseUrl)G.supabaseUrl=s.supabaseUrl;
  if(s.supabaseKey)G.supabaseKey=s.supabaseKey;
  G.log=s.log||G.log;
  normalizeDerivedBuildingState();
}

function mergeSavedNpcFarms(savedFarms){
  if(!Array.isArray(savedFarms)||!savedFarms.length){
    G.npcFarms=NPC_FARMS.map(f=>({...f}));
    return;
  }
  const savedById=Object.fromEntries(savedFarms.map(f=>[f.id,f]));
  G.npcFarms=NPC_FARMS.map(base=>({
    ...base,
    ...(savedById[base.id]||{}),
    loot:{...(base.loot||{}),...((savedById[base.id]||{}).loot||{})},
    tribute:{...(base.tribute||{}),...((savedById[base.id]||{}).tribute||{})},
  }));
}

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
    addLog('Chronicle restored. Your dynasty continues...','important');
  }catch(e){}
}
