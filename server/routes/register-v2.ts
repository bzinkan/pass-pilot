// server/routes/register-v2.ts
import { z } from "zod";
import Stripe from "stripe";
import type { Express } from "express";
import { registrations } from "../../shared/schema";
import { db } from "../db";
import { priceIdForPlan, type Plan } from "../utils/priceId";
import { ENV } from "../env";
import { eq } from "drizzle-orm";

const Body = z.object({
  schoolName: z.string().min(2),
  adminEmail: z.string().email(),
  plan: z.enum(["TRIAL","BASIC","SMALL","MEDIUM","LARGE","UNLIMITED"]) as unknown as z.ZodType<Plan>,
});

function originFromRequest(req: any) {
  const proto = (req.headers["x-forwarded-proto"] || "http").toString();
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}`;
}

export function registerV2Routes(app: Express) {
  if (!ENV.STRIPE_SECRET_KEY) {
    console.warn("STRIPE_SECRET_KEY not configured, V2 registration routes will work in demo mode");
  }
  
  const stripe = ENV.STRIPE_SECRET_KEY ? new Stripe(ENV.STRIPE_SECRET_KEY, { apiVersion: "2025-07-30.basil" }) : null;

  app.post("/api/register/init", async (req, res) => {
    try {
      const parsed = Body.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ ok: false, error: "Invalid body" });
      const { schoolName, adminEmail, plan } = parsed.data;

      let session: any;
      if (stripe) {
        session = await stripe.checkout.sessions.create({
          mode: "subscription",
          line_items: [{ price: priceIdForPlan(plan), quantity: 1 }],
          success_url: `${originFromRequest(req)}/register/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${originFromRequest(req)}/register/cancel`,
          metadata: { schoolName, adminEmail, plan },
          client_reference_id: adminEmail,
        });
      } else {
        // Demo mode - create a fake session
        session = {
          id: `cs_demo_${Date.now()}`,
          url: `${originFromRequest(req)}/register/success?session_id=cs_demo_${Date.now()}`
        };
      }

      // Optional visibility row; idempotent insert via unique session id handled on webhook
      await db.insert(registrations).values({
        adminEmail,
        schoolName,
        plan,
        stripeCheckoutSessionId: session.id,
      }).onConflictDoNothing();

      res.json({ ok: true, url: session.url });
    } catch (error: any) {
      console.error('Registration init error:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.get("/api/register/status", async (req, res) => {
    try {
      const sessionId = String(req.query.session_id || "");
      if (!sessionId) return res.status(400).json({ ok: false, error: "missing session_id" });
      
      const [row] = await db.select().from(registrations).where(eq(registrations.stripeCheckoutSessionId, sessionId)).limit(1);
      res.json({ ok: true, status: row?.status ?? "PENDING" });
    } catch (error: any) {
      console.error('Registration status error:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  });
}