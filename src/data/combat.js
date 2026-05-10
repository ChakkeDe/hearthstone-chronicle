// Troop and NPC raid target definitions.
const TROOP_DEF={
  infantry:{name:'Infantry',icon:'🗡',atk:10,def:15,carry:20,speed:60, trainTime:8, cost:{food:10,iron:5},  reqBarracks:1,desc:'Sturdy front-line fighters. Strong defence.'},
  archers: {name:'Archers', icon:'🏹',atk:14,def:8, carry:15,speed:90, trainTime:12,cost:{wood:15,iron:8},  reqBarracks:2,desc:'Ranged attackers. High loot efficiency.'},
  cavalry: {name:'Cavalry', icon:'🐎',atk:20,def:12,carry:40,speed:45, trainTime:25,cost:{food:20,iron:15}, reqBarracks:3,desc:'Fast raiders. Best loot capacity.'},
  siege:   {name:'Siege',   icon:'🏹',atk:35,def:5, carry:10,speed:120,trainTime:60,cost:{wood:40,iron:30},reqBarracks:4,desc:'Destroys walls. PvP only — no NPC use.'},
};

const NPC_FARMS=[
  {id:'n1',name:'Peasant Village',icon:'🏘',level:1,def:20, loot:{gold:30,food:40,wood:20},respawn:300,available:true,respawnAt:0},
  {id:'n2',name:'Abandoned Fort',  icon:'🏚',level:2,def:50, loot:{gold:60,iron:20,wood:30},respawn:480,available:true,respawnAt:0},
  {id:'n3',name:'River Crossing',  icon:'🌊',level:2,def:40, loot:{food:80,wood:50},respawn:420,available:true,respawnAt:0},
  {id:'n4',name:'Bandit Camp',     icon:'⛺',level:3,def:100,loot:{gold:100,iron:40},respawn:600,available:true,respawnAt:0},
  {id:'n5',name:'Ancient Ruins',   icon:'🗺',level:4,def:200,loot:{gold:150,mana:20,iron:60},respawn:900,available:true,respawnAt:0},
  {id:'n6',name:'Orc Stronghold',  icon:'🏯',level:5,def:400,loot:{gold:200,iron:100,food:80},respawn:1200,available:true,respawnAt:0},
];
