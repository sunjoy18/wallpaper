/* ============================================================
   Aftertone — app.js
   Navigation + gallery rendering + fabric.js editor + preview/export
   ============================================================ */

const STICKERS = ["❤","✦","✌️","🌙","☀️","✈️","🌸","⭐","💫","👑","🦋","☁️","🍒","🔥","♡","˚⋆"];
const BG_SWATCHES = [
  ["#2b1320","#5c1f36"], ["#08151f","#0f4c63"], ["#171308","#4a3410"],
  ["#0b0b0d","#1c1c20"], ["#1a0a2e","#6a1b8e"], ["#101a2b","#274a72"],
  ["#141a10","#3c5222"], ["#241a0e","#6b4a1e"]
];
const FILTERS = ["None","Mono","Warm","Cool","Fade","Noir"];
const CLOCK_STYLES = [
  {id:"classic", label:"Classic", font:"'Fraunces', serif", weight:600, size:"3.6rem"},
  {id:"minimal", label:"Minimal", font:"'Inter', sans-serif", weight:300, size:"2.6rem"},
  {id:"mono",    label:"Mono",    font:"'Courier New', monospace", weight:700, size:"3rem"},
  {id:"bold",    label:"Bold",    font:"'Inter', sans-serif", weight:800, size:"4rem"}
];

const state = {
  view: "home",
  activeCategory: "All",
  activeGalleryCategory: "All",
  searchTerm: "",
  device: "iphone",
  clockStyle: "classic",
  photos: [],        // {id, src}
  canvas: null,
  currentTemplate: null,
  selectedEmptySlot: null
};

const CANVAS_W = 390, CANVAS_H = 844;

/* ---------------- navigation ---------------- */
function navigate(view){
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  document.getElementById("view-"+view).classList.add("active");
  state.view = view;
  window.scrollTo({top:0, behavior:"instant"});

  if(view === "editor" && !state.canvas){ initEditor(); }
  if(view === "editor" && !state.currentTemplate){ loadTemplate(TEMPLATES[0]); }
  if(view === "preview"){ renderPreview(); startClockTick(); }
  else { stopClockTick(); }
}
document.querySelectorAll("[data-nav]").forEach(btn=>{
  btn.addEventListener("click", ()=> navigate(btn.dataset.nav));
});

/* ---------------- toast ---------------- */
let toastTimer;
function toast(msg){
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> el.classList.remove("show"), 2600);
}

/* ---------------- category chips ---------------- */
function renderChips(container, onSelect, activeKey){
  container.innerHTML = "";
  ["All", ...CATEGORIES].forEach(cat=>{
    const chip = document.createElement("button");
    chip.className = "chip" + (cat===activeKey ? " active":"");
    chip.textContent = cat;
    chip.addEventListener("click", ()=>{
      container.querySelectorAll(".chip").forEach(c=>c.classList.remove("active"));
      chip.classList.add("active");
      onSelect(cat);
    });
    container.appendChild(chip);
  });
}
renderChips(document.getElementById("homeCategoryChips"), (cat)=>{
  state.activeGalleryCategory = cat;
  navigate("gallery");
  renderChips(document.getElementById("galleryCategoryChips"), (c)=>{state.activeGalleryCategory=c; renderTemplateGrid();}, cat);
  renderTemplateGrid();
}, "All");
renderChips(document.getElementById("galleryCategoryChips"), (cat)=>{
  state.activeGalleryCategory = cat;
  renderTemplateGrid();
}, "All");

document.getElementById("searchInput").addEventListener("input", (e)=>{
  state.searchTerm = e.target.value.trim().toLowerCase();
  renderTemplateGrid();
});

/* ---------------- template thumbnail ---------------- */
function buildThumb(tpl, small=true){
  const thumb = document.createElement("div");
  thumb.className = "tpl-thumb";
  thumb.style.background = `linear-gradient(160deg, ${tpl.gradient[0]}, ${tpl.gradient[1]})`;

  const clock = document.createElement("div");
  clock.className = "tpl-clockmark";
  clock.textContent = "9:41";
  thumb.appendChild(clock);

  tpl.slots.forEach(s=>{
    const el = document.createElement("div");
    el.className = "tpl-slot" + (s.circle ? " circle":"");
    el.style.left = s.x+"%"; el.style.top = s.y+"%";
    el.style.width = s.w+"%"; el.style.height = s.h+"%";
    el.style.transform = `rotate(${s.r||0}deg)`;
    thumb.appendChild(el);
  });

  const sticker = document.createElement("div");
  sticker.style.position="absolute"; sticker.style.right="8%"; sticker.style.bottom="6%";
  sticker.style.fontSize="1.1rem"; sticker.style.opacity="0.8";
  sticker.textContent = tpl.sticker;
  thumb.appendChild(sticker);

  return thumb;
}

function renderTemplateGrid(){
  const grid = document.getElementById("templateGrid");
  grid.innerHTML = "";
  const list = TEMPLATES.filter(t=>{
    const matchesCat = state.activeGalleryCategory==="All" || t.category===state.activeGalleryCategory;
    const matchesSearch = !state.searchTerm ||
      t.name.toLowerCase().includes(state.searchTerm) ||
      t.category.toLowerCase().includes(state.searchTerm) ||
      t.archetype.toLowerCase().includes(state.searchTerm);
    return matchesCat && matchesSearch;
  });
  if(list.length===0){
    grid.innerHTML = `<p style="color:var(--muted); grid-column:1/-1;">No templates match “${state.searchTerm}”. Try another mood or keyword.</p>`;
    return;
  }
  list.forEach(tpl=>{
    const card = document.createElement("div");
    card.className = "tpl-card";
    card.appendChild(buildThumb(tpl));

    const recreate = document.createElement("button");
    recreate.className = "recreate-btn";
    recreate.textContent = "Recreate this";
    recreate.addEventListener("click", (e)=>{
      e.stopPropagation();
      navigate("editor");
      loadTemplate(tpl);
      toast(`Loaded “${tpl.name}” — start uploading photos`);
    });
    card.querySelector(".tpl-thumb").appendChild(recreate);

    const meta = document.createElement("div");
    meta.className = "tpl-meta";
    meta.innerHTML = `<h4>${tpl.name}</h4><span>${tpl.slotCount} photo${tpl.slotCount>1?"s":""}</span>`;
    card.appendChild(meta);

    card.addEventListener("click", ()=>{
      navigate("editor");
      loadTemplate(tpl);
      toast(`Loaded “${tpl.name}” — start uploading photos`);
    });
    grid.appendChild(card);
  });
}
renderTemplateGrid();

/* ---------------- hero mock phone ---------------- */
(function heroPhone(){
  const tpl = TEMPLATES.find(t=>t.archetype==="heart") || TEMPLATES[0];
  const thumb = buildThumb(tpl);
  thumb.style.width="100%"; thumb.style.height="100%"; thumb.style.aspectRatio="auto";
  document.getElementById("heroPhone").appendChild(thumb);
})();

/* ================= EDITOR ================= */
function initEditor(){
  const canvasEl = document.getElementById("editorCanvas");
  const canvas = new fabric.Canvas(canvasEl, {
    width: CANVAS_W, height: CANVAS_H, selection:true, preserveObjectStacking:true
  });
  state.canvas = canvas;

  canvas.on("selection:created", updateObjectPanel);
  canvas.on("selection:updated", updateObjectPanel);
  canvas.on("selection:cleared", ()=> document.getElementById("objectGroup").hidden = true);

  // background swatches
  const bgWrap = document.getElementById("bgSwatches");
  BG_SWATCHES.forEach((pair,i)=>{
    const sw = document.createElement("div");
    sw.className = "swatch" + (i===0 ? " active":"");
    sw.style.background = `linear-gradient(160deg, ${pair[0]}, ${pair[1]})`;
    sw.addEventListener("click", ()=>{
      bgWrap.querySelectorAll(".swatch").forEach(s=>s.classList.remove("active"));
      sw.classList.add("active");
      setCanvasBackground(pair);
    });
    bgWrap.appendChild(sw);
  });

  // sticker picker
  const stickerWrap = document.getElementById("stickerPicker");
  stickerWrap.style.display = "none";
  STICKERS.forEach(s=>{
    const b = document.createElement("div");
    b.className = "sticker-opt";
    b.textContent = s;
    b.addEventListener("click", ()=> addSticker(s));
    stickerWrap.appendChild(b);
  });
  document.getElementById("addStickerBtn").addEventListener("click", ()=>{
    stickerWrap.style.display = stickerWrap.style.display==="none" ? "flex":"none";
  });
  document.getElementById("addTextBtn").addEventListener("click", addText);

  // filter row
  const filterRow = document.getElementById("filterRow");
  FILTERS.forEach((f,i)=>{
    const chip = document.createElement("div");
    chip.className = "filter-chip" + (i===0?" active":"");
    chip.textContent = f;
    chip.addEventListener("click", ()=>{
      filterRow.querySelectorAll(".filter-chip").forEach(c=>c.classList.remove("active"));
      chip.classList.add("active");
      applyFilterToSelected(f);
    });
    filterRow.appendChild(chip);
  });

  // object controls
  document.getElementById("scaleRange").addEventListener("input", (e)=>{
    const obj = canvas.getActiveObject(); if(!obj) return;
    const v = e.target.value/100;
    obj.set({scaleX: obj._baseScaleX*v, scaleY: obj._baseScaleY*v});
    canvas.renderAll();
  });
  document.getElementById("rotateRange").addEventListener("input", (e)=>{
    const obj = canvas.getActiveObject(); if(!obj) return;
    obj.rotate(Number(e.target.value));
    canvas.renderAll();
  });
  document.getElementById("deleteObjBtn").addEventListener("click", ()=>{
    const obj = canvas.getActiveObject(); if(!obj) return;
    canvas.remove(obj);
    document.getElementById("objectGroup").hidden = true;
  });

  // upload
  const fileInput = document.getElementById("fileInput");
  const dropZone = document.getElementById("uploadDrop");
  dropZone.addEventListener("click", ()=> fileInput.click());
  fileInput.addEventListener("change", (e)=> handleFiles(e.target.files));
  ["dragenter","dragover"].forEach(ev=> dropZone.addEventListener(ev, e=>{e.preventDefault(); dropZone.classList.add("dragover");}));
  ["dragleave","drop"].forEach(ev=> dropZone.addEventListener(ev, e=>{e.preventDefault(); dropZone.classList.remove("dragover");}));
  dropZone.addEventListener("drop", e=> handleFiles(e.dataTransfer.files));

  // drag photo from tray onto canvas
  const frame = document.getElementById("canvasFrame");
  frame.addEventListener("dragover", e=> e.preventDefault());
  frame.addEventListener("drop", e=>{
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    const photo = state.photos.find(p=>p.id===id);
    if(!photo) return;
    const rect = canvasEl.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width * CANVAS_W;
    const py = (e.clientY - rect.top) / rect.height * CANVAS_H;
    const target = findSlotAtPoint(px,py) || findFirstEmptySlot();
    if(target) fillSlot(target, photo.src);
    else addFreeImage(photo.src);
  });

  // device toggle (editor)
  document.querySelectorAll('#view-editor .seg').forEach(seg=>{
    seg.addEventListener("click", ()=> setDevice(seg.dataset.device, "#view-editor"));
  });
  document.querySelectorAll('#view-preview .seg').forEach(seg=>{
    seg.addEventListener("click", ()=> setDevice(seg.dataset.device, "#view-preview"));
  });

  // clock style swatches
  const clockWrap = document.getElementById("clockStyles");
  CLOCK_STYLES.forEach((cs,i)=>{
    const sw = document.createElement("div");
    sw.className = "swatch" + (i===0?" active":"");
    sw.style.background = "var(--surface-2)";
    sw.style.display="flex"; sw.style.alignItems="center"; sw.style.justifyContent="center";
    sw.style.fontSize="0.6rem"; sw.style.color="var(--text)"; sw.style.fontFamily=cs.font;
    sw.textContent = "Aa";
    sw.title = cs.label;
    sw.addEventListener("click", ()=>{
      clockWrap.querySelectorAll(".swatch").forEach(s=>s.classList.remove("active"));
      sw.classList.add("active");
      state.clockStyle = cs.id;
      applyClockStyle();
    });
    clockWrap.appendChild(sw);
  });
}

function setDevice(device, scope){
  state.device = device;
  document.querySelectorAll(scope+' .seg').forEach(s=> s.classList.toggle("active", s.dataset.device===device));
  const frame = document.getElementById("canvasFrame");
  const pPhone = document.getElementById("previewPhone");
  [frame,pPhone].forEach(el=>{
    if(!el) return;
    el.style.borderRadius = device==="android" ? "20px" : "";
  });
  const notch = document.querySelector(".preview-notch");
  if(notch) notch.style.display = device==="android" ? "none" : "block";
}

function applyClockStyle(){
  const cs = CLOCK_STYLES.find(c=>c.id===state.clockStyle);
  const t = document.querySelector(".pc-time");
  t.style.fontFamily = cs.font; t.style.fontWeight = cs.weight; t.style.fontSize = cs.size;
}

function setCanvasBackground(pair){
  const canvas = state.canvas;
  const grad = new fabric.Gradient({
    type:"linear",
    coords:{x1:0,y1:0,x2:0,y2:CANVAS_H},
    colorStops:[{offset:0,color:pair[0]},{offset:1,color:pair[1]}]
  });
  canvas.setBackgroundColor(grad, canvas.renderAll.bind(canvas));
}

function loadTemplate(tpl){
  const canvas = state.canvas;
  if(!canvas) return;
  canvas.clear();
  state.currentTemplate = tpl;
  setCanvasBackground(tpl.gradient);

  tpl.slots.forEach((s, idx)=>{
    const w = s.w/100*CANVAS_W, h = s.h/100*CANVAS_H;
    const left = (s.x/100*CANVAS_W) + w/2;
    const top = (s.y/100*CANVAS_H) + h/2;
    let rect;
    if(s.circle){
      rect = new fabric.Ellipse({rx:w/2, ry:h/2, left, top, angle:s.r||0});
    } else {
      rect = new fabric.Rect({width:w, height:h, rx:10, ry:10, left, top, angle:s.r||0});
    }
    rect.set({
      originX:"center", originY:"center",
      fill:"rgba(255,255,255,0.14)", stroke:"rgba(255,255,255,0.4)",
      strokeDashArray:[6,6], strokeWidth:1.5,
      isSlot:true, filled:false, slotIndex:idx, slotShape: s.circle?"circle":"rect",
      cornerColor:"#FF5C8A", cornerStyle:"circle", transparentCorners:false, borderColor:"#8B7CFF"
    });
    canvas.add(rect);
  });

  // sticker decoration baked as a light suggestion
  canvas.renderAll();
}

/* ---------- slot helpers ---------- */
function findFirstEmptySlot(){
  return state.canvas.getObjects().find(o=> o.isSlot && !o.filled);
}
function findSlotAtPoint(px,py){
  const objs = state.canvas.getObjects().filter(o=>o.isSlot && !o.filled);
  return objs.find(o=> o.containsPoint(new fabric.Point(px,py)));
}

function fillSlot(slot, src){
  // Claim this slot synchronously, before the image has even started
  // loading, so a second upload firing moments later can't grab the
  // same still-unfilled slot while this one is mid-flight.
  slot.filled = true;

  fabric.Image.fromURL(src, (img)=>{
    if(!img || !img.width){
      toast("That photo couldn't be loaded — try a different file");
      slot.filled = false;
      return;
    }
    const sw = slot.width * slot.scaleX, sh = slot.height * slot.scaleY;
    const scale = Math.max(sw/img.width, sh/img.height);
    img.set({originX:"center", originY:"center", left:0, top:0});
    img.scale(scale);

    // clipPath is nested inside the image's own transform, so it gets
    // multiplied by the image's scale too. Since `scale` shrinks a
    // full-resolution photo down a lot, we have to size the clip in
    // the image's *local* (pre-scale) units — dividing by scale here —
    // so the crop comes out at the slot's actual on-screen size
    // instead of shrinking along with the photo.
    let clip;
    if(slot.slotShape==="circle"){
      clip = new fabric.Ellipse({rx:(sw/2)/scale, ry:(sh/2)/scale, originX:"center", originY:"center"});
    } else {
      clip = new fabric.Rect({width:sw/scale, height:sh/scale, rx:10/scale, ry:10/scale, originX:"center", originY:"center"});
    }
    img.clipPath = clip;

    const group = new fabric.Group([img], {
      left: slot.left, top: slot.top, angle: slot.angle,
      originX:"center", originY:"center",
      cornerColor:"#FF5C8A", cornerStyle:"circle", transparentCorners:false, borderColor:"#8B7CFF"
    });
    group.isPhotoSlot = true;
    // The group's auto-computed bounding box comes from the image's
    // full (unclipped) scaled size, which overshoots the visible crop
    // in whichever axis "cover" fit overflows. Pin it to the actual
    // slot size so the selection handles hug what's really visible.
    group.set({width: sw, height: sh});
    group._baseScaleX = group.scaleX; group._baseScaleY = group.scaleY;

    // The slot may already have been removed from the canvas (e.g. if
    // it was somehow filled twice); guard indexOf so we never insert
    // at a bogus -1 index.
    const idx = state.canvas.getObjects().indexOf(slot);
    if(idx > -1){
      state.canvas.remove(slot);
      state.canvas.insertAt(group, idx, false);
    } else {
      state.canvas.add(group);
    }
    state.canvas.setActiveObject(group);
    state.canvas.renderAll();
  });
}

function addFreeImage(src){
  fabric.Image.fromURL(src, (img)=>{
    if(!img || !img.width){
      toast("That photo couldn't be loaded — try a different file");
      return;
    }
    img.scaleToWidth(CANVAS_W*0.55);
    img.set({left: CANVAS_W/2, top: CANVAS_H/2, originX:"center", originY:"center",
      cornerColor:"#FF5C8A", cornerStyle:"circle", transparentCorners:false, borderColor:"#8B7CFF"});
    img._baseScaleX = img.scaleX; img._baseScaleY = img.scaleY;
    state.canvas.add(img);
    state.canvas.setActiveObject(img);
    state.canvas.renderAll();
  });
}

function addText(){
  const t = new fabric.IText("Your text here", {
    left: CANVAS_W/2, top: CANVAS_H*0.85, originX:"center", originY:"center",
    fill:"#F5F1FA", fontFamily:"Fraunces, serif", fontSize:34, fontWeight:500,
    cornerColor:"#FF5C8A", cornerStyle:"circle", transparentCorners:false, borderColor:"#8B7CFF"
  });
  t._baseScaleX = 1; t._baseScaleY = 1;
  state.canvas.add(t);
  state.canvas.setActiveObject(t);
  state.canvas.renderAll();
}

function addSticker(emoji){
  const t = new fabric.Text(emoji, {
    left: CANVAS_W/2, top: CANVAS_H*0.3, originX:"center", originY:"center",
    fontSize:52, cornerColor:"#FF5C8A", cornerStyle:"circle", transparentCorners:false, borderColor:"#8B7CFF"
  });
  t._baseScaleX = 1; t._baseScaleY = 1;
  state.canvas.add(t);
  state.canvas.setActiveObject(t);
  state.canvas.renderAll();
}

function updateObjectPanel(e){
  const obj = state.canvas.getActiveObject();
  const panel = document.getElementById("objectGroup");
  if(!obj || obj.isSlot){ panel.hidden = true; return; }
  panel.hidden = false;
  if(obj._baseScaleX === undefined){ obj._baseScaleX = obj.scaleX; obj._baseScaleY = obj.scaleY; }
  document.getElementById("scaleRange").value = 100;
  document.getElementById("rotateRange").value = Math.round(obj.angle||0);

  document.getElementById("filterGroup").style.opacity = obj.isPhotoSlot ? 1 : 0.35;
  document.getElementById("filterGroup").style.pointerEvents = obj.isPhotoSlot ? "auto" : "none";
}

function applyFilterToSelected(name){
  const obj = state.canvas.getActiveObject();
  if(!obj || !obj.isPhotoSlot) { if(obj && !obj.isPhotoSlot) toast("Select a photo to apply a filter"); return; }
  const img = obj._objects ? obj._objects[0] : obj;
  const map = {
    None: [],
    Mono: [new fabric.Image.filters.Grayscale()],
    Warm: [new fabric.Image.filters.Sepia(), new fabric.Image.filters.Brightness({brightness:0.04})],
    Cool: [new fabric.Image.filters.Brightness({brightness:0.02}), new fabric.Image.filters.Contrast({contrast:0.08})],
    Fade: [new fabric.Image.filters.Brightness({brightness:0.1}), new fabric.Image.filters.Saturation({saturation:-0.35})],
    Noir: [new fabric.Image.filters.Grayscale(), new fabric.Image.filters.Contrast({contrast:0.2})]
  };
  img.filters = map[name] || [];
  img.applyFilters();
  state.canvas.renderAll();
}

/* ---------- upload handling ---------- */
function handleFiles(fileList){
  [...fileList].forEach(file=>{
    if(!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e)=>{
      const id = "p"+Date.now()+Math.random().toString(36).slice(2,7);
      const photo = {id, src:e.target.result};
      state.photos.push(photo);
      renderTray();
      // auto-fill first empty slot for a fast happy path
      const slot = findFirstEmptySlot();
      if(slot) fillSlot(slot, photo.src);
      else toast("Photo added — drag it onto the canvas to place it");
    };
    reader.readAsDataURL(file);
  });
}

function renderTray(){
  const tray = document.getElementById("photoTray");
  tray.innerHTML = "";
  state.photos.forEach(p=>{
    const el = document.createElement("div");
    el.className = "tray-thumb";
    el.style.backgroundImage = `url(${p.src})`;
    el.draggable = true;
    el.addEventListener("dragstart", (e)=> e.dataTransfer.setData("text/plain", p.id));
    el.addEventListener("click", ()=>{
      const slot = findFirstEmptySlot();
      if(slot) fillSlot(slot, p.src); else addFreeImage(p.src);
    });
    tray.appendChild(el);
  });
}

/* ================= PREVIEW ================= */
let clockInterval;
function startClockTick(){
  updateClockText();
  clockInterval = setInterval(updateClockText, 1000);
}
function stopClockTick(){ clearInterval(clockInterval); }
function updateClockText(){
  const now = new Date();
  const time = now.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit", hour12:false});
  const date = now.toLocaleDateString([], {weekday:"long", day:"numeric", month:"long"});
  const t = document.querySelector(".pc-time"); const d = document.querySelector(".pc-date");
  if(t) t.textContent = time;
  if(d) d.textContent = date;
}

function renderPreview(){
  if(!state.canvas) return;
  const dataUrl = state.canvas.toDataURL({format:"png", multiplier:2});
  document.getElementById("previewImage").src = dataUrl;
  applyClockStyle();
  setDevice(state.device, "#view-preview");
}

document.getElementById("downloadBtn").addEventListener("click", ()=>{
  if(!state.canvas) return;
  const multiplier = 1170/CANVAS_W;
  const dataUrl = state.canvas.toDataURL({format:"png", multiplier, quality:1});
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = "aftertone-lockscreen.png";
  a.click();
  toast("Downloaded in HD — set it as your lock screen ✦");
});

/* ---------------- init ---------------- */
navigate("home");
