// Keep customer account navigation visible while the application loads.
(() => {
  if (!document.body.classList.contains('customer-shell')) return;

  const header = document.getElementById('site-header');
  if (!header) return;

  const accountLinks = [
    ['Dashboard', '/customer/dashboard.html', 'grid-1x2'],
    ['Orders', '/customer/orders.html', 'receipt'],
    ['Favorites', '/customer/favorites.html', 'heart'],
    ['Notifications', '/customer/notifications.html', 'bell'],
    ['Addresses', '/customer/addresses.html', 'geo-alt'],
    ['Profile', '/customer/profile.html', 'person']
  ];
  const shopLinks = [
    ['Cart', '/customer/cart.html', 'bag'],
    ['Browse menu', '/menu.html', 'shop']
  ];

  let active = location.pathname;
  if (/\/order-(details|confirmation)\.html$/.test(active)) {
    active = '/customer/orders.html';
  } else if (active.endsWith('/checkout.html')) {
    active = '/customer/cart.html';
  }

  const links = items => items.map(([label, href, icon]) =>
    `<a href="${href}"${active === href ? ' aria-current="page"' : ''}><i class="bi bi-${icon}" aria-hidden="true"></i><span>${label}</span></a>`
  ).join('');

  const sidebar = document.createElement('aside');
  sidebar.id = 'customer-sidebar';
  sidebar.className = 'customer-sidebar';
  sidebar.setAttribute('aria-label', 'Customer account navigation');
  sidebar.innerHTML = `
    <div class="customer-sidebar-heading">
      <div><small>NICEY BURGER JUNCTION</small><strong>My account</strong></div>
      <button type="button" class="customer-sidebar-close" aria-label="Close account navigation"><i class="bi bi-x-lg" aria-hidden="true"></i></button>
    </div>
    <span class="customer-sidebar-label">ACCOUNT</span>
    <nav class="customer-sidebar-nav" aria-label="Account pages">${links(accountLinks)}</nav>
    <span class="customer-sidebar-label">SHOP</span>
    <nav class="customer-sidebar-nav" aria-label="Shopping links">${links(shopLinks)}</nav>
    <button type="button" class="customer-sidebar-signout"><i class="bi bi-box-arrow-right" aria-hidden="true"></i><span>Sign out</span></button>`;

  const backdrop = document.createElement('div');
  backdrop.className = 'customer-sidebar-backdrop';
  backdrop.setAttribute('aria-hidden', 'true');
  document.body.prepend(sidebar, backdrop);

  header.className = 'site-header premium-site-header';
  header.setAttribute('role', 'banner');
  header.innerHTML = `
    <div class="container-nbj header-inner premium-nav-shell">
      <a href="/customer/dashboard.html" class="brand-link premium-brand" aria-label="Customer dashboard">
        <img src="/assets/images/nicey-burger-logo-transparent.png" alt="Nicey Burger Junction" class="brand-logo premium-brand-logo" decoding="async">
      </a>
      <div class="header-actions premium-nav-actions">
        <button type="button" class="icon-btn customer-sidebar-toggle" aria-label="Open account navigation" aria-controls="customer-sidebar" aria-expanded="false"><i class="bi bi-list" aria-hidden="true"></i></button>
        <a href="/customer/cart.html" class="icon-btn cart-button premium-cart-button" aria-label="Shopping cart"><i class="bi bi-bag" aria-hidden="true"></i><span id="cart-count" class="cart-count premium-cart-count is-empty" aria-label="0 items in cart">0</span></a>
        <a href="/customer/dashboard.html" class="site-account-button premium-account-button"><span class="site-account-avatar" aria-hidden="true">M</span><span class="account-label">My account</span></a>
        <button type="button" class="icon-btn site-logout premium-logout-button" aria-label="Log out" title="Log out"><i class="bi bi-box-arrow-right" aria-hidden="true"></i></button>
      </div>
    </div>`;

  const toggle = header.querySelector('.customer-sidebar-toggle');
  const setOpen = open => {
    const visible = window.innerWidth <= 900 && open;
    sidebar.classList.toggle('is-open', visible);
    backdrop.classList.toggle('is-open', visible);
    document.body.classList.toggle('customer-sidebar-open', visible);
    sidebar.inert = window.innerWidth <= 900 && !visible;
    toggle.setAttribute('aria-expanded', String(visible));
    toggle.setAttribute('aria-label', visible ? 'Close account navigation' : 'Open account navigation');
  };

  toggle.addEventListener('click', () => setOpen(!sidebar.classList.contains('is-open')));
  sidebar.querySelector('.customer-sidebar-close').addEventListener('click', () => setOpen(false));
  backdrop.addEventListener('click', () => setOpen(false));
  sidebar.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => setOpen(false));
  });

  const signOutAndLeave = async button => {
    if (button.disabled) return;
    button.disabled = true;
    try {
      const { signOut } = await import('/assets/js/core/auth.js');
      await signOut();
      location.replace('/');
    } catch (error) {
      console.error('Unable to sign out:', error);
      button.disabled = false;
    }
  };

  sidebar.querySelector('.customer-sidebar-signout').addEventListener('click', event => signOutAndLeave(event.currentTarget));
  header.querySelector('.site-logout').addEventListener('click', event => signOutAndLeave(event.currentTarget));
  setOpen(false);
})();
