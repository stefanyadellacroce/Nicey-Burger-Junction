// Render the public navigation while the page is still being parsed.
// The shared site shell enhances it after the application starts.
(() => {
  const target = document.getElementById('site-header');
  if (!target) return;

  const pages = [
    ['Home', '/', 'home-section'],
    ['Menu', '/menu.html', 'menu'],
    ['Promotions', '/promotions.html', 'promotions'],
    ['About', '/about.html', 'about'],
    ['Contact', '/contact.html', 'contact']
  ];

  const path = location.pathname
    .replace(/\/+/g, '/')
    .replace(/\/index\.html$/, '/')
    .replace(/\/$/, '') || '/';
  const activeIndex = pages.findIndex(([, href]) => href === path);

  const desktopLinks = pages.map(([label, href, section], index) =>
    `<a href="${href}" class="premium-nav-link${index === activeIndex ? ' is-active' : ''}" data-nav-section="${section}"${index === activeIndex ? ' aria-current="page"' : ''}>${label}</a>`
  ).join('');

  const mobileLinks = pages.map(([label, href, section], index) =>
    `<a href="${href}" class="premium-mobile-link${index === activeIndex ? ' is-active' : ''}" data-mobile-section="${section}"><span class="premium-mobile-number">${String(index + 1).padStart(2, '0')}</span><strong>${label}</strong><i class="bi bi-arrow-right" aria-hidden="true"></i></a>`
  ).join('');

  const progress = activeIndex < 0 ? '' : `
    <div class="premium-section-progress">
      <div class="premium-progress-inner">
        <span id="premium-progress-number" class="premium-progress-number">${String(activeIndex + 1).padStart(2, '0')}</span>
        <span id="premium-progress-label" class="premium-progress-label">${pages[activeIndex][0].toUpperCase()}</span>
        <div class="premium-progress-track">
          ${pages.map(([label, href, section], index) => `<a href="${href}" class="premium-progress-step${index < activeIndex ? ' is-complete' : ''}${index === activeIndex ? ' is-active' : ''}" data-progress-section="${section}" aria-label="Go to ${label}"${index === activeIndex ? ' aria-current="page"' : ''}><span></span></a>`).join('')}
        </div>
      </div>
    </div>`;

  target.className = 'site-header premium-site-header';
  target.setAttribute('role', 'banner');
  target.innerHTML = `
    <div class="container-nbj header-inner premium-nav-shell">
      <a href="/" class="brand-link premium-brand" aria-label="Nicey Burger Junction home">
        <img src="/assets/images/nicey-burger-logo-transparent.png" alt="Nicey Burger Junction" class="brand-logo premium-brand-logo" decoding="async">
      </a>
      <nav id="main-nav" class="main-nav premium-desktop-nav" aria-label="Primary navigation">${desktopLinks}</nav>
      <div class="header-actions premium-nav-actions">
        <a href="/customer/cart.html" class="icon-btn cart-button premium-cart-button" aria-label="Shopping cart">
          <i class="bi bi-bag" aria-hidden="true"></i>
          <span id="cart-count" class="cart-count premium-cart-count is-empty" aria-label="0 items in cart">0</span>
        </a>
        <a href="/login.html" class="site-login-link premium-login-button"><i class="bi bi-person" aria-hidden="true"></i><span>Sign in</span></a>
        <button id="premium-mobile-toggle" class="mobile-nav-toggle premium-mobile-toggle" type="button" aria-controls="premium-mobile-menu" aria-expanded="false" aria-label="Open navigation"><span></span><span></span><span></span></button>
      </div>
    </div>
    ${progress}
    <nav id="premium-mobile-menu" class="premium-mobile-menu" aria-label="Mobile navigation">
      <div class="container-nbj premium-mobile-menu-inner">
        ${mobileLinks}
        <div id="mobile-account-area" class="premium-mobile-account-area">
          <a href="/login.html" class="premium-mobile-link premium-mobile-auth-link"><span class="premium-mobile-auth-icon"><i class="bi bi-person-circle" aria-hidden="true"></i></span><span class="premium-mobile-auth-copy"><strong>Sign in</strong><small>Access your account</small></span><i class="bi bi-arrow-right" aria-hidden="true"></i></a>
        </div>
      </div>
    </nav>`;

  const toggle = target.querySelector('#premium-mobile-toggle');
  const mobileMenu = target.querySelector('#premium-mobile-menu');
  const setOpen = open => {
    toggle.classList.toggle('is-open', open);
    mobileMenu.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  };

  toggle.addEventListener('click', () => {
    setOpen(!mobileMenu.classList.contains('is-open'));
  });
  mobileMenu.addEventListener('click', event => {
    if (event.target.closest('a')) setOpen(false);
  });
})();
