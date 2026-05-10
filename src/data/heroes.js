// Hero name pools and quest definitions.
const HERO_NAMES=['Aldric the Bold','Seraphina Dawnblade','Torren Ironfist','Lyra Swiftarrow','Caelen of the Vale'];
const HERO_CLS=['Knight','Ranger','Mage','Warrior','Scout'];
const QUESTS=[
  {name:'Border Skirmish',minP:5, t:60, rew:{gold:30,iron:10},  xp:20, danger:.1,  desc:'Drive off raiders from the northern pass.'},
  {name:'Forest Hunt',    minP:8, t:90, rew:{food:50,wood:30},  xp:35, danger:.15, desc:'Hunt the beasts plaguing eastern villages.'},
  {name:'Dungeon Delve',  minP:10,t:150,rew:{iron:25,gold:40},  xp:45, danger:.2,  desc:'Descend into the ruins beneath Harrowmere.'},
  {name:'Ancient Vault',  minP:20,t:240,rew:{gold:100,mana:20,iron:30},xp:80,danger:.3,desc:'Seek treasures of the Old Kingdom.'},
  {name:'Dragon Scouting',minP:30,t:360,rew:{gold:150,mana:40}, xp:120,danger:.4,  desc:'Observe the wyvern nesting near the Ashpeaks.'},
  {name:'Siege of Morrath',minP:50,t:480,rew:{gold:250,iron:80,mana:30},xp:200,danger:.5,desc:'Storm the ruined fortress of Morrath.'},
];
