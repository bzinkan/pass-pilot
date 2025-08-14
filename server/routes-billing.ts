import type { Express, Request, Response } from "express";
import Stripe from "stripe";
import { storage } from "./storage";
import { insertPaymentSchema } from "@shared/schema";
import { setUserSession } from "./auth/session";

// Plan configuration with Stripe Price IDs
const PLAN_CONFIG = {
  TRIAL: { 
    maxTeachers: 1, 
    maxStudents: 200, 
    price: null, // Free trial 
    name: "Free Trial",
    duration: "14 days"
  },
  TEACHER_MONTHLY: { 
    maxTeachers: 1, 
    maxStudents: 200, 
    price: process.env.STRIPE_PRICE_TEACHER_MONTHLY || '',
    name: "Teacher Plan",
    duration: "monthly"
  },
  TEACHER_ANNUAL: { 
    maxTeachers: 1, 
    maxStudents: 200, 
    price: process.env.STRIPE_PRICE_TEACHER_ANNUAL || '',
    name: "Teacher Plan",
    duration: "yearly"
  },
  SMALL_TEAM_MONTHLY: { 
    maxTeachers: 10, 
    maxStudents: 1500, 
    price: process.env.STRIPE_PRICE_SMALL_TEAM_MONTHLY || '',
    name: "Small Team Plan",
    duration: "monthly"
  },
  SMALL_TEAM_ANNUAL: { 
    maxTeachers: 10, 
    maxStudents: 1500, 
    price: process.env.STRIPE_PRICE_SMALL_TEAM_ANNUAL || '',
    name: "Small Team Plan",
    duration: "yearly"
  },
  SMALL_SCHOOL: { 
    maxTeachers: -1, 
    maxStudents: 500, 
    price: process.env.STRIPE_PRICE_SMALL_SCHOOL || '',
    name: "Small School Plan",
    duration: "yearly"
  },
  MEDIUM_SCHOOL: { 
    maxTeachers: -1, 
    maxStudents: 1000, 
    price: process.env.STRIPE_PRICE_MEDIUM_SCHOOL || '',
    name: "Medium School Plan",
    duration: "yearly"
  },
  LARGE_SCHOOL: { 
    maxTeachers: -1, 
    maxStudents: 2000, 
    price: process.env.STRIPE_PRICE_LARGE_SCHOOL || '',
    name: "Large School Plan",
    duration: "yearly"
  }
} as const;
import { z } from "zod";

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// Define plan type
type Plan = 'TRIAL' | 'TEACHER_MONTHLY' | 'TEACHER_ANNUAL' | 'SMALL_TEAM_MONTHLY' | 'SMALL_TEAM_ANNUAL' | 'SMALL_SCHOOL' | 'MEDIUM_SCHOOL' | 'LARGE_SCHOOL';

// Registration endpoint for Stripe checkout
export async function register(req: Request, res: Response) {
  try {
    const { schoolName, adminName, email, plan } = req.body as {
      schoolName: string; 
      adminName: string; 
      email: string; 
      plan: Plan;
    };

    if (!schoolName || !adminName || !email) {
      return res.status(400).json({ ok: false, error: 'Missing required fields' });
    }

    // Validate plan
    const planConfig = PLAN_CONFIG[plan || 'TRIAL'];
    if (!planConfig) {
      return res.status(400).json({ ok: false, error: 'Invalid plan selected' });
    }

    // Free trial doesn't need Stripe
    if (plan === 'TRIAL' || !plan) {
      return res.json({ 
        ok: true, 
        message: 'Trial registration completed', 
        checkoutUrl: null 
      });
    }

    // Check if school already exists
    const existingSchool = await storage.getUserByEmail(email);
    let schoolId: string;
    let stripeCustomerId = existingSchool?.schoolId ? 
      (await storage.getSchool(existingSchool.schoolId))?.stripeCustomerId : null;

    if (existingSchool?.schoolId) {
      schoolId = existingSchool.schoolId;
      // Update school info
      await storage.updateSchool(schoolId, { 
        name: schoolName,
        plan: plan as any,
        status: 'PENDING' as any,
        maxTeachers: planConfig.maxTeachers,
        maxStudents: planConfig.maxStudents
      });
    } else {
      // Create new school
      const newSchool = await storage.createSchool({
        schoolId: `school_${Date.now()}`,
        name: schoolName,
        emailDomain: email.split('@')[1],
        plan: plan as any,
        status: 'PENDING' as any,
        maxTeachers: planConfig.maxTeachers,
        maxStudents: planConfig.maxStudents,
        adminEmail: email,
        verified: false
      });
      schoolId = newSchool.id;
    }

    // Create or get Stripe customer
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({ 
        email, 
        name: `${adminName} (${schoolName})`,
        metadata: { schoolId, plan }
      });
      stripeCustomerId = customer.id;
      await storage.updateSchool(schoolId, { stripeCustomerId });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [{ 
        price: planConfig.price,
        quantity: 1 
      }],
      success_url: `${process.env.APP_URL || 'http://localhost:5000'}/api/billing/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL || 'http://localhost:5000'}/register`,
      metadata: { 
        schoolId, 
        email, 
        plan 
      },
    });

    return res.json({ 
      ok: true, 
      checkoutUrl: session.url 
    });

  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({ 
      ok: false, 
      error: 'Registration failed' 
    });
  }
}

// Stripe webhook handler
export const stripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body, 
      sig, 
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const schoolId = session.metadata?.schoolId;
        const plan = session.metadata?.plan as Plan;
        const subId = session.subscription as string;

        if (schoolId && plan) {
          // Update school to active status
          await storage.updateSchool(schoolId, {
            status: 'ACTIVE' as any,
            plan: plan as any,
            stripeSubscriptionId: subId
          });

          // Record payment
          await storage.createPayment({
            schoolId,
            amountCents: session.amount_total || 0,
            currency: session.currency || 'usd',
            stripePiId: session.payment_intent as string,
            stripeSessId: session.id,
            plan: plan as any,
            status: 'succeeded'
          });

          console.log(`School ${schoolId} subscription activated with plan ${plan}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const subscriptionId = subscription.id;
        
        // Find school by subscription ID instead of metadata (more reliable)
        const schools = await storage.getAllSchools();
        const school = schools.find(s => s.stripeSubscriptionId === subscriptionId);
        
        if (school) {
          await storage.updateSchool(school.id, {
            status: 'CANCELLED' as any,
            subscriptionCancelledAt: new Date(),
            subscriptionEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
          });
          
          console.log(`School ${school.id} subscription cancelled via subscription ID lookup`);
        } else {
          console.log(`No school found for cancelled subscription ${subscriptionId}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const subscriptionId = subscription.id;
        const priceId = subscription.items.data[0]?.price?.id;
        
        // Map price ID to plan
        const planMapping: Record<string, Plan> = {
          'price_1RuILiBw14YCsyD6O5rn8hS8': 'TEACHER_MONTHLY',
          'price_1RuILoBw14YCsyD6TZKw5xJ4': 'TEACHER_ANNUAL', 
          'price_1RuIMXBw14YCsyD6qGxYkpRK': 'SMALL_TEAM_MONTHLY',
          'price_1RuIMaBw14YCsyD6YJeUqL4D': 'SMALL_TEAM_ANNUAL',
          'price_1RuIMdBw14YCsyD6kMEIEhTG': 'LARGE_SCHOOL'
        };
        
        const newPlan = planMapping[priceId || ''];
        
        // Find school by subscription ID
        const schools = await storage.getAllSchools();
        const school = schools.find(s => s.stripeSubscriptionId === subscriptionId);
        
        if (school && newPlan) {
          await storage.updateSchool(school.id, {
            plan: newPlan as any
          });
          
          console.log(`School ${school.id} plan updated to ${newPlan} via subscription ID lookup`);
        } else if (!school) {
          console.log(`No school found for updated subscription ${subscriptionId}`);
        } else {
          console.log(`Unknown price ID ${priceId} for subscription ${subscriptionId}`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        
        // Could add logic to notify school of payment failure
        console.log(`Payment failed for customer ${customerId}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

// Checkout success handler - processes payment and logs user in
export async function handleCheckoutSuccess(req: Request, res: Response) {
  try {
    const sessionId = req.query.session_id as string;
    if (!sessionId) {
      return res.redirect('/register?error=missing_session');
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer']
    });

    const schoolId = session.metadata?.schoolId;
    const email = session.metadata?.email;
    const plan = session.metadata?.plan;

    if (!schoolId || !email) {
      return res.redirect('/register?error=invalid_session');
    }

    // Get the school and admin user
    const school = await storage.getSchool(schoolId);
    const adminUser = await storage.getUserByEmail(email);

    if (!school || !adminUser) {
      return res.redirect('/register?error=account_not_found');
    }

    // Update school status to ACTIVE
    await storage.updateSchool(schoolId, {
      status: 'ACTIVE' as any,
      plan: plan as any,
      stripeSubscriptionId: session.subscription as string,
      verified: true
    });

    // Create user session - auto-login
    setUserSession(res, {
      userId: adminUser.id,
      schoolId: school.id,
      email: adminUser.email,
      role: 'ADMIN'
    });

    console.log(`Auto-login successful for ${email} after payment completion`);

    // Redirect to the main app (logged in)
    return res.redirect('/');

  } catch (error: any) {
    console.error('Checkout success error:', error);
    return res.redirect('/register?error=processing_failed');
  }
}

// Admin endpoints for viewing billing data
export async function listSchools(req: Request, res: Response) {
  try {
    const schools = await storage.getAllSchools();
    res.json(schools);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function listPayments(req: Request, res: Response) {
  try {
    const payments = await storage.getAllPayments();
    res.json(payments.slice(0, 200)); // Limit to recent 200
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// Customer portal for managing subscriptions
export async function createPortalSession(req: Request, res: Response) {
  try {
    const { customerId } = req.body;
    
    if (!customerId) {
      return res.status(400).json({ error: 'Customer ID required' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.APP_URL || 'http://localhost:5000'}/billing`
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Portal session error:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
}