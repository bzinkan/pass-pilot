/**
 * Stripe Webhook Validation
 * 
 * Validate webhooks before touching req.body or event.data.object
 * This prevents malicious webhook payloads from being processed.
 */

import Stripe from 'stripe';
import { Request, Response } from 'express';
import { ENV } from './env';
import { invariant, assertNonEmpty } from './safe';
import { sendErr } from './api-response';

/**
 * Validates and constructs a Stripe webhook event
 * 
 * CRITICAL: Never touch req.body or event.data.object until this validation passes
 * 
 * @param req - Express request (must use bodyParser.raw for webhooks)
 * @param stripe - Configured Stripe instance
 * @returns Validated and typed Stripe event
 * @throws Error if webhook signature is invalid
 */
export function validateStripeWebhook(req: Request, stripe: Stripe): Stripe.Event {
  // First, validate we have the required signature header
  const sig = req.headers["stripe-signature"];
  invariant(typeof sig === "string", "Missing stripe signature header");
  assertNonEmpty(sig, "Stripe signature cannot be empty");

  // Validate we have the webhook secret configured
  invariant(ENV.STRIPE_WEBHOOK_SECRET, "STRIPE_WEBHOOK_SECRET not configured");
  assertNonEmpty(ENV.STRIPE_WEBHOOK_SECRET, "STRIPE_WEBHOOK_SECRET cannot be empty");

  // Validate raw body exists (bodyParser.raw should provide this)
  invariant(req.body, "Webhook body is missing - ensure bodyParser.raw is used");
  invariant(Buffer.isBuffer(req.body), "Webhook body must be raw buffer - check bodyParser configuration");

  // Now attempt to construct and verify the event
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      ENV.STRIPE_WEBHOOK_SECRET
    );
  } catch (error: any) {
    // Log the error for debugging but don't expose internal details
    console.error('Stripe webhook validation failed:', {
      error: error.message,
      signature: sig.substring(0, 20) + '...', // Log partial signature for debugging
      bodyLength: req.body?.length || 0,
    });
    
    throw new Error(`Webhook signature verification failed: ${error.message}`);
  }

  // Additional validation checks
  invariant(event.id, "Event must have an ID");
  invariant(event.type, "Event must have a type");
  invariant(event.data, "Event must have data");
  invariant(event.data.object, "Event data must have an object");

  console.log('✅ Stripe webhook validated successfully:', {
    eventId: event.id,
    eventType: event.type,
    created: new Date(event.created * 1000).toISOString(),
  });

  return event;
}

/**
 * Middleware wrapper for Stripe webhook validation
 * 
 * Use this to wrap webhook routes and ensure validation happens first
 * 
 * @example
 * app.post('/api/stripe/webhook', 
 *   bodyParser.raw({ type: 'application/json' }),
 *   withStripeWebhookValidation(stripe),
 *   (req, res) => {
 *     // req.stripeEvent is now validated and typed
 *     const event = req.stripeEvent;
 *     // Safe to access event.data.object now
 *   }
 * );
 */
export function withStripeWebhookValidation(stripe: Stripe) {
  return (req: any, res: Response, next: any) => {
    try {
      // Validate the webhook and attach to request
      req.stripeEvent = validateStripeWebhook(req, stripe);
      next();
    } catch (error: any) {
      console.error('Webhook validation middleware failed:', error.message);
      return sendErr(res, 'Webhook signature verification failed', 400, 'WEBHOOK_VALIDATION_ERROR');
    }
  };
}

/**
 * Type-safe webhook event handlers
 * 
 * These handlers ensure the event type matches before processing
 */
export const WebhookHandlers = {
  /**
   * Handle checkout.session.completed events
   */
  checkoutSessionCompleted: (event: Stripe.Event) => {
    invariant(event.type === 'checkout.session.completed', 'Invalid event type for checkout session handler');
    
    // Now we can safely access the session object
    const session = event.data.object as Stripe.Checkout.Session;
    
    // Validate required session properties
    invariant(session.id, 'Session must have ID');
    invariant(session.payment_status, 'Session must have payment status');
    
    console.log('Processing checkout session:', {
      sessionId: session.id,
      paymentStatus: session.payment_status,
      customerEmail: session.customer_details?.email,
      amountTotal: session.amount_total,
    });
    
    return session;
  },

  /**
   * Handle invoice.payment_succeeded events
   */
  invoicePaymentSucceeded: (event: Stripe.Event) => {
    invariant(event.type === 'invoice.payment_succeeded', 'Invalid event type for invoice handler');
    
    const invoice = event.data.object as Stripe.Invoice;
    
    invariant(invoice.id, 'Invoice must have ID');
    invariant(invoice.status, 'Invoice must have status');
    
    console.log('Processing invoice payment:', {
      invoiceId: invoice.id,
      status: invoice.status,
      amountPaid: invoice.amount_paid,
      customerId: invoice.customer,
    });
    
    return invoice;
  },

  /**
   * Handle customer.subscription.updated events
   */
  subscriptionUpdated: (event: Stripe.Event) => {
    invariant(event.type === 'customer.subscription.updated', 'Invalid event type for subscription handler');
    
    const subscription = event.data.object as Stripe.Subscription;
    
    invariant(subscription.id, 'Subscription must have ID');
    invariant(subscription.status, 'Subscription must have status');
    
    console.log('Processing subscription update:', {
      subscriptionId: subscription.id,
      status: subscription.status,
      customerId: subscription.customer,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
    });
    
    return subscription;
  },
};

/**
 * Webhook event type guards for safe type narrowing
 */
export const WebhookTypeGuards = {
  isCheckoutSessionCompleted: (event: Stripe.Event): event is Stripe.Event & { data: { object: Stripe.Checkout.Session } } => {
    return event.type === 'checkout.session.completed';
  },

  isInvoicePaymentSucceeded: (event: Stripe.Event): event is Stripe.Event & { data: { object: Stripe.Invoice } } => {
    return event.type === 'invoice.payment_succeeded';
  },

  isSubscriptionUpdated: (event: Stripe.Event): event is Stripe.Event & { data: { object: Stripe.Subscription } } => {
    return event.type === 'customer.subscription.updated';
  },
};