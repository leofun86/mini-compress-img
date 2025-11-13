/* 
  imgCompress Before/After Modal
  (c) 2025 Multi 86 – módulo propio sin dependencias externas
  Slider clásico con zoom y pan.
*/
(function(){
  const $ = sel => document.querySelector(sel);

  const overlay = $('#baOverlay');
  const modal = $('#baModal');
  const stage = $('#baStage');
  const imgBefore = $('#baImgBefore');
  const imgAfter  = $('#baImgAfter');
  const mask = $('#baMask');
  const handle = $('#baHandle');
  const btnClose = $('#baClose');
  const zoomIn = $('#zoomIn');
  const zoomOut = $('#zoomOut');
  const zoomValue = $('#zoomValue');
  const resetView = $('#resetView');

  const state = {
    scale: 1,
    minScale: 0.25,
    maxScale: 5,
    x: 0,
    y: 0,
    dragging:false,
    dragStartX:0,
    dragStartY:0,
    sliderX: 0.5, // 0..1
  };

  function setVisible(v){
    overlay.classList.toggle('hidden', !v);
  }

  function updateZoomUI(){
    zoomValue.textContent = Math.round(state.scale*100) + '%';
  }

  function applyTransform(){
    const t = `translate(${state.x}px, ${state.y}px) scale(${state.scale})`;
    imgBefore.style.transform = t;
    imgAfter.style.transform  = t;
  }

  function fitContain(){
    // centra y ajusta a contenedor
    state.scale = 1;
    state.x = state.y = 0;
    updateZoomUI();
    applyTransform();
    onResize();
  }

  function clamp(v,min,max){ return Math.max(min, Math.min(max,v)); }

  function onWheel(e){
    e.preventDefault();
    const delta = Math.sign(e.deltaY) * -0.1; // invertido: rueda arriba -> zoom in
    const prevScale = state.scale;
    state.scale = clamp(state.scale + delta, state.minScale, state.maxScale);

    // zoom alrededor del puntero
    const rect = stage.getBoundingClientRect();
    const cx = e.clientX - rect.left - rect.width/2 - state.x;
    const cy = e.clientY - rect.top  - rect.height/2 - state.y;
    state.x -= (cx * (state.scale/prevScale - 1));
    state.y -= (cy * (state.scale/prevScale - 1));

    updateZoomUI();
    applyTransform();
  }

  function onPointerDown(e){
    state.dragging = true;
    state.dragStartX = e.clientX - state.x;
    state.dragStartY = e.clientY - state.y;
    stage.setPointerCapture(e.pointerId || 1);
  }
  function onPointerMove(e){
    if(!state.dragging) return;
    state.x = e.clientX - state.dragStartX;
    state.y = e.clientY - state.dragStartY;
    applyTransform();
  }
  function onPointerUp(e){
    state.dragging = false;
    try{ stage.releasePointerCapture(e.pointerId || 1); }catch(_){}
  }

  function setSliderByClientX(clientX){
    const rect = stage.getBoundingClientRect();
    const x = clamp(clientX - rect.left, 0, rect.width);
    state.sliderX = x / rect.width;
    // clip after-image via mask width & handle pos
    mask.style.width = (state.sliderX * 100) + '%';
    handle.style.left = `calc(${state.sliderX*100}% - 1px)`;
  }

  function onResize(){
    // ensure images are centered; here we let CSS keep them centered with absolute inset 0 margin:auto
    // nothing else needed; slider kept as percentage
    setSliderByClientX(stage.getBoundingClientRect().left + stage.getBoundingClientRect().width * state.sliderX);
  }

  function open(opts){
    imgBefore.src = opts.beforeSrc;
    imgAfter.src  = opts.afterSrc;
    state.scale = 1; state.x = state.y = 0; state.sliderX = 0.5;
    updateZoomUI();
    applyTransform();
    setVisible(true);
    onResize();
  }

  function close(){
    setVisible(false);
  }

  // slider interactions
  let draggingSlider = false;
  function onHandleDown(e){
    e.preventDefault();
    draggingSlider = true;
    document.addEventListener('mousemove', onHandleMove);
    document.addEventListener('mouseup', onHandleUp);
  }
  function onHandleMove(e){
    if(!draggingSlider) return;
    setSliderByClientX(e.clientX);
  }
  function onHandleUp(){
    draggingSlider = false;
    document.removeEventListener('mousemove', onHandleMove);
    document.removeEventListener('mouseup', onHandleUp);
  }
  stage.addEventListener('click', (e)=>{
    // click on stage moves slider too
    if(e.target === stage || e.target === imgBefore || e.target === imgAfter){
      setSliderByClientX(e.clientX);
    }
  });

  // keyboard on handle
  handle.addEventListener('keydown', (e)=>{
    if(e.key === 'ArrowLeft'){ state.sliderX = clamp(state.sliderX - 0.02, 0, 1); onResize(); }
    if(e.key === 'ArrowRight'){ state.sliderX = clamp(state.sliderX + 0.02, 0, 1); onResize(); }
  });

  // zoom controls
  zoomIn.addEventListener('click', ()=>{ state.scale = clamp(state.scale+0.1,state.minScale,state.maxScale); updateZoomUI(); applyTransform(); });
  zoomOut.addEventListener('click', ()=>{ state.scale = clamp(state.scale-0.1,state.minScale,state.maxScale); updateZoomUI(); applyTransform(); });
  resetView.addEventListener('click', ()=> fitContain());

  // stage events
  stage.addEventListener('wheel', onWheel, {passive:false});
  stage.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('resize', onResize);

  btnClose.addEventListener('click', close);
  overlay.addEventListener('click', (e)=>{ if(e.target === overlay) close(); });

  handle.addEventListener('mousedown', onHandleDown);

  window.imgCompressBeforeAfter = { open, close };
})();
