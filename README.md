# Lunastitch

## Stack
- Frontend: Vanilla HTML/CSS/JS (no build step)
- Auth + DB: Supabase
- Payments: Stripe via Supabase Edge Function
- Images: Cloudinary
- Deploy: Netlify / Vercel / GitHub Pages

## Setup (in order)
1. Fill in js/config.js with your API keys
2. Run supabase/schema.sql in Supabase SQL Editor
3. Deploy supabase/create-checkout.ts as a Supabase Edge Function
4. Add Stripe Price IDs via /admin/products.html
5. Set your account role=admin in Supabase profiles table
6. Deploy folder to Netlify (drag and drop the lunastitch folder)

## Pages
- /                     Homepage
- /product.html?id=X    Product detail (pet | couple | name | family)
- /checkout.html        3-step order flow (login required)
- /account.html         Customer order tracker (login required)
- /login.html           Sign in / Create account
- /admin/               Dashboard (admin only)
- /admin/orders.html    Order management
- /admin/products.html  Edit products, images, prices

## Order status flow
pending > in_production > preview_sent > revision_requested > preview_approved > shipped > complete

## TODO before going live
- [ ] Fill js/config.js
- [ ] Run supabase/schema.sql (includes seed data at bottom)
- [ ] Deploy Stripe Edge Function
- [ ] Add real Stripe Price IDs in Admin > Products
- [ ] Set admin role in Supabase
- [ ] Replace gallery placeholders with real photos
- [ ] Connect custom domain
