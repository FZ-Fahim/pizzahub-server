import { Request, Response } from 'express';
import Stripe from 'stripe';
import stripe from '../config/stripe.js';
import { User } from '../models/User.js';
import { Transaction } from '../models/Transaction.js';

export const handleStripeWebhook = async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  try {
    if (!sig || !webhookSecret) {
      res.status(400).json({
        error: 'BadRequest',
        message: 'Stripe signature header and STRIPE_WEBHOOK_SECRET are required.',
      });
      return;
    }

    // Cryptographic signature verification with raw request body buffer
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error(`[Webhook] Signature verification failed: ${err.message}`);
    res.status(400).json({
      error: 'WebhookError',
      message: `Webhook signature verification failed: ${err.message}`,
    });
    return;
  }

  // Handle verified events
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const vendorId = session.metadata?.vendorId;

    if (!vendorId) {
      console.warn('[Webhook] checkout.session.completed received without vendorId in metadata.');
      res.status(200).json({ received: true });
      return;
    }

    try {
      // 1. Calculate 1-year Premium expiry date
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

      // 2. Upgrade vendor account in users collection
      const updatedUser = await User.findByIdAndUpdate(
        vendorId,
        {
          subscriptionPlan: 'premium',
          subscriptionExpiresAt: oneYearFromNow,
        },
        { new: true }
      );

      console.log(
        `[Webhook] Vendor upgraded to Premium: ${vendorId} (Expires: ${oneYearFromNow.toISOString()})`
      );

      // 3. Create or update financial transaction audit ledger
      const existingTx = await Transaction.findOne({ stripeSessionId: session.id });

      if (!existingTx) {
        const amountTotal = session.amount_total ? session.amount_total / 100 : 99;
        await Transaction.create({
          vendorId,
          plan: 'premium',
          amount: amountTotal,
          currency: session.currency ? session.currency.toLowerCase() : 'usd',
          stripeSessionId: session.id,
          stripeSubscriptionId:
            typeof session.subscription === 'string' ? session.subscription : undefined,
          status: 'completed',
        });

        console.log(
          `[Webhook] Transaction ledger created for session ${session.id}: $${amountTotal}`
        );
      }
    } catch (dbErr: any) {
      console.error(`[Webhook] Database update failed for session ${session.id}: ${dbErr.message}`);
      res.status(500).json({
        error: 'DatabaseError',
        message: `Failed to update database records: ${dbErr.message}`,
      });
      return;
    }
  }

  res.status(200).json({ received: true });
};
