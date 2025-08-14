/**
 * Stripe Webhook Routes
 * 
 * Secure webhook handling that validates before touching req.body or event.data.object
 */

import { Router } from 'express';
import bodyParser from 'body-parser';
import Stripe from 'stripe';
import { ENV } from '../env';
import { db } from '../db';
import { registrations } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { validateStripeWebhook, WebhookHandlers, WebhookTypeGuards } from '../webhook-validation';
import { sendOk, sendErr, catchAsync } from '../api-response';
import { invariant, unwrap, assertNonEmpty } from '../safe';

const router = Router();

// Initialize Stripe only if configured
let stripe: Stripe | null = null;
if (ENV.STRIPE_SECRET_KEY) {
  stripe = new Stripe(ENV.STRIPE_SECRET_KEY, {
    apiVersion: '2024-12-18.acacia',
  });
  console.log('✅ Stripe initialized for webhook processing');
} else {
  console.log('⚠️  Stripe not configured - webhook routes will return 503');
}

/**
 * Stripe Webhook Handler
 * 
 * CRITICAL SECURITY: Uses bodyParser.raw and validates signature before accessing data
 * 
 * Flow:
 * 1. bodyParser.raw preserves raw buffer (required for signature validation)
 * 2. validateStripeWebhook() verifies signature and returns typed event
 * 3. Only then do we access event.data.object safely
 */
router.post('/stripe', 
  // CRITICAL: Use bodyParser.raw for webhook signature verification
  bodyParser.raw({ type: 'application/json' }),
  catchAsync(async (req, res) => {
    // Fail fast if Stripe not configured
    if (!stripe) {
      return sendErr(res, 'Stripe not configured', 503, 'STRIPE_NOT_CONFIGURED');
    }

    // NEVER touch req.body or event.data.object until validation passes
    console.log('🔒 Validating webhook signature...');
    
    let event: Stripe.Event;
    try {
      // This validates signature and returns typed event
      event = validateStripeWebhook(req, stripe);
    } catch (error: any) {
      console.error('❌ Webhook validation failed:', error.message);
      return sendErr(res, 'Webhook signature verification failed', 400, 'WEBHOOK_VALIDATION_ERROR');
    }

    console.log(`✅ Processing validated webhook: ${event.type}`);

    // Now we can safely handle the validated event
    try {
      await handleValidatedWebhookEvent(event);
      return sendOk(res, { received: true, eventId: event.id, eventType: event.type });
    } catch (error: any) {
      console.error('Webhook processing error:', error);
      return sendErr(res, 'Webhook processing failed', 500, 'WEBHOOK_PROCESSING_ERROR', error.message);
    }
  })
);

/**
 * Handle a validated Stripe webhook event
 * 
 * @param event - Already validated Stripe event (safe to access data)
 */
async function handleValidatedWebhookEvent(event: Stripe.Event): Promise<void> {
  console.log(`Processing event: ${event.type} (${event.id})`);

  // Handle checkout.session.completed
  if (WebhookTypeGuards.isCheckoutSessionCompleted(event)) {
    await handleCheckoutSessionCompleted(event);
    return;
  }

  // Handle invoice.payment_succeeded
  if (WebhookTypeGuards.isInvoicePaymentSucceeded(event)) {
    await handleInvoicePaymentSucceeded(event);
    return;
  }

  // Handle subscription updates
  if (WebhookTypeGuards.isSubscriptionUpdated(event)) {
    await handleSubscriptionUpdated(event);
    return;
  }

  // Log unhandled events (not an error)
  console.log(`ℹ️  Unhandled webhook event type: ${event.type}`);
}

/**
 * Handle checkout.session.completed webhook
 * 
 * Updates registration status when payment is completed
 */
async function handleCheckoutSessionCompleted(event: Stripe.Event & { data: { object: Stripe.Checkout.Session } }): Promise<void> {
  // Use type-safe handler to validate and extract session
  const session = WebhookHandlers.checkoutSessionCompleted(event);
  
  // Validate required session data
  invariant(session.id, 'Session ID is required');
  assertNonEmpty(session.id, 'Session ID cannot be empty');
  
  console.log('💳 Processing checkout session completion:', {
    sessionId: session.id,
    paymentStatus: session.payment_status,
    customerEmail: session.customer_details?.email,
    amountTotal: session.amount_total,
  });

  // Update registration status in database
  try {
    const result = await db
      .update(registrations)
      .set({ 
        status: session.payment_status === 'paid' ? 'COMPLETED' : 'FAILED',
        stripeCustomerId: session.customer as string || null,
        completedAt: new Date(),
      })
      .where(eq(registrations.stripeCheckoutSessionId, session.id))
      .returning();

    if (result.length === 0) {
      console.warn(`⚠️  No registration found for session ${session.id}`);
      return;
    }

    const registration = result[0];
    console.log('✅ Registration updated:', {
      registrationId: registration.id,
      status: registration.status,
      schoolName: registration.schoolName,
      adminEmail: registration.adminEmail,
    });

    // If payment succeeded, trigger school setup
    if (session.payment_status === 'paid') {
      await triggerSchoolSetup(registration);
    }

  } catch (error: any) {
    console.error('Database update failed:', error);
    throw new Error(`Failed to update registration: ${error.message}`);
  }
}

/**
 * Handle invoice.payment_succeeded webhook
 * 
 * Updates subscription billing status
 */
async function handleInvoicePaymentSucceeded(event: Stripe.Event & { data: { object: Stripe.Invoice } }): Promise<void> {
  const invoice = WebhookHandlers.invoicePaymentSucceeded(event);
  
  console.log('💰 Processing invoice payment success:', {
    invoiceId: invoice.id,
    amountPaid: invoice.amount_paid,
    customerId: invoice.customer,
  });

  // Update subscription/billing records
  // Implementation depends on your billing schema
}

/**
 * Handle customer.subscription.updated webhook
 * 
 * Tracks subscription changes
 */
async function handleSubscriptionUpdated(event: Stripe.Event & { data: { object: Stripe.Subscription } }): Promise<void> {
  const subscription = WebhookHandlers.subscriptionUpdated(event);
  
  console.log('🔄 Processing subscription update:', {
    subscriptionId: subscription.id,
    status: subscription.status,
    customerId: subscription.customer,
  });

  // Update subscription records
  // Implementation depends on your subscription schema
}

/**
 * Trigger school setup after successful payment
 * 
 * Creates school account and admin user
 */
async function triggerSchoolSetup(registration: typeof registrations.$inferSelect): Promise<void> {
  console.log('🏫 Triggering school setup for:', registration.schoolName);
  
  // Implementation would:
  // 1. Create school record
  // 2. Create admin user account
  // 3. Send welcome email
  // 4. Set up initial configuration
  
  // For now, just log the trigger
  console.log('✅ School setup triggered (implementation pending)');
}

export default router;