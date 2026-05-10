// Research tree definitions.
const RD={
  economy:[
    {id:'trade_routes',name:'Trade Routes',desc:'+25% gold income.',cost:{gold:65,wood:30},time:60,
     eff:()=>{G.resources.gold.rate=Math.round(G.resources.gold.rate*1.25);},unlocks:['crop_rotation','stonemasons']},
    {id:'crop_rotation',name:'Crop Rotation',desc:'+30% food income.',cost:{food:60,gold:35},time:90,
     eff:()=>{G.resources.food.rate=Math.round(G.resources.food.rate*1.3);},req:'trade_routes',unlocks:['stonemasons']},
    {id:'stonemasons',name:'Guild of Stonemasons',desc:'+50% stone income.',cost:{stone:70,gold:50},time:120,
     eff:()=>{G.resources.stone.rate=Math.round(G.resources.stone.rate*1.5);},req:'trade_routes',unlocks:['banking']},
    {id:'banking',name:'Royal Treasury',desc:'Gold cap doubled. +5 gold/min.',cost:{gold:180,iron:18},time:240,
     eff:()=>{G.resources.gold.max*=2;G.resources.gold.rate+=5;},req:'stonemasons'},
  ],
  military:[
    {id:'swordsmanship',name:'Swordsmanship',desc:'Heroes deal +20% damage.',cost:{iron:24,gold:45},time:75,
     eff:()=>{G.heroes.forEach(h=>h.power=Math.round(h.power*1.2));},unlocks:['fortification','cavalry']},
    {id:'fortification',name:'Fortifications',desc:'Border defence +40%.',cost:{stone:55,iron:18},time:105,
     eff:()=>{G.fortBonus=(G.fortBonus||0)+40;},req:'swordsmanship',unlocks:['siegecraft']},
    {id:'cavalry',name:'Order of Knights',desc:'Expedition time halved. Loot +25%.',cost:{iron:55,gold:70,food:40},time:180,
     eff:()=>{G.questTimeMulti=0.5;},req:'swordsmanship'},
    {id:'siegecraft',name:'Siege Engines',desc:'Unlocks conquest quests.',cost:{iron:90,stone:75,wood:55},time:300,
     eff:()=>{G.hasSiege=true;},req:'fortification'},
  ],
  arcane:[
    {id:'runic_script',name:'Runic Script',desc:'+1 mana/min from Mage Towers.',cost:{gold:60,wood:30},time:90,
     eff:()=>{G.resources.mana.rate+=1;},unlocks:['warding','alchemy']},
    {id:'warding',name:'Wards of Protection',desc:'Heroes survive fatal quests once.',cost:{mana:20,gold:60},time:180,
     eff:()=>{G.wardProtect=true;},req:'runic_script',unlocks:['farseeing']},
    {id:'alchemy',name:'Alchemical Arts',desc:'10 mana → 50 gold per minute.',cost:{mana:40,gold:80,iron:20},time:240,
     eff:()=>{G.hasAlchemy=true;},req:'runic_script'},
    {id:'farseeing',name:"The Palantír Art",desc:'Preview quest outcomes before committing.',cost:{mana:80,gold:100},time:300,
     eff:()=>{G.hasFarsight=true;},req:'warding'},
  ],
  diplomacy:[
    {id:'envoys',name:'Royal Envoys',desc:'+10 gold/min tribute from neutral lands.',cost:{gold:60,food:40},time:120,
     eff:()=>{G.resources.gold.rate+=10;},unlocks:['treaties','trade_alliance']},
    {id:'treaties',name:'Vassal Treaties',desc:'Men of the West unique. +20 prestige/min.',cost:{gold:120,food:60},time:200,
     eff:()=>{G.prestigeRate=(G.prestigeRate||0)+20;},req:'envoys',unlocks:['high_council']},
    {id:'trade_alliance',name:'Trade Alliance',desc:'Building costs reduced by 15%.',cost:{gold:150,iron:30},time:240,
     eff:()=>{G.costReduction=0.85;},req:'envoys'},
    {id:'high_council',name:'High Council of Kings',desc:'Establish dynastic dominance. +200 prestige.',cost:{gold:300,mana:50,iron:50},time:480,
     eff:()=>{addLog('The High Council convenes. Your dynasty is legend.','important');G.prestige+=200;},req:'treaties'},
  ],
};

// ── COMBAT DEFINITIONS ──
