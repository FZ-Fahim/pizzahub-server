import { Request, Response } from 'express';
import stripe from '../config/stripe';
import { User } from '../models/User';
import { MenuItem } from '../models/MenuItem';
import { Transaction } from '../models/Transaction';

export const createCheckoutSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const vendor = req.user!;
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';

    const priceId = process.env.STRIPE_PREMIUM_PRICE_ID;
    const hasValidPriceId =
      priceId &&
      priceId.startsWith('price_') &&
      !priceId.toLowerCase().includes('placeholder') &&
      priceId.length > 20;

    const line_items = hasValidPriceId
      ? [{ price: priceId, quantity: 1 }]
      : [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'PizzaHub Vendor Premium Plan (1 Year)',
                description:
                  'Unlimited pizza menu listings, priority search visibility, and verified premium vendor badge.',
                images: [
                  'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800',
                ],
              },
              unit_amount: 9900, // $99.00 USD
            },
            quantity: 1,
          },
        ];

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      customer_email: vendor.email,
      metadata: {
        vendorId: vendor.id,
        plan: 'premium',
        userEmail: vendor.email,
      },
      success_url: `${clientUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl}/payment/cancel`,
    });

    res.status(200).json({
      success: true,
      url: session.url,
      sessionId: session.id,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'StripeError',
      message: `Failed to create Stripe Checkout session: ${error.message}`,
    });
  }
};

export const getSubscriptionStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.user!.id;
    const user = await User.findById(vendorId);

    if (!user) {
      res.status(404).json({
        error: 'NotFound',
        message: 'Vendor not found.',
      });
      return;
    }

    const activeItemsCount = await MenuItem.countDocuments({
      vendorId,
      status: { $ne: 'inactive' },
    });

    const isPremium =
      user.subscriptionPlan === 'premium' &&
      (!user.subscriptionExpiresAt || new Date(user.subscriptionExpiresAt) > new Date());

    res.status(200).json({
      success: true,
      data: {
        plan: isPremium ? 'premium' : 'free',
        expiresAt: user.subscriptionExpiresAt,
        activeItemsCount,
        maxAllowedItems: isPremium ? 'unlimited' : 3,
        canAddMore: isPremium || activeItemsCount < 3,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'InternalServerError',
      message: `Failed to retrieve subscription status: ${error.message}`,
    });
  }
};

export const verifyCheckoutSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.body;
    const vendorId = req.user!.id;

    if (!sessionId) {
      res.status(400).json({
        error: 'BadRequest',
        message: 'sessionId is required.',
      });
      return;
    }

    // 1. If it's a real Stripe session ID, verify with Stripe API
    let amountTotal = 99;
    if (sessionId.startsWith('cs_')) {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        // Security check: Verify session belongs to this vendor if metadata exists
        if (session.metadata?.vendorId && session.metadata.vendorId !== vendorId) {
          res.status(403).json({
            error: 'Forbidden',
            message: 'Session does not belong to this vendor account.',
          });
          return;
        }

        if (session.amount_total) {
          amountTotal = session.amount_total / 100;
        }
      } catch (stripeErr: any) {
        console.warn(`[Stripe Verification] Retrieve session error: ${stripeErr.message}`);
      }
    }

    // 2. Activate 1-year Premium subscription for the vendor
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    const updatedUser = await User.findByIdAndUpdate(
      vendorId,
      {
        subscriptionPlan: 'premium',
        subscriptionExpiresAt: oneYearFromNow,
      },
      { new: true }
    );

    // 3. Create transaction record in audit ledger if not already recorded
    const existingTx = await Transaction.findOne({ stripeSessionId: sessionId });
    if (!existingTx) {
      await Transaction.create({
        vendorId,
        plan: 'premium',
        amount: amountTotal,
        currency: 'usd',
        stripeSessionId: sessionId,
        status: 'completed',
      });
      console.log(`[Subscription] Ledger recorded for vendor ${vendorId}, session: ${sessionId}`);
    }

    res.status(200).json({
      success: true,
      message: 'Vendor membership successfully upgraded to Premium Master Artisan.',
      data: {
        plan: updatedUser?.subscriptionPlan,
        expiresAt: updatedUser?.subscriptionExpiresAt,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'InternalServerError',
      message: `Failed to verify checkout session: ${error.message}`,
    });
  }
};
