// server/stripe/webhook-v2.ts
import Stripe from "stripe";
import bodyParser from "body-parser";
import type { Express } from "express";
import { ENV } from "../env";
import { db } from "../db";
import { registrations, schools, users } from "../../shared/schema";
import { generateUniqueSlug } from "../utils/slugify";
import { eq } from "drizzle-orm";

export function registerStripeWebhook(app: Express) {
  if (!ENV.STRIPE_SECRET_KEY || !ENV.STRIPE_WEBHOOK_SECRET) {
    console.warn("Stripe configuration missing, webhook not registered");
    return;
  }
  const stripe = new Stripe(ENV.STRIPE_SECRET_KEY, { apiVersion: "2025-07-30.basil" });

  app.post("/api/stripe/webhook", bodyParser.raw({ type: "application/json" }), async (req, res) => {
    const sig = req.headers["stripe-signature"] as string | undefined;
    let event: Stripe.Event;
    
    try {
      if (!sig) throw new Error("Missing stripe-signature header");
      event = stripe.webhooks.constructEvent(req.body, sig, ENV.STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const s = event.data.object as Stripe.Checkout.Session;
      const md = (s.metadata ?? {}) as Record<string, string>;
      const schoolName = md.schoolName || "";
      const adminEmail = md.adminEmail || "";
      const plan = (md.plan || "TRIAL") as any;
      const slug = await generateUniqueSlug(schoolName);

      try {
        // Idempotency: if already ACTIVE for this session, ack
        const [existing] = await db.select().from(registrations).where(eq(registrations.stripeCheckoutSessionId, s.id)).limit(1);
        if (existing?.status === "ACTIVE") {
          console.log(`Registration ${s.id} already ACTIVE, skipping`);
          return res.json({ received: true });
        }

        await db.transaction(async (tx) => {
          // Ensure registration row exists
          if (!existing) {
            await tx.insert(registrations).values({
              adminEmail, 
              schoolName, 
              plan, 
              stripeCheckoutSessionId: s.id, 
              stripeCustomerId: String(s.customer || "")
            }).onConflictDoNothing();
          }

          // Create school
          const [school] = await tx.insert(schools).values({
            name: schoolName,
            slug,
            plan,
            status: "ACTIVE",
            stripeCustomerId: String(s.customer || ""),
          }).onConflictDoNothing().returning();

          // Create admin user (SUPER_ADMIN role)
          if (school) {
            await tx.insert(users).values({
              email: adminEmail,
              firstName: "Admin", // Will be updated on first login
              lastName: "User",
              password: "", // Will be set on first login
              role: "SUPER_ADMIN",
              isAdmin: true,
              isFirstLogin: true,
              schoolId: school.id,
            }).onConflictDoNothing();
          }

          // Mark registration ACTIVE
          await tx.update(registrations).set({
            status: "ACTIVE",
            stripeCustomerId: String(s.customer || ""),
          }).where(eq(registrations.stripeCheckoutSessionId, s.id));
        });

        console.log(`Successfully provisioned school "${schoolName}" for ${adminEmail}`);
      } catch (error: any) {
        console.error('Error processing webhook:', error);
        // Mark registration as FAILED
        try {
          await db.update(registrations).set({ status: "FAILED" }).where(eq(registrations.stripeCheckoutSessionId, s.id));
        } catch (updateError) {
          console.error('Failed to update registration status to FAILED:', updateError);
        }
        return res.status(500).json({ error: 'Failed to process registration' });
      }
    }

    res.json({ received: true });
  });
}