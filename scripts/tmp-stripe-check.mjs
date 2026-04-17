import dotenv from 'dotenv';
import Stripe from 'stripe';

dotenv.config({ path: 'server/.env' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

try {
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    success_url: 'http://localhost:5000/success',
    cancel_url: 'http://localhost:5000/cancel',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: 1000,
          product_data: { name: 'Test Item' },
        },
        quantity: 1,
      },
    ],
  });
  console.log('OK', session.id, Boolean(session.url));
} catch (e) {
  console.log('ERR', e?.type, e?.code, e?.message);
}
