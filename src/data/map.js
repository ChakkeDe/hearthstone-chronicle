// Kingdom map and city image overlay definitions.
const MAP_DEF=[
  {icon:'🏰',lbl:'Citadel',built:true},{icon:'⚔',lbl:'Barracks',id:'barracks'},
  {icon:'🌾',lbl:'Farmlands',id:'farm'},{icon:'🪵',lbl:'Mill',id:'lumber'},
  {icon:'⛰',lbl:'Quarry',id:'mine'},{icon:'⚖',lbl:'Market',id:'market'},
  {icon:'🔥',lbl:'Foundry',id:'ironworks'},{icon:'🗼',lbl:'Tower',id:'tower'},
  {icon:'🛤',lbl:'Roads'},{icon:'🌲',lbl:'Forest'},{icon:'🏔',lbl:'Highlands'},
  {icon:'🌊',lbl:'River'},{icon:'⛺',lbl:'Outpost'},{icon:'🗺',lbl:'Ruins'},{icon:'🌅',lbl:'Borderlands'},
];

// ── RESEARCH HELPERS ──

const BASE_URL='https://chakkede.github.io/hearthstone-chronicle/assets/';

// Tap zones mapped to the composite city.jpg image (% of image width/height)
// Each zone is a clickable region over the matching building in the scene

const CITY_ZONES=[
  {id:'citadel',   label:'Citadel',    x:13, y:5,  w:24, h:30},
  {id:'tower',     label:'Mage Tower', x:62, y:3,  w:20, h:28},
  {id:'barracks',  label:'Barracks',   x:28, y:22, w:26, h:28},
  {id:'farm',      label:'Farm',       x:1,  y:28, w:18, h:24},
  {id:'lumber',    label:'Lumber',     x:68, y:27, w:22, h:24},
  {id:'mine',      label:'Quarry',     x:7,  y:50, w:22, h:24},
  {id:'market',    label:'Market',     x:62, y:54, w:26, h:24},
  {id:'ironworks', label:'Foundry',    x:34, y:62, w:24, h:22},
  {id:'hospital',  label:'Hospital',   x:40, y:42, w:22, h:22},
];
