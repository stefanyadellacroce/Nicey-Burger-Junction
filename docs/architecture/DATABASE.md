# Database Architecture

Core normalized areas: profiles/addresses; categories/products/images/variants/add-ons; ingredients/recipes/inventory/movements; carts/items; orders/snapshots/status history; payments/refunds; promotions/usages; suppliers/purchase orders/receipts; expenses; favorites/reviews/notifications; settings/audit; model registry/forecasts/recommendations.

Historical order items snapshot product/variant/add-on names and prices so catalog edits never rewrite old receipts. Critical writes use Postgres functions for atomic validation and idempotency. RLS restricts customers to their own private rows while operational roles use trusted profile roles.
