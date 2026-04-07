// Deploy: supabase functions deploy create-checkout --project-ref YOUR_REF
// Set secret: supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
// TODO: replace YOUR_SITE_URL below

import Stripe from "https://esm.sh/stripe@14";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);
const SITE_URL = "https://YOUR_SITE_URL";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, {
    headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization,content-type" }
  });
  try {
    const { orderId, stripePriceId, customerEmail } = await req.json();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      customer_email: customerEmail,
      line_items: [{ price: stripePriceId, quantity: 1 }],
      mode: "payment",
      success_url: SITE_URL + "/account.html?order=" + orderId + "&paid=1",
      cancel_url: SITE_URL + "/checkout.html?cancelled=1",
      metadata: { orderId },
    });
    return new Response(JSON.stringify({ url: session.url }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
});
