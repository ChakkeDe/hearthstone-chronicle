// Progression, victory, and season configuration.
const VICTORY_PATHS={
  military:{label:'Military Dominance',icon:'⚔',desc:'Win through conquest. Research all military branches.',bonus:40,
    check:()=>['swordsmanship','fortification','cavalry','siegecraft'].every(id=>G.research[id]?.completed)},
  economic:{label:'Economic Supremacy',icon:'⚖',desc:'Amass wealth. Complete all economy research.',bonus:40,
    check:()=>['trade_routes','crop_rotation','stonemasons','banking'].every(id=>G.research[id]?.completed)},
  diplomatic:{label:'Diplomatic Legacy',icon:'🤝',desc:'Men of the West unique. Complete all diplomacy research.',bonus:40,
    check:()=>['envoys','treaties','trade_alliance','high_council'].every(id=>G.research[id]?.completed)},
  research:{label:'Arcane Mastery',icon:'✨',desc:'Master the arcane. Complete all arcane research.',bonus:40,
    check:()=>['runic_script','warding','alchemy','farseeing'].every(id=>G.research[id]?.completed)},
};

const PRESTIGE_ABILITIES=[
  {id:'vassal_tribute',name:'Call for Tribute',icon:'👑',cost:50,desc:'Demand tribute from vassal lords. +200 gold instantly.',
   cooldown:300,lastUsed:0,
   use:()=>{G.resources.gold.amount=Math.min(G.resources.gold.max,G.resources.gold.amount+200);addLog('Vassal lords deliver tribute. +200 gold.','important');}},
  {id:'rally_workers',name:'Rally the People',icon:'🔔',cost:80,desc:'Inspire workers. 2× all resource income for 2 minutes.',
   cooldown:600,lastUsed:0,
   use:()=>{G._rallied=true;G._rallyEnd=G.tick+120;addLog('The people rally to your banner! 2× income for 2 minutes.','important');}},
  {id:'royal_decree',name:'Royal Decree',icon:'📜',cost:120,desc:'Issue a decree. Instantly complete current research.',
   cooldown:1800,lastUsed:0,
   use:()=>{if(!G.activeResearch){showSnot('No research active');return;}const rDef=allR().find(r=>r.id===G.activeResearch);if(rDef)completeResearch(rDef);addLog('A Royal Decree accelerates all scholarly work.','important');}},
  {id:'diplomatic_mission',name:'Diplomatic Mission',icon:'🤝',cost:150,desc:'Send envoys abroad. Unlock Diplomacy research tab early.',
   cooldown:3600,lastUsed:0,
   use:()=>{unlockTab('diplomacy');revealR(['envoys']);addLog('Royal envoys depart for distant kingdoms.','important');}},
];

const SEASON_WEEKS=6;
const TICKS_PER_WEEK=360; // 6 real minutes per in-game week for prototype (would be 7 days in production)
