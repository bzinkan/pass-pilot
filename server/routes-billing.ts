import type { Express } from 'express';
import { requireUser, requireAdmin, type AuthenticatedRequest } from './auth/requireUser';
import { setUserSession } from './auth/session';
import { storage } from './storage';

export function registerBillingRoutes(app: Express) {
  // Create Stripe checkout session for school subscription
  app.post('/api/billing/checkout', requireAdmin, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { plan, successUrl, cancelUrl } = req.body;
      
      // For now, we'll simulate a checkout process without Stripe
      // This will be enhanced when Stripe keys are available
      
      const school = await storage.getSchool(authReq.user.schoolId);
      if (!school) {
        return res.status(404).json({ error: 'School not found' });
      }

      // Simulate checkout session creation
      const checkoutSession = {
        id: `cs_test_${Date.now()}`,
        url: `${successUrl}?session_id=cs_test_${Date.now()}&plan=${plan}`,
        payment_status: 'unpaid',
        metadata: {
          school_id: school.id,
          school_name: school.name,
          admin_email: authReq.user.userId,
          plan: plan
        }
      };

      return res.json({
        sessionId: checkoutSession.id,
        url: checkoutSession.url
      });

    } catch (error: any) {
      console.error('Checkout creation error:', error);
      return res.status(500).json({ error: 'Failed to create checkout session' });
    }
  });

  // Handle successful payment (mock for now)
  app.get('/api/billing/success', async (req, res) => {
    try {
      const { session_id, plan } = req.query;
      
      if (!session_id) {
        return res.status(400).json({ error: 'Missing session_id' });
      }

      // In a real implementation, we'd verify the session with Stripe
      // For now, we'll simulate a successful payment
      
      // Extract school info from session (in real implementation, from Stripe)
      const schoolId = 'temp_school_id'; // Would come from Stripe metadata
      const adminEmail = 'admin@example.com'; // Would come from Stripe customer
      
      // Update school plan
      const planDetails = {
        basic: { maxTeachers: 10, maxStudents: 500 },
        standard: { maxTeachers: 25, maxStudents: 1000 },
        premium: { maxTeachers: 50, maxStudents: 2000 }
      };
      
      const planInfo = planDetails[plan as keyof typeof planDetails] || planDetails.basic;
      
      // This would be done via webhook in production
      // await storage.upgradeSchoolPlan(schoolId, plan as string, planInfo.maxTeachers, planInfo.maxStudents);
      
      return res.redirect('/app?payment=success');
      
    } catch (error: any) {
      console.error('Payment success handling error:', error);
      return res.redirect('/app?payment=error');
    }
  });

  // Get billing information for a school
  app.get('/api/billing/info', requireAdmin, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const school = await storage.getSchool(authReq.user.schoolId);
      
      if (!school) {
        return res.status(404).json({ error: 'School not found' });
      }

      const billingInfo = {
        plan: school.plan,
        status: school.status,
        maxTeachers: school.maxTeachers,
        maxStudents: school.maxStudents,
        currentTeachers: school.currentTeachers,
        currentStudents: school.currentStudents,
        trialEndDate: school.trialEndDate,
        isTrialExpired: school.isTrialExpired,
        stripeCustomerId: school.stripeCustomerId,
        stripeSubscriptionId: school.stripeSubscriptionId
      };

      return res.json(billingInfo);
      
    } catch (error: any) {
      console.error('Get billing info error:', error);
      return res.status(500).json({ error: 'Failed to get billing information' });
    }
  });

  // Cancel subscription
  app.post('/api/billing/cancel', requireAdmin, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      
      // In real implementation, cancel Stripe subscription
      // For now, just update the school status
      
      await storage.updateSchool(authReq.user.schoolId, {
        status: 'cancelled',
        subscriptionStatus: 'cancelled'
      });

      return res.json({ success: true, message: 'Subscription cancelled successfully' });
      
    } catch (error: any) {
      console.error('Cancel subscription error:', error);
      return res.status(500).json({ error: 'Failed to cancel subscription' });
    }
  });

  // Note: Webhook is now handled directly in server/index.ts to avoid circular imports
}

// Export standalone webhook handler for use in server/index.ts
export async function stripeWebhook(req: any, res: any) {
  try {
    // This will be implemented when Stripe webhook secret is available
    // For now, just acknowledge the webhook
    
    console.log('Webhook received:', req.body);
    res.status(200).json({ received: true });
    
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    res.status(400).json({ error: 'Webhook processing failed' });
  }
}