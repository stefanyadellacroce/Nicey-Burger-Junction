from pathlib import Path
import re, sys
root=Path(__file__).resolve().parents[1]
ignored={'.git','.venv','node_modules','__pycache__','dist','.temp'}
def project_files(pattern):
    return (p for p in root.rglob(pattern) if not any(part in ignored for part in p.relative_to(root).parts))
required=['app.py','site_config.py','tools/build_site.py','index.html','menu.html','product.html','login.html','register.html','customer/cart.html','customer/checkout.html','operations/dashboard.html','operations/orders.html','operations/kitchen.html','operations/walk-in.html','admin/dashboard.html','admin/products.html','admin/inventory.html','admin/reports.html','admin/machine-learning.html','admin/users.html','admin/settings.html','admin/commerce-setup.html','README.md','supabase/migrations/001_schema.sql','supabase/migrations/002_functions.sql','supabase/migrations/003_rls.sql','supabase/migrations/013_checkout_integrity.sql']
required.append('supabase/migrations/014_require_business_confirmation.sql')
required.append('supabase/migrations/015_atomic_purchase_orders_and_write_grants.sql')
required.append('supabase/migrations/016_fix_order_snapshot.sql')
errors=[]
for p in required:
    if not (root/p).is_file(): errors.append(f'MISSING required file: {p}')
for f in project_files('*.html'):
    text=f.read_text(errors='ignore')
    for ref in re.findall(r"(?:href|src)=[\"']([^\"'#?]+)",text):
        if ref.startswith(('http://','https://','mailto:','tel:','data:')): continue
        target=(root/ref.lstrip('/')) if ref.startswith('/') else (f.parent/ref)
        if not target.exists(): errors.append(f'BROKEN local ref {f.relative_to(root)} -> {ref}')
for f in project_files('*.js'):
    text=f.read_text(errors='ignore')
    for ref in re.findall(r"(?:from\\s*|import\\s*)[\"'](\\.{1,2}/[^\"']+)[\"']",text):
        target=(f.parent/ref).resolve()
        if not target.exists(): errors.append(f'BROKEN JS import {f.relative_to(root)} -> {ref}')
for f in project_files('*.css'):
    text=f.read_text(errors='ignore')
    for ref in re.findall(r'@import\s+(?:url\()?\s*["\']([^"\']+)["\']',text):
        target=(f.parent/ref).resolve()
        if not target.is_file(): errors.append(f'BROKEN CSS import {f.relative_to(root)} -> {ref}')
for f in (root/'assets').rglob('*'):
    if f.is_file():
        t=f.read_text(errors='ignore')
        if re.search(r'(SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*[\"\'][^\"\']+|service_role\s*[:=]\s*[\"\']eyJ)',t,re.I): errors.append(f'POSSIBLE SERVICE ROLE SECRET IN BROWSER ASSET: {f.relative_to(root)}')
config=(root/'assets/js/config.js').read_text(errors='ignore')
if re.search(r'https://[^\s\"\']+\.supabase\.co/(rest|auth|storage)/v1',config,re.I): errors.append('Malformed Supabase service URL in browser config')
for f in project_files('*'):
    if f == Path(__file__).resolve(): continue
    if f.is_file() and f.suffix.lower() in {'.html','.js','.css','.sql','.md','.py','.ts'}:
        t=f.read_text(errors='ignore')
        if re.search(r'\b(TODO|FIXME|coming soon|implement later|add logic here|same as above)\b',t,re.I): errors.append(f'Forbidden placeholder marker: {f.relative_to(root)}')
print(f'Checked {sum(1 for _ in project_files("*"))} project paths.')
if errors:
    print('\n'.join(errors)); sys.exit(1)
print('Static integration audit passed.')
