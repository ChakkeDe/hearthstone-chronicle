// Building definitions and unlock data.
const BD=[
  {id:'farm',  name:'Grain Farm',   icon:'🌾',max:15,tier:1,desc:'Fertile fields feed your growing kingdom.',
   eff:l=>`+${l*3} food/min`,
   cost:l=>({wood:bCost(8,l), stone:bCost(4,l)}),
   onBuild:l=>{G.resources.food.rate+=3;},unlocks:['lumber','mine']},

  {id:'lumber',name:'Lumber Mill',  icon:'🪵',max:15,tier:1,desc:'Axes ring through the ancient forest.',
   eff:l=>`+${l*3} wood/min`,
   cost:l=>({gold:bCost(6,l), stone:bCost(4,l)}),
   onBuild:l=>{G.resources.wood.rate+=3;},unlocks:['mine','market']},

  {id:'mine',  name:'Stone Quarry', icon:'⛰', max:15,tier:1,desc:'Chisels bite deep into the hillside.',
   eff:l=>`+${l*3} stone/min`,
   cost:l=>({wood:bCost(10,l), food:bCost(5,l)}),
   onBuild:l=>{G.resources.stone.rate+=3;},unlocks:['market','ironworks']},

  {id:'market',name:'Grand Market', icon:'⚖', max:12,tier:2,desc:'Merchants bring coin from distant lands.',
   eff:l=>`+${l*5} gold/min`,
   cost:l=>({wood:bCost(20,l), stone:bCost(12,l), food:bCost(8,l)}),
   onBuild:l=>{G.resources.gold.rate+=5;},unlocks:['ironworks']},

  {id:'ironworks',name:'Iron Foundry',icon:'🔥',max:12,tier:2,desc:'Fire and hammer shape the future of war.',
   eff:l=>`+${l*4} iron/min`,
   cost:l=>({stone:bCost(15,l), gold:bCost(12,l), wood:bCost(8,l)}),
   onBuild:l=>{G.resources.iron.rate+=4;},
   req:{mine:1},unlocks:['tower','barracks']},

  {id:'tower', name:'Mage Tower',   icon:'🗼',max:10,tier:3,desc:'Ancient ley lines channel arcane power.',
   eff:l=>`+${l*3} mana/min, +${l*5}% research speed`,
   cost:l=>({stone:bCost(40,l), gold:bCost(30,l), iron:bCost(8,l)}),
   onBuild:l=>{G.resources.mana.rate+=3;revealR(['runic_script']);unlockTab('arcane');},
   req:{ironworks:1},unlocks:['citadel']},

  {id:'barracks',name:"King's Barracks",icon:'⚔',max:10,tier:3,desc:'Soldiers train under the banner of the West.',
   eff:l=>`+${l*10}% hero combat power`,
   cost:l=>({wood:bCost(25,l), stone:bCost(18,l), iron:bCost(5,l)}),
   onBuild:l=>{if(l===1)spawnHero();if(l===3)spawnHero();if(l===6)spawnHero();},
   req:{ironworks:1},unlocks:['citadel']},

  {id:'citadel',name:'Royal Citadel',icon:'🏰',max:7,tier:4,desc:'The seat of power. Expands caps, unlocks diplomacy and defence.',
   eff:l=>`+${l*450} caps, +${l*25} prestige/min, +${l*50} wall defence`,
   cost:l=>({gold:bCost(80,l),stone:bCost(60,l),iron:bCost(25,l),wood:bCost(40,l)}),
   onBuild:l=>{
     Object.values(G.resources).forEach(r=>r.max+=450);
     G.prestigeRate=(G.prestigeRate||0)+25;
     G.wallDefence=(G.wallDefence||0)+50;
     G.warChestCap=(G.warChestCap||500)+200;
     if(l>=2){G.watchtowerUnlocked=true;addLog('Watchtower unlocked!','important');}
     if(l>=3){addLog('Second research queue unlocked!','important');}
     revealR(['envoys']);unlockTab('diplomacy');},
   req:{barracks:2,tower:1}},
  {id:'hospital',name:'Field Hospital',icon:'🏥',max:8,tier:3,desc:'Treats wounded soldiers.',
   eff:l=>`Recover up to ${150+l*150} troops`,
   cost:l=>({wood:bCost(20,l),stone:bCost(15,l),food:bCost(10,l)}),
   onBuild:l=>{G.hospital.capacity=150+l*150;},req:{barracks:1}},
  {id:'granary',name:'Granary',icon:'🌾',max:10,tier:2,desc:'Vast grain stores feed your armies.',
   eff:l=>`+${l*300} food cap`,cost:l=>({wood:bCost(12,l),stone:bCost(8,l)}),
   onBuild:l=>{G.resources.food.max+=300;G.storageLevels.granary=l;},req:{farm:2}},
  {id:'vault',name:'Royal Vault',icon:'🏦',max:10,tier:2,desc:'Secure vaults protect your treasury.',
   eff:l=>`+${l*300} gold cap`,cost:l=>({stone:bCost(15,l),iron:bCost(8,l)}),
   onBuild:l=>{G.resources.gold.max+=300;G.storageLevels.vault=l;},req:{market:2}},
  {id:'timberyard',name:'Timber Yard',icon:'🪵',max:10,tier:2,desc:'Seasoned wood stockpiles.',
   eff:l=>`+${l*300} wood cap`,cost:l=>({food:bCost(10,l),stone:bCost(6,l)}),
   onBuild:l=>{G.resources.wood.max+=300;G.storageLevels.timberyard=l;},req:{lumber:2}},
  {id:'armoury',name:'Armoury',icon:'🗡',max:10,tier:2,desc:'Iron stockpiles for weapons and armour.',
   eff:l=>`+${l*250} iron cap`,cost:l=>({stone:bCost(18,l),wood:bCost(10,l)}),
   onBuild:l=>{G.resources.iron.max+=250;G.storageLevels.armoury=l;},req:{ironworks:2}},
  {id:'manawell',name:'Mana Well',icon:'🔮',max:10,tier:3,desc:'Arcane reservoirs hold the power drawn from the ley lines.',
   eff:l=>`+${l*250} mana cap`,cost:l=>({stone:bCost(20,l),gold:bCost(16,l),iron:bCost(6,l)}),
   onBuild:l=>{G.resources.mana.max+=250;G.storageLevels.manawell=l;},req:{tower:1}},
];
