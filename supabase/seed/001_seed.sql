-- Nicey Burger Junction realistic development seed data.
-- Development sample data. Use on a fresh project; existing business data is never overwritten on conflict.

insert into public.settings(key,value,public_read,description) values
 ('business_name','{"value":"Nicey Burger Junction"}',true,'Public business name'),
 ('store_tagline','{"value":"Burgers made to crave."}',true,'Homepage tagline'),
 ('business_address','{"value":""}',true,'Set the public restaurant location before launch'),
 ('business_phone','{"value":""}',true,'Set the public ordering number before production launch'),
 ('business_email','{"value":""}',true,'Set the public contact email before production launch'),
 ('business_hours_summary','{"value":""}',true,'Set the public operating-hours summary before launch'),
 ('business_hours','{"value":{}}',true,'Configure day-of-week ordering hours; 0=Sunday'),
 ('timezone','{"value":"Asia/Manila"}',false,'Restaurant timezone'),
 ('ordering_enabled','{"value":false}',true,'Enable after real business details and hours are set'),
 ('ordering_setup_confirmed','{"value":false}',false,'Admin confirmed the real contact details and ordering schedule'),
 ('temporary_store_closure','{"value":false}',true,'Temporary closure switch'),
 ('store_announcement','{"value":"Fresh off the grill — order ahead for pickup or delivery."}',true,'Customer announcement'),
 ('pickup_enabled','{"value":false}',true,'Enable after pickup operations are configured'),
 ('delivery_enabled','{"value":false}',true,'Enable after real delivery zones are configured'),
 ('estimated_preparation_minutes','{"value":0}',true,'Set the real pickup preparation estimate'),
 ('estimated_delivery_minutes','{"value":0}',true,'Set the real delivery estimate'),
 ('minimum_delivery_order','{"value":0}',true,'Minimum delivery subtotal'),
 ('service_fee','{"value":0}',true,'Configurable service fee'),
 ('tax_rate_percent','{"value":0}',true,'Tax percentage when prices are not tax inclusive'),
 ('inventory_deduction_stage','{"value":"CONFIRMED"}',false,'PENDING, CONFIRMED, PREPARING, READY or COMPLETED'),
 ('customer_cancellation_enabled','{"value":true}',true,'Allow customer cancellation while eligible'),
 ('currency','{"value":"PHP"}',true,'Display currency'),
 ('facebook_url','{"value":""}',true,'Social URL'),
 ('instagram_url','{"value":""}',true,'Social URL'),
 ('map_embed_url','{"value":""}',true,'Optional embeddable map URL for the public contact page'),
 ('map_link_url','{"value":""}',true,'Optional link to a larger public map')
on conflict(key) do nothing;

insert into public.categories(id,name,slug,description,sort_order,active) values
 ('10000000-0000-4000-8000-000000000001','Burgers','burgers','Signature smashed burgers and handheld favorites.',10,true),
 ('10000000-0000-4000-8000-000000000002','Chicken','chicken','Crispy and grilled chicken favorites.',20,true),
 ('10000000-0000-4000-8000-000000000003','Rice Meals','rice-meals','Hearty rice plates built for a full meal.',30,true),
 ('10000000-0000-4000-8000-000000000004','Fries & Sides','fries-sides','Crispy sides made for sharing.',40,true),
 ('10000000-0000-4000-8000-000000000005','Drinks','drinks','Cold refreshments and shakes.',50,true),
 ('10000000-0000-4000-8000-000000000006','Desserts','desserts','Sweet finishes.',60,true),
 ('10000000-0000-4000-8000-000000000007','Combos','combos','Easy meal bundles.',70,true)
on conflict(id) do nothing;

insert into public.products(id,category_id,name,slug,short_description,description,base_price,featured,bestseller,sort_order,allergen_notes) values
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Junction Classic','junction-classic','Smashed beef, cheese and signature Nicey sauce.','Smashed beef patty, cheddar-style cheese, lettuce, tomato, pickles and Nicey sauce on a toasted brioche-style bun.',169,true,true,10,'Contains gluten, egg, dairy and soy.'),
 ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','Double Nicey Cheeseburger','double-nicey-cheeseburger','Two beef patties with double cheese.','Two smashed beef patties, two cheese slices, pickles, onions and Nicey sauce.',239,true,true,20,'Contains gluten, egg, dairy and soy.'),
 ('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','Firecracker Burger','firecracker-burger','Spicy beef burger with jalapeño relish.','Smashed beef, cheese, jalapeño relish, crispy onions and spicy red sauce.',219,true,false,30,'Contains gluten, egg, dairy and soy.'),
 ('20000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000002','Crispy Chicken Burger','crispy-chicken-burger','Crunchy chicken, lettuce and pepper mayo.','Crispy chicken fillet, lettuce, tomato and pepper mayo on a toasted bun.',199,true,true,40,'Contains gluten, egg, dairy and soy.'),
 ('20000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000003','Chicken Rice Bowl','chicken-rice-bowl','Crispy chicken over steamed rice.','Crispy chicken bites over rice with house gravy, scallions and garlic crunch.',189,false,true,50,'Contains gluten and soy.'),
 ('20000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000003','Burger Steak Rice','burger-steak-rice','Beef patties, mushroom gravy and rice.','Two seasoned beef patties served with steamed rice and savory mushroom gravy.',209,false,false,60,'Contains dairy, gluten and soy.'),
 ('20000000-0000-4000-8000-000000000007','10000000-0000-4000-8000-000000000003','Spicy Chicken Rice','spicy-chicken-rice','Spicy chicken with rice and slaw.','Crispy chicken glazed in spicy sauce, served with rice and cool cabbage slaw.',199,false,false,70,'Contains gluten, egg and soy.'),
 ('20000000-0000-4000-8000-000000000008','10000000-0000-4000-8000-000000000004','Seasoned Fries','seasoned-fries','Golden fries with smoky seasoning.','Crisp skin-on fries tossed in Nicey house seasoning.',79,false,true,80,null),
 ('20000000-0000-4000-8000-000000000009','10000000-0000-4000-8000-000000000004','Loaded Junction Fries','loaded-junction-fries','Fries, cheese sauce, beef and Nicey sauce.','Crispy fries loaded with cheese sauce, chopped beef, scallions and Nicey sauce.',149,true,true,90,'Contains dairy, egg and soy.'),
 ('20000000-0000-4000-8000-000000000010','10000000-0000-4000-8000-000000000004','Crispy Onion Rings','crispy-onion-rings','Thick-cut crunchy onion rings.','Thick-cut onions in seasoned crunchy coating with a creamy dip.',99,false,false,100,'Contains gluten, egg and dairy.'),
 ('20000000-0000-4000-8000-000000000011','10000000-0000-4000-8000-000000000005','Classic Cola','classic-cola','Ice-cold fountain cola.','Fountain cola served over ice.',59,false,true,110,null),
 ('20000000-0000-4000-8000-000000000012','10000000-0000-4000-8000-000000000005','Fresh Lemonade','fresh-lemonade','Bright and refreshing house lemonade.','Fresh-tasting lemonade with a balanced sweet-tart finish.',69,false,false,120,null),
 ('20000000-0000-4000-8000-000000000013','10000000-0000-4000-8000-000000000005','Strawberry Shake','strawberry-shake','Creamy strawberry hand-spun shake.','Vanilla shake blended with strawberry and finished creamy and cold.',129,false,true,130,'Contains dairy.'),
 ('20000000-0000-4000-8000-000000000014','10000000-0000-4000-8000-000000000007','Classic Combo','classic-combo','Junction Classic, fries and a drink.','Junction Classic burger with seasoned fries and a regular fountain drink.',269,true,true,140,'Allergens depend on selected items.'),
 ('20000000-0000-4000-8000-000000000015','10000000-0000-4000-8000-000000000006','Churro Bites','churro-bites','Warm cinnamon-sugar bites with chocolate dip.','Crisp churro bites tossed in cinnamon sugar and served with chocolate dipping sauce.',109,false,false,150,'Contains gluten and dairy.')
on conflict(id) do nothing;

insert into public.product_images(product_id,path,alt_text,sort_order) values
 ('20000000-0000-4000-8000-000000000001','https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=82','Junction Classic burger',0),
 ('20000000-0000-4000-8000-000000000002','https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=1200&q=82','Double cheeseburger',0),
 ('20000000-0000-4000-8000-000000000003','https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1200&q=82','Spicy burger',0),
 ('20000000-0000-4000-8000-000000000004','https://images.unsplash.com/photo-1615297928064-24977384d0da?auto=format&fit=crop&w=1200&q=82','Crispy chicken burger',0),
 ('20000000-0000-4000-8000-000000000005','https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1200&q=82','Chicken rice bowl',0),
 ('20000000-0000-4000-8000-000000000006','https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=1200&q=82','Burger steak rice meal',0),
 ('20000000-0000-4000-8000-000000000007','https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=1200&q=82','Spicy chicken rice meal',0),
 ('20000000-0000-4000-8000-000000000008','https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?auto=format&fit=crop&w=1200&q=82','Seasoned fries',0),
 ('20000000-0000-4000-8000-000000000009','https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=1200&q=82','Loaded fries',0),
 ('20000000-0000-4000-8000-000000000010','https://images.unsplash.com/photo-1639024471283-03518883512d?auto=format&fit=crop&w=1200&q=82','Onion rings',0),
 ('20000000-0000-4000-8000-000000000011','https://images.unsplash.com/photo-1581006852262-e4307cf6283a?auto=format&fit=crop&w=1200&q=82','Cola drink',0),
 ('20000000-0000-4000-8000-000000000012','https://images.unsplash.com/photo-1621263764928-df1444c5e859?auto=format&fit=crop&w=1200&q=82','Fresh lemonade',0),
 ('20000000-0000-4000-8000-000000000013','https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=1200&q=82','Strawberry shake',0),
 ('20000000-0000-4000-8000-000000000014','https://images.unsplash.com/photo-1610614819513-58e34989848b?auto=format&fit=crop&w=1200&q=82','Burger combo meal',0),
 ('20000000-0000-4000-8000-000000000015','https://images.unsplash.com/photo-1624371414361-e670edf4898d?auto=format&fit=crop&w=1200&q=82','Churro bites',0)
on conflict do nothing;

insert into public.product_variants(id,product_id,name,sku,price_delta,sort_order) values
 ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Single','BURG-CLASSIC-S',0,10),
 ('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','Double','BURG-CLASSIC-D',70,20),
 ('30000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000008','Regular','FRIES-REG',0,10),
 ('30000000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000008','Large','FRIES-LRG',40,20),
 ('30000000-0000-4000-8000-000000000005','20000000-0000-4000-8000-000000000011','Regular','COLA-REG',0,10),
 ('30000000-0000-4000-8000-000000000006','20000000-0000-4000-8000-000000000011','Large','COLA-LRG',25,20),
 ('30000000-0000-4000-8000-000000000007','20000000-0000-4000-8000-000000000012','Regular','LEMON-REG',0,10),
 ('30000000-0000-4000-8000-000000000008','20000000-0000-4000-8000-000000000012','Large','LEMON-LRG',25,20)
on conflict(id) do nothing;

insert into public.addons(id,name,price,active) values
 ('40000000-0000-4000-8000-000000000001','Extra cheese',30,true),
 ('40000000-0000-4000-8000-000000000002','Crispy bacon',45,true),
 ('40000000-0000-4000-8000-000000000003','Extra beef patty',70,true),
 ('40000000-0000-4000-8000-000000000004','Fried egg',35,true),
 ('40000000-0000-4000-8000-000000000005','Extra Nicey sauce',20,true),
 ('40000000-0000-4000-8000-000000000006','Cheese sauce',30,true),
 ('40000000-0000-4000-8000-000000000007','Jalapeños',20,true)
on conflict(id) do nothing;

insert into public.product_addons(product_id,addon_id,sort_order)
select p,a,s from (values
 ('20000000-0000-4000-8000-000000000001'::uuid,'40000000-0000-4000-8000-000000000001'::uuid,10),('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000002',20),('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000003',30),('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000004',40),
 ('20000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000001',10),('20000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000002',20),
 ('20000000-0000-4000-8000-000000000003','40000000-0000-4000-8000-000000000001',10),('20000000-0000-4000-8000-000000000003','40000000-0000-4000-8000-000000000007',20),
 ('20000000-0000-4000-8000-000000000004','40000000-0000-4000-8000-000000000001',10),('20000000-0000-4000-8000-000000000004','40000000-0000-4000-8000-000000000005',20),
 ('20000000-0000-4000-8000-000000000008','40000000-0000-4000-8000-000000000006',10),('20000000-0000-4000-8000-000000000009','40000000-0000-4000-8000-000000000007',10)
) v(p,a,s)
on conflict do nothing;

insert into public.suppliers(id,name,contact_person,phone,email,address,notes,active) values
 ('50000000-0000-4000-8000-000000000001','Junction Fresh Foods','Procurement Desk',null,null,null,'Primary meat, produce and dairy supplier.',true),
 ('50000000-0000-4000-8000-000000000002','Golden Pantry Supply','Sales Desk',null,null,null,'Dry goods, sauces and packaging.',true),
 ('50000000-0000-4000-8000-000000000003','Cool Drinks Distribution','Account Desk',null,null,null,'Beverage concentrate and cups.',true)
on conflict(id) do nothing;

insert into public.ingredients(id,name,category,unit,active) values
 ('60000000-0000-4000-8000-000000000001','Burger bun','Bakery','pc',true),('60000000-0000-4000-8000-000000000002','Beef patty','Meat','pc',true),('60000000-0000-4000-8000-000000000003','Chicken fillet','Meat','pc',true),('60000000-0000-4000-8000-000000000004','Cheese slice','Dairy','slice',true),('60000000-0000-4000-8000-000000000005','Lettuce','Produce','g',true),('60000000-0000-4000-8000-000000000006','Tomato','Produce','g',true),('60000000-0000-4000-8000-000000000007','Pickles','Produce','g',true),('60000000-0000-4000-8000-000000000008','Nicey sauce','Sauce','ml',true),('60000000-0000-4000-8000-000000000009','Rice','Dry Goods','g',true),('60000000-0000-4000-8000-000000000010','Fries','Frozen','g',true),('60000000-0000-4000-8000-000000000011','Onion ring','Frozen','pc',true),('60000000-0000-4000-8000-000000000012','Cola syrup','Beverage','ml',true),('60000000-0000-4000-8000-000000000013','Lemonade base','Beverage','ml',true),('60000000-0000-4000-8000-000000000014','Shake mix','Beverage','ml',true),('60000000-0000-4000-8000-000000000015','Strawberry puree','Beverage','ml',true),('60000000-0000-4000-8000-000000000016','Churro bite','Dessert','pc',true),('60000000-0000-4000-8000-000000000017','Chocolate dip','Dessert','ml',true),('60000000-0000-4000-8000-000000000018','Bacon strip','Meat','pc',true),('60000000-0000-4000-8000-000000000019','Egg','Dairy','pc',true),('60000000-0000-4000-8000-000000000020','Cheese sauce','Dairy','ml',true),('60000000-0000-4000-8000-000000000021','Jalapeño','Produce','g',true),('60000000-0000-4000-8000-000000000022','Mushroom gravy','Sauce','ml',true),('60000000-0000-4000-8000-000000000023','Spicy sauce','Sauce','ml',true),('60000000-0000-4000-8000-000000000024','Packaging','Packaging','pc',true)
on conflict(id) do nothing;

insert into public.inventory_items(id,ingredient_id,sku,current_quantity,reorder_level,preferred_stock,unit_cost,supplier_id,active)
select ('70000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid, ingredient, sku, qty, reorder, preferred, cost, supplier, true from (values
 (1,'60000000-0000-4000-8000-000000000001'::uuid,'ING-BUN',180::numeric,50::numeric,220::numeric,8.5::numeric,'50000000-0000-4000-8000-000000000002'::uuid),(2,'60000000-0000-4000-8000-000000000002','ING-BEEF',160,40,200,35,'50000000-0000-4000-8000-000000000001'),(3,'60000000-0000-4000-8000-000000000003','ING-CHICKEN',100,30,140,32,'50000000-0000-4000-8000-000000000001'),(4,'60000000-0000-4000-8000-000000000004','ING-CHEESE',260,70,320,7,'50000000-0000-4000-8000-000000000001'),(5,'60000000-0000-4000-8000-000000000005','ING-LETTUCE',5000,1500,7000,0.12,'50000000-0000-4000-8000-000000000001'),(6,'60000000-0000-4000-8000-000000000006','ING-TOMATO',4500,1200,6500,0.15,'50000000-0000-4000-8000-000000000001'),(7,'60000000-0000-4000-8000-000000000007','ING-PICKLES',3500,800,5000,0.18,'50000000-0000-4000-8000-000000000001'),(8,'60000000-0000-4000-8000-000000000008','ING-SAUCE',8000,1800,10000,0.10,'50000000-0000-4000-8000-000000000002'),(9,'60000000-0000-4000-8000-000000000009','ING-RICE',22000,5000,30000,0.06,'50000000-0000-4000-8000-000000000002'),(10,'60000000-0000-4000-8000-000000000010','ING-FRIES',24000,6000,32000,0.09,'50000000-0000-4000-8000-000000000002'),(11,'60000000-0000-4000-8000-000000000011','ING-ONIONRING',400,100,550,3,'50000000-0000-4000-8000-000000000002'),(12,'60000000-0000-4000-8000-000000000012','ING-COLA',14000,3500,18000,0.04,'50000000-0000-4000-8000-000000000003'),(13,'60000000-0000-4000-8000-000000000013','ING-LEMONADE',12000,3000,16000,0.05,'50000000-0000-4000-8000-000000000003'),(14,'60000000-0000-4000-8000-000000000014','ING-SHAKEMIX',10000,2500,14000,0.12,'50000000-0000-4000-8000-000000000003'),(15,'60000000-0000-4000-8000-000000000015','ING-STRAWBERRY',6000,1500,8000,0.14,'50000000-0000-4000-8000-000000000003'),(16,'60000000-0000-4000-8000-000000000016','ING-CHURRO',300,80,450,4,'50000000-0000-4000-8000-000000000002'),(17,'60000000-0000-4000-8000-000000000017','ING-CHOC',4500,1000,6500,0.12,'50000000-0000-4000-8000-000000000002'),(18,'60000000-0000-4000-8000-000000000018','ING-BACON',240,60,320,10,'50000000-0000-4000-8000-000000000001'),(19,'60000000-0000-4000-8000-000000000019','ING-EGG',180,50,240,9,'50000000-0000-4000-8000-000000000001'),(20,'60000000-0000-4000-8000-000000000020','ING-CHEESESAUCE',6000,1500,8000,0.16,'50000000-0000-4000-8000-000000000001'),(21,'60000000-0000-4000-8000-000000000021','ING-JALAPENO',3000,700,4200,0.20,'50000000-0000-4000-8000-000000000001'),(22,'60000000-0000-4000-8000-000000000022','ING-GRAVY',8000,1800,10000,0.09,'50000000-0000-4000-8000-000000000002'),(23,'60000000-0000-4000-8000-000000000023','ING-SPICY',6000,1300,8500,0.11,'50000000-0000-4000-8000-000000000002'),(24,'60000000-0000-4000-8000-000000000024','ING-PACKAGING',600,150,800,6,'50000000-0000-4000-8000-000000000002')
) v(n,ingredient,sku,qty,reorder,preferred,cost,supplier)
on conflict(ingredient_id) do nothing;

-- Base recipes. Variant/add-on rows are additive to the base recipe.
insert into public.product_ingredients(product_id,variant_id,addon_id,ingredient_id,quantity)
select p,v,a,i,q from (values
 ('20000000-0000-4000-8000-000000000001'::uuid,null::uuid,null::uuid,'60000000-0000-4000-8000-000000000001'::uuid,1::numeric),('20000000-0000-4000-8000-000000000001',null,null,'60000000-0000-4000-8000-000000000002',1),('20000000-0000-4000-8000-000000000001',null,null,'60000000-0000-4000-8000-000000000004',1),('20000000-0000-4000-8000-000000000001',null,null,'60000000-0000-4000-8000-000000000005',20),('20000000-0000-4000-8000-000000000001',null,null,'60000000-0000-4000-8000-000000000006',25),('20000000-0000-4000-8000-000000000001',null,null,'60000000-0000-4000-8000-000000000007',15),('20000000-0000-4000-8000-000000000001',null,null,'60000000-0000-4000-8000-000000000008',15),('20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002',null,'60000000-0000-4000-8000-000000000002',1),
 ('20000000-0000-4000-8000-000000000002',null,null,'60000000-0000-4000-8000-000000000001',1),('20000000-0000-4000-8000-000000000002',null,null,'60000000-0000-4000-8000-000000000002',2),('20000000-0000-4000-8000-000000000002',null,null,'60000000-0000-4000-8000-000000000004',2),('20000000-0000-4000-8000-000000000002',null,null,'60000000-0000-4000-8000-000000000008',15),
 ('20000000-0000-4000-8000-000000000003',null,null,'60000000-0000-4000-8000-000000000001',1),('20000000-0000-4000-8000-000000000003',null,null,'60000000-0000-4000-8000-000000000002',1),('20000000-0000-4000-8000-000000000003',null,null,'60000000-0000-4000-8000-000000000004',1),('20000000-0000-4000-8000-000000000003',null,null,'60000000-0000-4000-8000-000000000021',15),('20000000-0000-4000-8000-000000000003',null,null,'60000000-0000-4000-8000-000000000023',18),
 ('20000000-0000-4000-8000-000000000004',null,null,'60000000-0000-4000-8000-000000000001',1),('20000000-0000-4000-8000-000000000004',null,null,'60000000-0000-4000-8000-000000000003',1),('20000000-0000-4000-8000-000000000004',null,null,'60000000-0000-4000-8000-000000000005',20),('20000000-0000-4000-8000-000000000004',null,null,'60000000-0000-4000-8000-000000000006',25),('20000000-0000-4000-8000-000000000004',null,null,'60000000-0000-4000-8000-000000000008',15),
 ('20000000-0000-4000-8000-000000000005',null,null,'60000000-0000-4000-8000-000000000003',1),('20000000-0000-4000-8000-000000000005',null,null,'60000000-0000-4000-8000-000000000009',180),('20000000-0000-4000-8000-000000000005',null,null,'60000000-0000-4000-8000-000000000022',40),
 ('20000000-0000-4000-8000-000000000006',null,null,'60000000-0000-4000-8000-000000000002',2),('20000000-0000-4000-8000-000000000006',null,null,'60000000-0000-4000-8000-000000000009',180),('20000000-0000-4000-8000-000000000006',null,null,'60000000-0000-4000-8000-000000000022',60),
 ('20000000-0000-4000-8000-000000000007',null,null,'60000000-0000-4000-8000-000000000003',1),('20000000-0000-4000-8000-000000000007',null,null,'60000000-0000-4000-8000-000000000009',180),('20000000-0000-4000-8000-000000000007',null,null,'60000000-0000-4000-8000-000000000023',30),
 ('20000000-0000-4000-8000-000000000008',null,null,'60000000-0000-4000-8000-000000000010',120),('20000000-0000-4000-8000-000000000008','30000000-0000-4000-8000-000000000004',null,'60000000-0000-4000-8000-000000000010',80),
 ('20000000-0000-4000-8000-000000000009',null,null,'60000000-0000-4000-8000-000000000010',160),('20000000-0000-4000-8000-000000000009',null,null,'60000000-0000-4000-8000-000000000020',40),('20000000-0000-4000-8000-000000000009',null,null,'60000000-0000-4000-8000-000000000002',1),('20000000-0000-4000-8000-000000000009',null,null,'60000000-0000-4000-8000-000000000008',15),
 ('20000000-0000-4000-8000-000000000010',null,null,'60000000-0000-4000-8000-000000000011',8),
 ('20000000-0000-4000-8000-000000000011',null,null,'60000000-0000-4000-8000-000000000012',45),('20000000-0000-4000-8000-000000000011','30000000-0000-4000-8000-000000000006',null,'60000000-0000-4000-8000-000000000012',25),
 ('20000000-0000-4000-8000-000000000012',null,null,'60000000-0000-4000-8000-000000000013',180),('20000000-0000-4000-8000-000000000012','30000000-0000-4000-8000-000000000008',null,'60000000-0000-4000-8000-000000000013',80),
 ('20000000-0000-4000-8000-000000000013',null,null,'60000000-0000-4000-8000-000000000014',220),('20000000-0000-4000-8000-000000000013',null,null,'60000000-0000-4000-8000-000000000015',35),
 ('20000000-0000-4000-8000-000000000015',null,null,'60000000-0000-4000-8000-000000000016',8),('20000000-0000-4000-8000-000000000015',null,null,'60000000-0000-4000-8000-000000000017',35),
 -- add-on recipes
 ('20000000-0000-4000-8000-000000000001',null,'40000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000004',1),('20000000-0000-4000-8000-000000000001',null,'40000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000018',2),('20000000-0000-4000-8000-000000000001',null,'40000000-0000-4000-8000-000000000003','60000000-0000-4000-8000-000000000002',1),('20000000-0000-4000-8000-000000000001',null,'40000000-0000-4000-8000-000000000004','60000000-0000-4000-8000-000000000019',1),('20000000-0000-4000-8000-000000000008',null,'40000000-0000-4000-8000-000000000006','60000000-0000-4000-8000-000000000020',35)
) r(p,v,a,i,q)
on conflict(product_id,variant_id,addon_id,ingredient_id) do nothing;

insert into public.delivery_zones(id,name,areas,delivery_fee,minimum_order,estimated_minutes,active) values
 ('80000000-0000-4000-8000-000000000001','Central Zone',array['Central district','Nearby barangays'],49,250,35,false),
 ('80000000-0000-4000-8000-000000000002','Extended Zone',array['Outer service area'],79,400,55,false)
on conflict(id) do nothing;

insert into public.payment_methods(id,code,name,method_type,instructions,requires_proof,active,sort_order) values
 ('90000000-0000-4000-8000-000000000001','CASH_PICKUP','Cash on Pickup','CASH','Pay at the counter when your pickup order is ready.',false,true,10),
 ('90000000-0000-4000-8000-000000000002','CASH_DELIVERY','Cash on Delivery','CASH','Prepare the exact amount where possible and pay the rider on delivery.',false,true,20),
 ('90000000-0000-4000-8000-000000000003','GCASH','GCash','MANUAL_DIGITAL','Send payment using the merchant details configured by the restaurant, then upload proof and reference.',true,false,30),
 ('90000000-0000-4000-8000-000000000004','MAYA','Maya','MANUAL_DIGITAL','Send payment using the merchant details configured by the restaurant, then upload proof and reference.',true,false,40),
 ('90000000-0000-4000-8000-000000000005','BANK','Bank Transfer','BANK_TRANSFER','Transfer to the configured business account, then upload proof and reference.',true,false,50)
on conflict(id) do nothing;

insert into public.promotions(id,code,title,description,promo_type,amount,minimum_spend,maximum_discount,usage_limit,per_user_limit,starts_at,ends_at,active,automatic) values
 ('a0000000-0000-4000-8000-000000000001','NICEY10','Nicey 10% Off','Get 10% off qualifying orders.','PERCENTAGE',10,300,100,500,3,now()-interval '1 day',now()+interval '365 days',false,false),
 ('a0000000-0000-4000-8000-000000000002','JUNCTION50','Junction ₱50 Off','Save ₱50 on larger orders.','FIXED',50,500,50,300,2,now()-interval '1 day',now()+interval '365 days',false,false)
on conflict(id) do nothing;

insert into public.expense_categories(id,name,active) values
 ('b0000000-0000-4000-8000-000000000001','Utilities',true),('b0000000-0000-4000-8000-000000000002','Rent',true),('b0000000-0000-4000-8000-000000000003','Supplies',true),('b0000000-0000-4000-8000-000000000004','Maintenance',true),('b0000000-0000-4000-8000-000000000005','Marketing',true)
on conflict(id) do nothing;

-- Combo inventory recipe: one classic burger, one fries serving and one cola serving.
insert into public.product_ingredients(product_id,variant_id,addon_id,ingredient_id,quantity) values
 ('20000000-0000-4000-8000-000000000014',null,null,'60000000-0000-4000-8000-000000000001',1),
 ('20000000-0000-4000-8000-000000000014',null,null,'60000000-0000-4000-8000-000000000002',1),
 ('20000000-0000-4000-8000-000000000014',null,null,'60000000-0000-4000-8000-000000000004',1),
 ('20000000-0000-4000-8000-000000000014',null,null,'60000000-0000-4000-8000-000000000005',20),
 ('20000000-0000-4000-8000-000000000014',null,null,'60000000-0000-4000-8000-000000000006',25),
 ('20000000-0000-4000-8000-000000000014',null,null,'60000000-0000-4000-8000-000000000007',15),
 ('20000000-0000-4000-8000-000000000014',null,null,'60000000-0000-4000-8000-000000000008',15),
 ('20000000-0000-4000-8000-000000000014',null,null,'60000000-0000-4000-8000-000000000010',120),
 ('20000000-0000-4000-8000-000000000014',null,null,'60000000-0000-4000-8000-000000000012',45)
on conflict(product_id,variant_id,addon_id,ingredient_id) do nothing;


-- Ingredients customers may explicitly remove from configured products.
update public.product_ingredients pi set removable=true
where (pi.product_id,pi.ingredient_id) in (
 ('20000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000005'),
 ('20000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000006'),
 ('20000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000007'),
 ('20000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000008'),
 ('20000000-0000-4000-8000-000000000003','60000000-0000-4000-8000-000000000021'),
 ('20000000-0000-4000-8000-000000000003','60000000-0000-4000-8000-000000000023'),
 ('20000000-0000-4000-8000-000000000004','60000000-0000-4000-8000-000000000005'),
 ('20000000-0000-4000-8000-000000000004','60000000-0000-4000-8000-000000000006'),
 ('20000000-0000-4000-8000-000000000004','60000000-0000-4000-8000-000000000008')
);
