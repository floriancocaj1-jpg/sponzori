// Hamburger menu toggle
document.addEventListener('DOMContentLoaded', ()=>{
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  const menuLinks = document.querySelectorAll('.menu-list a');

  if(!hamburger || !mobileMenu) return;

  function toggleMenu(){
    const isOpen = mobileMenu.getAttribute('aria-hidden') === 'false';
    hamburger.classList.toggle('active', !isOpen);
    mobileMenu.setAttribute('aria-hidden', isOpen);
  }

  hamburger.addEventListener('click', toggleMenu);
  
  // Close menu when a link is clicked
  menuLinks.forEach(link=>{
    link.addEventListener('click', toggleMenu);
  });
});

// Modal behavior for sponsor form
document.addEventListener('DOMContentLoaded', ()=>{
  const openBtn = document.getElementById('become-sponsor');
  const modal = document.getElementById('sponsor-modal');
  const backdrop = document.getElementById('modal-backdrop');
  const closeBtn = document.getElementById('modal-close');
  const form = document.getElementById('sponsor-form');
  const result = document.getElementById('form-result');
  const resultClose = document.getElementById('result-close');
  const SHEET_ENDPOINT = 'https://script.google.com/macros/s/AKfycbymkL16PDgUJ-vLvzVIybdLtBQe8qV6LJymIg3bgLlU6YEsqPgd3LqmZD6rxMeAIXMd/exec';

  function showModal(){
    if(!modal) return;
    modal.setAttribute('aria-hidden','false');
    // trap focus (simple)
    document.body.style.overflow = 'hidden';
  }
  function hideModal(){
    if(!modal) return;
    modal.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
  }

  if(openBtn){
    openBtn.addEventListener('click', (e)=>{
      e.preventDefault();
      showModal();
    });
  }

  if(closeBtn) closeBtn.addEventListener('click', hideModal);
  if(backdrop) backdrop.addEventListener('click', hideModal);
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') hideModal(); });

  if(form){
    // Handle organization field visibility based on sponsorship level
    const levelSelect = form.querySelector('select[name="level"]');
    const orgInput = form.querySelector('input[name="organization"]');
    const organizationField = orgInput ? orgInput.closest('label') : null;
    
    if(levelSelect && organizationField){
      function updateOrgFieldVisibility(){
        const selectedLevel = levelSelect.value;
        // na mobilu/HR opcija za najmanje sponzorstvo: 'Podrška'
        if(selectedLevel === 'Podrška'){
          organizationField.style.display = 'none';
        } else {
          organizationField.style.display = 'flex';
        }
      }
      
      // Initial check
      updateOrgFieldVisibility();
      
      // Listen for changes
      levelSelect.addEventListener('change', updateOrgFieldVisibility);
    }

    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const data = new FormData(form);
      const submitBtn = form.querySelector('button[type="submit"]');
      const name = data.get('name')?.toString().trim();
      const email = data.get('email')?.toString().trim();
      if(!name || !email){
        alert('Unesite ime i e‑poštu.');
        return;
      }
      if(SHEET_ENDPOINT === 'PASTE_APPS_SCRIPT_URL_HERE'){
        alert('Nedostaje Google Sheets endpoint.');
        return;
      }
      try{
        if(submitBtn){
          submitBtn.disabled = true;
          submitBtn.style.display = 'none';
        }
        await fetch(SHEET_ENDPOINT, {
          method: 'POST',
          mode: 'no-cors',
          body: data
        });
        form.hidden = true;
        result.hidden = false;
      }catch(err){
        alert('Greska pri slanju. Pokusaj ponovo.');
      }
    });
  }

  if(resultClose) resultClose.addEventListener('click', ()=>{
    hideModal();
    if(form){
      const submitBtn = form.querySelector('button[type="submit"]');
      form.hidden=false;
      result.hidden=true;
      form.reset();
      if(submitBtn){
        submitBtn.disabled = false;
        submitBtn.style.display = '';
      }
    }
  });

  // Visibility / focus behavior:
  // - on fine-pointer (desktop/tablet) use IntersectionObserver -> `.visible` (hover remains for pointer devices)
  // - on coarse pointers / small screens use center-tracking -> `.centered` (card nearest viewport center)
  // Feature-detect hover capability and add a class so CSS can reliably target hover-capable desktops.
  // This helps on hybrid devices/browsers that misreport `(pointer: fine)`.
  (function detectFinePointer(){
    try{
      const mq = window.matchMedia && window.matchMedia('(pointer: fine) and (hover: hover)');
      const hasFine = (mq && mq.matches) || (navigator.maxTouchPoints === 0 && 'onmousemove' in window);
      document.documentElement.classList.toggle('has-hover', !!hasFine);
      // react to changes (e.g. docking/undocking or attach/detach of touch)
      if(mq && mq.addEventListener) mq.addEventListener('change', e => document.documentElement.classList.toggle('has-hover', !!e.matches));
      else if(mq && mq.addListener) mq.addListener(e => document.documentElement.classList.toggle('has-hover', !!e.matches));
      window.addEventListener('resize', () => {
        const now = window.matchMedia && window.matchMedia('(pointer: fine) and (hover: hover)').matches;
        document.documentElement.classList.toggle('has-hover', !!now);
      }, {passive:true});
    }catch(err){ /* silent fallback */ }
  })();

  const cards = Array.from(document.querySelectorAll('.partner-card'));
  // runtime: prevedi ponavljajuće placeholder-tekstove (npr. "Picture") — radi za sve instance
  document.querySelectorAll('.picture-placeholder').forEach(el => {
    if(el && el.textContent && el.textContent.trim().toLowerCase() === 'picture') el.textContent = 'Slika';
  });
  // Make partner cards keyboard-focusable for accessibility
  cards.forEach(c => { if(!c.hasAttribute('tabindex')) c.setAttribute('tabindex','0'); });
  const isCoarse = window.matchMedia('(pointer:coarse)').matches || window.matchMedia('(max-width:767px)').matches;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if(prefersReduced){
    // Respect reduced motion: show all without animations
    cards.forEach(c=>c.classList.add('visible'));
  } else if(!isCoarse && 'IntersectionObserver' in window && cards.length){
    // Desktop / tablet: keep existing IO behaviour
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(entry=>{
        entry.target.classList.toggle('visible', entry.isIntersecting);
      });
    },{threshold:0.35});
    cards.forEach(c=>io.observe(c));
  } else if(cards.length){
    // Mobile / touch: highlight the card closest to viewport center
    let rafId = null;
    function updateCentered(){
      rafId = null;
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      let best = {card: null, dist: Infinity};
      for(const card of cards){
        const r = card.getBoundingClientRect();
        // skip fully off-screen cards
        if(r.bottom < 0 || r.top > window.innerHeight) continue;
        const cardCx = r.left + r.width/2;
        const cardCy = r.top + r.height/2;
        const dx = cardCx - cx;
        const dy = cardCy - cy;
        const dist = Math.hypot(dx, dy);
        if(dist < best.dist){ best = {card, dist}; }
      }
      cards.forEach(c => c.classList.toggle('centered', c === best.card));
    }
    function scheduleUpdate(){ if(rafId) return; rafId = requestAnimationFrame(updateCentered); }

    // initial
    updateCentered();
    // update while scrolling / orientation changes
    ['scroll','resize','orientationchange','touchmove'].forEach(ev => window.addEventListener(ev, scheduleUpdate, {passive:true}));

    // allow tap to focus a card (friendly UX for swipe carousels)
    cards.forEach(card => {
      card.addEventListener('touchend', (e) => {
        // make tapped card centered (persist until next scroll)
        cards.forEach(c => c.classList.remove('centered'));
        card.classList.add('centered');
      }, {passive:true});

      // keyboard: Enter / Space centers the focused card (accessibility)
      card.addEventListener('keydown', (ev) => {
        if(ev.key === 'Enter' || ev.key === ' '){
          ev.preventDefault();
          cards.forEach(c => c.classList.remove('centered'));
          card.classList.add('centered');
          card.scrollIntoView({behavior: 'smooth', block: 'center'});
        }
      });
    });
  }

  // Marko Jack fly-through helper (used by multiple triggers)
  function getFlyer(){
    let flyer = document.getElementById('marko-jack-flyer');
    if(!flyer){
      flyer = document.createElement('img');
      flyer.id = 'marko-jack-flyer';
      flyer.className = 'marko-jack-flyer';
      flyer.alt = '';
      flyer.src = 'pictures/marko_jack.png';
      document.body.appendChild(flyer);
    }
    return flyer;
  }
  function triggerFly(){
    const flyer = getFlyer();
    flyer.classList.remove('fly');
    // restart animation
    void flyer.offsetWidth;
    flyer.classList.add('fly');
    flyer.addEventListener('animationend', () => {
      flyer.classList.remove('fly');
    }, {once:true});
  }

  // Gesture trigger anywhere: draw "4" then "A" (single-stroke each) to fly
  (function setupGestureTrigger(){
    const sequenceWindowMs = 10000;
    const minScore = 0.5;
    let lastGesture = null;
    let lastGestureAt = 0;

    let drawing = false;
    let activePointerId = null;
    let points = [];
    let usingTouch = false;

    function point(x,y){ return {x, y}; }
    function dist(a,b){ const dx=a.x-b.x, dy=a.y-b.y; return Math.hypot(dx,dy); }
    function pathLength(pts){ let d=0; for(let i=1;i<pts.length;i++) d+=dist(pts[i-1], pts[i]); return d; }
    function centroid(pts){
      let x=0,y=0; pts.forEach(p=>{x+=p.x; y+=p.y;});
      return point(x/pts.length, y/pts.length);
    }
    function boundingBox(pts){
      let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
      pts.forEach(p=>{ if(p.x<minX) minX=p.x; if(p.y<minY) minY=p.y; if(p.x>maxX) maxX=p.x; if(p.y>maxY) maxY=p.y; });
      return {minX,minY,maxX,maxY,width:maxX-minX,height:maxY-minY};
    }
    function resample(pts, n){
      const I = pathLength(pts) / (n-1);
      let D = 0;
      const newPts = [pts[0]];
      for(let i=1;i<pts.length;i++){
        const d = dist(pts[i-1], pts[i]);
        if((D + d) >= I){
          const qx = pts[i-1].x + ((I - D)/d) * (pts[i].x - pts[i-1].x);
          const qy = pts[i-1].y + ((I - D)/d) * (pts[i].y - pts[i-1].y);
          const q = point(qx,qy);
          newPts.push(q);
          pts.splice(i, 0, q);
          D = 0;
        } else {
          D += d;
        }
      }
      if(newPts.length === n-1) newPts.push(pts[pts.length-1]);
      return newPts;
    }
    function rotateToZero(pts){
      const c = centroid(pts);
      const angle = Math.atan2(c.y - pts[0].y, c.x - pts[0].x);
      const cos = Math.cos(-angle), sin = Math.sin(-angle);
      return pts.map(p => point(
        (p.x - c.x)*cos - (p.y - c.y)*sin + c.x,
        (p.x - c.x)*sin + (p.y - c.y)*cos + c.y
      ));
    }
    function scaleToSquare(pts, size){
      const box = boundingBox(pts);
      const scale = Math.max(box.width, box.height) || 1;
      return pts.map(p => point(p.x * (size/scale), p.y * (size/scale)));
    }
    function translateToOrigin(pts){
      const c = centroid(pts);
      return pts.map(p => point(p.x - c.x, p.y - c.y));
    }
    function normalize(pts){
      const n = 64;
      let r = resample(pts.slice(), n);
      r = rotateToZero(r);
      r = scaleToSquare(r, 200);
      r = translateToOrigin(r);
      return r;
    }
    function pathDistance(a,b){
      let d=0;
      for(let i=0;i<a.length;i++) d += dist(a[i], b[i]);
      return d / a.length;
    }

    const templates = [
      {name:'4', points: normalize([
        point(0,0), point(0,120), point(0,70), point(80,70), point(80,0)
      ])},
      {name:'4', points: normalize([
        point(80,0), point(0,60), point(80,60), point(80,120)
      ])},
      {name:'A', points: normalize([
        point(0,120), point(50,0), point(100,120), point(30,70), point(80,70)
      ])},
      {name:'A', points: normalize([
        point(0,120), point(50,0), point(100,120), point(100,120), point(20,70), point(80,70)
      ])}
    ];

    function recognize(pts){
      if(pts.length < 6) return null;
      const cand = normalize(pts);
      let best = {name:null, dist:Infinity};
      templates.forEach(t => {
        const d = pathDistance(cand, t.points);
        if(d < best.dist) best = {name:t.name, dist:d};
      });
      const halfDiag = 0.5 * Math.hypot(200,200);
      const score = 1 - (best.dist / halfDiag);
      return {name: best.name, score};
    }

    function handleRecognized(name, score){
      if(!name || score < minScore) return;
      const now = Date.now();
      if(name === '4'){
        lastGesture = '4';
        lastGestureAt = now;
        return;
      }
      if(name === 'A' && lastGesture === '4' && (now - lastGestureAt) <= sequenceWindowMs){
        lastGesture = null;
        lastGestureAt = 0;
        triggerFly();
      }
    }

    function onPointerDown(e){
      if(e.isPrimary === false) return;
      if(e.pointerType === 'mouse' && e.button !== 0) return;
      if(e.pointerType === 'touch') usingTouch = true;
      drawing = true;
      activePointerId = e.pointerId;
      points = [point(e.clientX, e.clientY)];
      document.body.classList.add('drawing-gesture');
      document.documentElement.classList.add('drawing-gesture');
    }
    function onPointerMove(e){
      if(!drawing || e.pointerId !== activePointerId) return;
      if(e.pointerType === 'touch') usingTouch = true;
      const last = points[points.length-1];
      const p = point(e.clientX, e.clientY);
      if(dist(last, p) > 4) points.push(p);
    }
    function endDrawing(e){
      if(!drawing || e.pointerId !== activePointerId) return;
      drawing = false;
      activePointerId = null;
      document.body.classList.remove('drawing-gesture');
      document.documentElement.classList.remove('drawing-gesture');
      const result = recognize(points);
      if(result) handleRecognized(result.name, result.score);
      points = [];
    }

    document.addEventListener('pointerdown', onPointerDown, {passive:true});
    document.addEventListener('pointermove', onPointerMove, {passive:true});
    document.addEventListener('pointerup', endDrawing, {passive:true});
    document.addEventListener('pointercancel', endDrawing, {passive:true});

    // Prevent scroll while drawing on touch devices
    function touchPoint(t){ return point(t.clientX, t.clientY); }
    function onTouchStart(e){
      if(e.touches.length !== 1) return;
      usingTouch = true;
      drawing = true;
      activePointerId = null;
      points = [touchPoint(e.touches[0])];
      document.body.classList.add('drawing-gesture');
      document.documentElement.classList.add('drawing-gesture');
    }
    function onTouchMove(e){
      if(!drawing) return;
      e.preventDefault();
      const t = e.touches[0];
      if(!t) return;
      const last = points[points.length-1];
      const p = touchPoint(t);
      if(dist(last, p) > 4) points.push(p);
    }
    function onTouchEnd(){
      if(!drawing) return;
      drawing = false;
      document.body.classList.remove('drawing-gesture');
      document.documentElement.classList.remove('drawing-gesture');
      const result = recognize(points);
      if(result) handleRecognized(result.name, result.score);
      points = [];
    }
    document.addEventListener('touchstart', onTouchStart, {passive:true});
    document.addEventListener('touchmove', onTouchMove, {passive:false});
    document.addEventListener('touchend', onTouchEnd, {passive:true});
    document.addEventListener('touchcancel', onTouchEnd, {passive:true});
  })();
});
