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

  // Triple-click on About section: fly Marko Jack image across the screen
  const aboutSection = document.getElementById('about');
  if(aboutSection){
    let clickCount = 0;
    let clickTimer = null;

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

    aboutSection.addEventListener('click', () => {
      clickCount += 1;
      if(clickTimer) clearTimeout(clickTimer);
      clickTimer = setTimeout(() => { clickCount = 0; }, 700);
      if(clickCount >= 3){
        clickCount = 0;
        triggerFly();
      }
    });
  }
});
