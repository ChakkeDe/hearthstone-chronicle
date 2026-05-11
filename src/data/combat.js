// Troop and NPC raid target definitions.
const TROOP_DEF={
  infantry:{name:'Infantry',icon:'🗡',atk:10,def:15,carry:20,speed:60, trainTime:8, cost:{food:10,iron:5},  reqBarracks:1,desc:'Sturdy front-line fighters. Strong defence.'},
  archers: {name:'Archers', icon:'🏹',atk:14,def:8, carry:15,speed:90, trainTime:12,cost:{wood:15,iron:8},  reqBarracks:2,desc:'Ranged attackers. High loot efficiency.'},
  cavalry: {name:'Cavalry', icon:'🐎',atk:20,def:12,carry:40,speed:45, trainTime:25,cost:{food:20,iron:15}, reqBarracks:3,desc:'Fast raiders. Best loot capacity.'},
  siege:   {name:'Siege',   icon:'🏗',atk:35,def:5, carry:10,speed:120,trainTime:60,cost:{wood:40,iron:30},reqBarracks:4,desc:'Destroys walls. PvP only - no NPC use.'},
};

const NPC_FARMS=[
  {id:'n1',name:'Peasant Village',icon:'🏘',level:1,def:20, loot:{gold:30,food:40,wood:20}, tribute:{food:2.6,wood:1.8}, controlNeed:100, respawn:300,available:true,respawnAt:0},
  {id:'n2',name:'Abandoned Fort',  icon:'🏚',level:2,def:50, loot:{gold:60,iron:20,wood:30}, tribute:{gold:2.4,iron:1}, controlNeed:100, respawn:480,available:true,respawnAt:0},
  {id:'n3',name:'River Crossing',  icon:'🌊',level:2,def:40, loot:{food:80,wood:50}, tribute:{food:3.4,wood:2.4}, controlNeed:100, respawn:420,available:true,respawnAt:0},
  {id:'n4',name:'Bandit Camp',     icon:'⛺',level:3,def:100,loot:{gold:100,iron:40}, tribute:{gold:4.2,iron:1.8}, controlNeed:120, respawn:600,available:true,respawnAt:0},
  {id:'n5',name:'Ancient Ruins',   icon:'🗺',level:4,def:200,loot:{gold:150,mana:20,iron:60}, tribute:{gold:5.5,mana:0.8,iron:2.6}, controlNeed:140, respawn:900,available:true,respawnAt:0},
  {id:'n6',name:'Raider Outpost',  icon:'🛖',level:3,def:120,loot:{gold:120,food:70,wood:55}, tribute:{gold:4.5,food:2.8,wood:2.2}, controlNeed:120, respawn:660,available:true,respawnAt:0},
  {id:'n7',name:'Hill Clan Hold',  icon:'🪓',level:4,def:220,loot:{gold:160,iron:70,food:90}, tribute:{gold:6,iron:2.8,food:3.2}, controlNeed:140, respawn:840,available:true,respawnAt:0},
  {id:'n8',name:'Trade Waypoint',  icon:'🚩',level:4,def:260,loot:{gold:220,wood:90,mana:25}, tribute:{gold:6.8,wood:3.2,mana:0.9}, controlNeed:150, respawn:900,available:true,respawnAt:0},
  {id:'s1',name:'Blackcrag Watch', icon:'🗼',kind:'stronghold',level:6,def:600,lootScale:{gold:0.14,wood:0.1,iron:0.08}, controlNeed:180, captureWeek:4, seasonalRenown:250, respawn:1200,available:true,respawnAt:0},
  {id:'s2',name:'Ashen Bastion',   icon:'🏯',kind:'stronghold',level:7,def:950,lootScale:{gold:0.16,food:0.12,iron:0.11,mana:0.05}, controlNeed:220, captureWeek:5, seasonalRenown:400, respawn:1500,available:true,respawnAt:0},
  {id:'s3',name:'Gorgath Citadel', icon:'🏰',kind:'stronghold',level:8,def:1400,lootScale:{gold:0.18,food:0.14,iron:0.14,mana:0.08}, controlNeed:260, captureWeek:6, seasonalRenown:650, respawn:1800,available:true,respawnAt:0},
  {id:'h1',name:'Orc Horde',       icon:'🐺',kind:'horde',level:10,def:2200,lootScale:{gold:0.22,food:0.18,iron:0.18,mana:0.1}, controlNeed:320, seasonalRenown:1200, unlockAfterDefends:true, respawn:2400,available:true,respawnAt:0},
];

