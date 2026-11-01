// Show portal navigation before authentication and page data finish loading.
(() => {
  const sidebar = document.getElementById('portal-sidebar');
  const topbar = document.getElementById('portal-topbar');
  if (!sidebar || !topbar) return;

  const kind = document.body.dataset.portal === 'admin' ? 'admin' : 'operations';
  const operations = [
    ['Overview', [['Dashboard', '/operations/dashboard.html', 'speedometer2']]],
    ['Orders', [
      ['Orders', '/operations/orders.html', 'receipt'],
      ['Kitchen Queue', '/operations/kitchen.html', 'fire'],
      ['Walk-in / POS', '/operations/walk-in.html', 'calculator']
    ]],
    ['Finance', [['Payments', '/operations/payments.html', 'credit-card']]],
    ['Customers', [['Customers', '/operations/customers.html', 'people']]],
    ['Inventory', [['Inventory', '/operations/inventory.html', 'boxes']]]
  ];
  const admin = [
    ['Overview', [['Dashboard', '/admin/dashboard.html', 'speedometer2']]],
    ['Orders', [
      ['Orders', '/admin/orders.html', 'receipt'],
      ['Kitchen Queue', '/admin/kitchen.html', 'fire'],
      ['Walk-in / POS', '/admin/walk-in.html', 'calculator']
    ]],
    ['Customers', [['Customers', '/admin/customers.html', 'people']]],
    ['Communication', [['Inquiries', '/admin/inquiries.html', 'envelope']]],
    ['Menu', [
      ['Products', '/admin/products.html', 'burger'],
      ['Categories', '/admin/categories.html', 'grid'],
      ['Add-ons', '/admin/addons.html', 'plus-circle'],
      ['Ingredients', '/admin/ingredients.html', 'basket'],
      ['Recipes', '/admin/recipes.html', 'journal-text']
    ]],
    ['Inventory', [
      ['Inventory', '/admin/inventory.html', 'boxes'],
      ['Stock Movements', '/admin/stock-movements.html', 'arrow-left-right'],
      ['Suppliers', '/admin/suppliers.html', 'truck'],
      ['Purchase Orders', '/admin/purchase-orders.html', 'clipboard-check']
    ]],
    ['Finance', [
      ['Payments', '/admin/payments.html', 'credit-card'],
      ['Transactions', '/admin/transactions.html', 'cash-stack'],
      ['Expenses', '/admin/expenses.html', 'wallet2']
    ]],
    ['Marketing', [['Promotions', '/admin/promotions.html', 'tag']]],
    ['Analytics', [
      ['Reports', '/admin/reports.html', 'bar-chart'],
      ['Stock & Sales Outlook', '/admin/machine-learning.html', 'cpu']
    ]],
    ['Administration', [
      ['Users', '/admin/users.html', 'person-gear'],
      ['Activity Logs', '/admin/activity-logs.html', 'clock-history'],
      ['Settings', '/admin/settings.html', 'gear'],
      ['Payment & Delivery', '/admin/commerce-setup.html', 'sliders']
    ]]
  ];

  const sections = kind === 'admin' ? admin : operations;
  const current = location.pathname.replace(/\/+$/, '') || '/';
  const groups = sections.map(([label, items]) => `
    <div class="portal-nav-group">
      <div class="portal-nav-title">${label}</div>
      ${items.map(([name, href, icon]) => `<a href="${href}"${current === href ? ' aria-current="page"' : ''}><i class="bi bi-${icon}" aria-hidden="true"></i><span>${name}</span></a>`).join('')}
    </div>`).join('');

  sidebar.innerHTML = `
    <div class="portal-brand-wrap">
      <a href="/${kind}/dashboard.html" class="portal-brand" aria-label="${kind === 'admin' ? 'Admin' : 'Staff'} dashboard">
        <img src="/assets/images/nicey-burger-logo-transparent.png" alt="Nicey Burger Junction" class="brand-logo portal-brand-logo" decoding="async">
      </a>
      <div class="portal-brand-meta"><span class="portal-brand-kicker">Nicey Burger Junction</span><strong class="portal-brand-role">${kind === 'admin' ? 'Admin Portal' : 'Staff Portal'}</strong></div>
    </div>
    <nav class="portal-nav" aria-label="${kind} navigation">${groups}</nav>`;

  topbar.innerHTML = `
    <button class="icon-btn portal-menu-toggle" type="button" aria-label="Toggle portal navigation" aria-controls="portal-sidebar" aria-expanded="false"><i class="bi bi-list" aria-hidden="true"></i></button>
    <span class="portal-topbar-loading">Loading account…</span>`;

  let backdrop = document.querySelector('.portal-sidebar-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.className = 'portal-sidebar-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.append(backdrop);
  }

  const toggle = topbar.querySelector('.portal-menu-toggle');
  const setOpen = open => {
    sidebar.classList.toggle('open', open);
    backdrop.classList.toggle('open', open);
    document.body.classList.toggle('portal-nav-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  };
  toggle.addEventListener('click', () => setOpen(!sidebar.classList.contains('open')));
  backdrop.addEventListener('click', () => setOpen(false));
  sidebar.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => setOpen(false));
  });
})();
