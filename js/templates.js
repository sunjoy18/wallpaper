/* ============================================================
   Template data model
   Canvas working space is 0–100 (x,y,w,h) as % of a 1170×2532
   portrait lock-screen. Slots are photo placeholders; stickers
   are optional emoji/text decorations baked into the template.
   ============================================================ */

const CATEGORIES = ["Couple","Friends","Family","Travel","Scrapbook","Polaroid","Minimal","Y2K"];

const PALETTES = {
  Couple:    [["#2b1320","#5c1f36"], ["#3a1220","#7a2f45"], ["#241221","#4d2350"]],
  Friends:   [["#101a2b","#274a72"], ["#131b12","#2e5330"], ["#1c1408","#5a3a10"]],
  Family:    [["#171308","#4a3410"], ["#0f1a17","#245144"], ["#1a1512","#4c3a2c"]],
  Travel:    [["#08151f","#0f4c63"], ["#0c1a12","#1f5c3a"], ["#151022","#3a2a63"]],
  Scrapbook: [["#241a0e","#6b4a1e"], ["#1c1414","#5c2f2f"], ["#141a10","#3c5222"]],
  Polaroid:  [["#0e0e0e","#2c2c2c"], ["#14100c","#3d2f1e"], ["#0c1014","#233042"]],
  Minimal:   [["#0b0b0d","#1c1c20"], ["#0a0e0c","#1a221d"], ["#0d0b10","#211c28"]],
  Y2K:       [["#1a0a2e","#6a1b8e"], ["#0a1a2e","#1b6a8e"], ["#2e0a1a","#8e1b4a"]]
};

function rot(min,max){ return Math.round((min + Math.random()*(max-min))*10)/10; }
function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

/* ---------- Layout archetypes: return array of slots {x,y,w,h,r} ---------- */
const ARCHETYPES = {
  heart(n=9){
    // photo-mosaic heart, echoes classic collage lock screens
    const base = [
      {x:30,y:40,w:16,h:12},{x:47,y:38,w:16,h:12},
      {x:19,y:48,w:15,h:12},{x:60,y:47,w:15,h:12},
      {x:14,y:58,w:15,h:13},{x:66,y:57,w:15,h:13},
      {x:29,y:59,w:19,h:16},{x:45,y:60,w:19,h:16},
      {x:36,y:74,w:22,h:15}
    ];
    return base.map(s=>({...s, r: rot(-6,6)}));
  },
  gridStrict(n=4){
    const cols = n<=4?2:3; const rows = Math.ceil(n/cols);
    const gap=3, top=14, bottom=6;
    const w=(100-gap*(cols+1))/cols, h=(100-top-bottom-gap*(rows-1))/rows;
    const slots=[];
    for(let i=0;i<n;i++){
      const c=i%cols, rIdx=Math.floor(i/cols);
      slots.push({x:gap+c*(w+gap), y:top+rIdx*(h+gap), w, h, r:0});
    }
    return slots;
  },
  filmStrip(n=6){
    const top=10,bottom=6, gap=2.5;
    const h=(100-top-bottom-gap*(n-1))/n;
    const slots=[];
    for(let i=0;i<n;i++) slots.push({x:12,y:top+i*(h+gap),w:76,h,r:rot(-1.5,1.5)});
    return slots;
  },
  scatterPolaroid(n=6){
    const anchors = [
      {x:10,y:20},{x:52,y:16},{x:14,y:44},{x:56,y:42},{x:8,y:68},{x:50,y:66}
    ];
    return anchors.slice(0,n).map(a=>({x:a.x,y:a.y,w:38,h:26,r:rot(-10,10)}));
  },
  singleHero(){
    return [{x:8,y:18,w:84,h:64,r:0}];
  },
  splitDiagonal(){
    return [
      {x:0,y:12,w:100,h:44,r:-3},
      {x:0,y:54,w:100,h:40,r:2}
    ];
  },
  mosaicCluster(n=7){
    const base=[
      {x:10,y:16,w:34,h:22},{x:48,y:14,w:42,h:16},
      {x:10,y:42,w:20,h:30},{x:34,y:40,w:28,h:18},
      {x:34,y:60,w:28,h:20},{x:66,y:34,w:24,h:24},
      {x:64,y:62,w:26,h:20}
    ];
    return base.slice(0,n).map(s=>({...s,r:rot(-3,3)}));
  },
  archFrame(){
    return [{x:16,y:16,w:68,h:56,r:0}];
  },
  circleCluster(n=5){
    const anchors=[{x:38,y:20},{x:14,y:40},{x:62,y:38},{x:22,y:64},{x:56,y:64}];
    return anchors.slice(0,n).map(a=>({x:a.x,y:a.y,w:32,h:16,r:0,circle:true}));
  },
  stackedStory(n=3){
    const top=16,gap=3; const h=(100-top-8-gap*(n-1))/n;
    const slots=[];
    for(let i=0;i<n;i++) slots.push({x:9,y:top+i*(h+gap),w:82,h,r:0});
    return slots;
  }
};

const ARCH_KEYS = Object.keys(ARCHETYPES);

const STICKER_SETS = {
  Couple: ["♡","✦","˚⋆"], Friends: ["✌️","★","˖"], Family: ["✦","❀","˚"],
  Travel: ["✈","☀","˚⋆"], Scrapbook: ["✂","☆","♡"], Polaroid: ["˚","✦",""],
  Minimal: ["·","˚",""], Y2K: ["✧","☆","♥"]
};

function slugName(cat, arch, i){
  const words = {
    heart:"Heart Mosaic", gridStrict:"Grid Frame", filmStrip:"Film Strip",
    scatterPolaroid:"Scattered Polaroids", singleHero:"Full Bleed",
    splitDiagonal:"Diagonal Split", mosaicCluster:"Mosaic Cluster",
    archFrame:"Arch Frame", circleCluster:"Circle Cluster", stackedStory:"Story Stack"
  };
  return `${cat} ${words[arch]}${i>1?` ${i}`:""}`;
}

function buildTemplates(){
  const templates = [];
  let id = 1;
  CATEGORIES.forEach((cat) => {
    // 6 templates per category cycling distinct archetypes, ~48 total, pad to 50
    const archOrder = [...ARCH_KEYS].sort(()=>Math.random()-0.5).slice(0,6);
    archOrder.forEach((arch, idx) => {
      const fn = ARCHETYPES[arch];
      const slots = fn();
      const palette = pick(PALETTES[cat]);
      templates.push({
        id: `tpl_${id++}`,
        name: slugName(cat, arch, 1),
        category: cat,
        archetype: arch,
        gradient: palette,
        slots,
        sticker: pick(STICKER_SETS[cat]),
        slotCount: slots.length
      });
    });
  });
  // pad/trim to exactly 50
  while (templates.length < 50) {
    const cat = pick(CATEGORIES);
    const arch = pick(ARCH_KEYS);
    const slots = ARCHETYPES[arch]();
    templates.push({
      id: `tpl_${id++}`, name: slugName(cat, arch, 2), category: cat, archetype: arch,
      gradient: pick(PALETTES[cat]), slots, sticker: pick(STICKER_SETS[cat]), slotCount: slots.length
    });
  }
  return templates.slice(0,50);
}

const TEMPLATES = buildTemplates();
