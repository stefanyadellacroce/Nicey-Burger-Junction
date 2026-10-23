import { listCategories, listProducts } from '../services/products.js';
import { productCard } from '../components/product-card.js';
import { el, replaceChildren } from '../core/dom.js';

let products = [];

function control(id) {
  return document.getElementById(id);
}

function render() {
  const term = control('menu-search').value.trim().toLowerCase();
  const category = control('category-filter').value;
  const sort = control('sort-filter').value;
  const availableOnly = control('availability-filter').checked;

  const visible = products.filter(product => {
    if (category && product.category?.slug !== category) return false;
    if (availableOnly && product.manually_sold_out) return false;
    if (!term) return true;

    return [product.name, product.short_description, product.category?.name]
      .some(value => String(value || '').toLowerCase().includes(term));
  });

  visible.sort((a, b) => {
    if (sort === 'price_asc') return Number(a.base_price) - Number(b.base_price);
    if (sort === 'price_desc') return Number(b.base_price) - Number(a.base_price);
    if (sort === 'name') return a.name.localeCompare(b.name);
    return Number(a.sort_order || 0) - Number(b.sort_order || 0);
  });

  replaceChildren(control('menu-grid'), visible.map(product => productCard(product)));
  control('menu-count').textContent = String(visible.length);
  document.querySelectorAll('[data-menu-count-copy]').forEach(node => {
    node.textContent = `${visible.length} menu item${visible.length === 1 ? '' : 's'}`;
  });
  control('menu-empty-state').hidden = visible.length > 0;
  control('menu-grid').setAttribute('aria-busy', 'false');
}

export async function init() {
  const search = control('menu-search');
  const category = control('category-filter');
  const sort = control('sort-filter');
  const availability = control('availability-filter');

  search.addEventListener('input', render);
  category.addEventListener('change', render);
  sort.addEventListener('change', render);
  availability.addEventListener('change', render);
  control('menu-clear-filters').addEventListener('click', () => {
    search.value = '';
    category.value = '';
    sort.value = 'featured';
    availability.checked = false;
    render();
    search.focus();
  });

  control('menu-grid').setAttribute('aria-busy', 'true');
  const [categories, menuProducts] = await Promise.all([
    listCategories(),
    listProducts()
  ]);

  products = menuProducts;
  category.append(...categories.map(item => el('option', {
    value: item.slug,
    text: item.name
  })));

  const requestedCategory = new URLSearchParams(location.search).get('category');
  if (requestedCategory && categories.some(item => item.slug === requestedCategory)) {
    category.value = requestedCategory;
  }

  render();
}
