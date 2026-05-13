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

// Tap zones mapped to the composite city.jpg image (% of image width/height)
// Each zone is a clickable region over the matching building in the scene
// Refined for better alignment with visible structures and mobile tap confidence

const CITY_ZONES=[
  {id:'citadel',   label:'Citadel',    x:10, y:2,  w:28, h:35},  // Central castle, larger for prominence
  {id:'tower',     label:'Mage Tower', x:58, y:1,  w:24, h:32},  // Tall tower on the right
  {id:'barracks',  label:'Barracks',   x:25, y:18, w:30, h:32},  // Military compound in center-left
  {id:'farm',      label:'Farm',       x:1,  y:25, w:22, h:28},  // Farmland on the left
  {id:'lumber',    label:'Lumber',     x:65, y:23, w:26, h:28},  // Forest mill on the right
  {id:'mine',      label:'Quarry',     x:4,  y:45, w:26, h:28},  // Quarry in lower left
  {id:'market',    label:'Market',     x:58, y:50, w:30, h:28},  // Marketplace in town center
  {id:'ironworks', label:'Foundry',    x:30, y:58, w:28, h:26},  // Forge in lower center
  {id:'hospital',  label:'Hospital',   x:36, y:38, w:26, h:26},  // Medical building in mid-center
];
