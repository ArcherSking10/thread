-- 重建 products，slug 作为唯一标识
CREATE TABLE products (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug       text UNIQUE NOT NULL,  -- pet | couple | name | family
  name       text NOT NULL,
  tagline    text,
  hero_url   text,
  sort_order int DEFAULT 0,
  editions   jsonb DEFAULT '[]',
  updated_at timestamptz DEFAULT now()
);

-- 重建 profiles
CREATE TABLE profiles (
  id        uuid REFERENCES auth.users PRIMARY KEY,
  email     text,
  full_name text,
  role      text DEFAULT 'customer',
  created_at timestamptz DEFAULT now()
);

-- 触发器
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'role','customer'));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 重建 orders，正确外键
CREATE TABLE orders (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          uuid REFERENCES auth.users(id) NOT NULL,
  product_id       uuid REFERENCES products(id),
  product_slug     text REFERENCES products(slug), -- 直接存 slug
  edition_index    int,
  stripe_price_id  text,
  stripe_session_id text,
  status           text DEFAULT 'pending',
  photo_url        text,
  preview_url      text,
  subject_name     text,
  customer_email   text,
  notes            text,
  customer_note    text,
  admin_note       text,
  amount_paid      int,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders   ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_public_read" ON products FOR SELECT USING (true);
CREATE POLICY "products_admin_write" ON products FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "orders_own_read"   ON orders FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "orders_own_insert" ON orders FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "orders_own_update" ON orders FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "orders_admin_all"  ON orders FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "profiles_own"          ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_insert_own"   ON profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own"   ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_admin"        ON profiles FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

-- Seed
INSERT INTO products (slug, name, tagline, sort_order, editions) VALUES
('pet','Pet portrait','Your pet in refined satin stitch with a quiet eastern touch.',1,
'[{"label":"Standard","price_display":"$69-79","stripe_price_id":"price_TODO","features":["1 pet (head or half-body)","Pet name","Eastern accent element","Gift-ready packaging","10-14 day turnaround"]},{"label":"Framed Signature","price_display":"$99-129","stripe_price_id":"price_TODO","features":["All Standard features","Full frame wall-ready","Premium linen ground","12-16 day turnaround"]}]'),
('couple','Couple portrait','Two people, one frame. Perfect for anniversaries and weddings.',2,
'[{"label":"Standard","price_display":"$89-109","stripe_price_id":"price_TODO","features":["2 people half-body","2 names + optional date","10-14 days"]},{"label":"Framed Signature","price_display":"$129-169","stripe_price_id":"price_TODO","features":["All Standard features","Full frame","12-16 days"]}]'),
('name','Name art','A name or phrase with a single eastern motif. No photo needed.',3,
'[{"label":"Standard","price_display":"$39-59","stripe_price_id":"price_TODO","features":["Name up to 12 chars","1 eastern motif","No photo needed","7-10 days"]},{"label":"Framed Signature","price_display":"$69-89","stripe_price_id":"price_TODO","features":["All Standard features","Full frame","10-14 days"]}]'),
('family','Family keepsake','The most meaningful piece we make. Families and groups.',4,
'[{"label":"Custom Standard","price_display":"$149-189","stripe_price_id":"price_TODO","features":["2-5 subjects","All names + date","14-20 days","Preview approval required"]},{"label":"Custom Framed","price_display":"$179-249","stripe_price_id":"price_TODO","features":["All Custom features","Full frame","Lead time confirmed per order"]}]');