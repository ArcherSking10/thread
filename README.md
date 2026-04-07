# Silkthread Studio — Website

A complete, deployable static website for the custom embroidery brand.

## File structure

```
silkthread/
├── index.html          # Homepage
├── order.html          # Interactive order flow (3-step wizard)
├── faq.html            # FAQ page with accordion
├── css/
│   ├── main.css        # Global styles (all pages)
│   └── order.css       # Order page styles
└── js/
    ├── main.js         # Nav, scroll animations, mobile menu
    ├── order.js        # Full order flow logic (photo upload, pricing, validation)
    └── faq.js          # FAQ accordion
```

## Features

### Homepage (index.html)
- Fixed navbar with scroll blur effect + mobile hamburger menu
- Hero section with embroidery illustration (SVG, no external assets)
- 4-product collection grid
- Standard vs Framed Signature edition comparison
- 4-step process explanation
- 6 customer reviews
- CTA section with decorative SVG
- Footer with links

### Order page (order.html)
- **Step 1**: Choose template (pet / couple / name / family) + edition (standard / framed)
- **Step 2**: Photo drag-and-drop upload with preview + dynamic fields per template type + embroidery style selection
- **Step 3**: Order review summary + shipping address form + gift message toggle + order total
- **Success screen**: Order confirmed with timeline
- Live price sidebar that updates as you select options
- URL param support: `order.html?type=pet` pre-selects a template
- Full validation before each step advance

### FAQ page (faq.html)
- Sticky sidebar navigation with scroll-based active state
- Accordion questions (click to expand/collapse)

## Deployment

### Option 1: Static hosting (recommended)
Upload the entire `silkthread/` folder to any static host:
- **Netlify**: drag-and-drop the folder at netlify.com/drop
- **Vercel**: `vercel --prod` from the folder
- **GitHub Pages**: push to a repo, enable Pages on the main branch
- **Cloudflare Pages**: connect your repo or drag-and-drop

No build step required. Pure HTML/CSS/JS.

### Option 2: Local preview
```bash
# Python (built-in)
cd silkthread
python3 -m http.server 3000
# → open http://localhost:3000

# Node (if you have npx)
npx serve .
```

## Customization

### Colors (css/main.css, :root)
- `--ink`: main text color (default: near-black)
- `--cream`: light panel backgrounds
- `--parchment`: slightly warmer light tones
- `--copper`: accent color (star ratings)
- `--bg`: page background

### Prices (js/order.js, PRICES object)
```js
const PRICES = {
  pet:    { standard: 69,  framed: 99  },
  couple: { standard: 89,  framed: 129 },
  name:   { standard: 39,  framed: 69  },
  family: { standard: 149, framed: 179 },
};
```

### Dynamic order fields
Edit `DYNAMIC_FIELDS` in `js/order.js` to change what info is collected per template type.

## Next steps to make fully functional

1. **Payment**: Integrate Stripe Checkout or Stripe Payment Links. Replace the "Place order" button action in `order.js` with a Stripe session redirect.
2. **Form submission**: Connect the order form to a backend (Supabase, Airtable, or a simple serverless function) to store orders and trigger confirmation emails.
3. **Email**: Use Resend, Postmark, or SendGrid to send order confirmations and preview notifications.
4. **Photo storage**: Upload customer photos to Cloudflare R2, AWS S3, or Supabase Storage via a small backend API.
5. **Analytics**: Add Plausible or Google Analytics snippet to each page `<head>`.

## Fonts
Uses Google Fonts (loaded via CDN):
- **Cormorant Garamond** — display headings, prices (elegant serif)
- **DM Sans** — body text, UI (clean, readable)

These load from `fonts.googleapis.com`. For self-hosting, download from fonts.google.com and update the `@import` in CSS.
