import type { Express } from "express";
import { eq, desc, count } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "./db";
import { schools, payments, adminUsers, subscriptionEvents } from "@shared/schema";

// JWT helpers for admin authentication
function signAdmin(email: string) {
  return jwt.sign({ role: 'superadmin', email }, process.env.JWT_SECRET!, { expiresIn: '7d' });
}

async function requireAdmin(req: any, res: any, next: any) {
  try {
    const token = req.cookies?.admin;
    if (!token) return res.status(401).send('no-auth');
    
    const payload: any = jwt.verify(token, process.env.JWT_SECRET!);
    if (payload.role !== 'superadmin') return res.status(403).send('forbidden');
    
    const row = await db.select().from(adminUsers).where(eq(adminUsers.email, payload.email)).limit(1);
    if (!row.length) return res.status(401).send('no-admin');
    
    next();
  } catch {
    return res.status(401).send('invalid-token');
  }
}

// Simple rate limiting for login attempts
const loginHits = new Map<string, { count: number; ts: number }>();

function rateLimitLogin(req: any, res: any, next: any) {
  const key = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const now = Date.now();
  const rec = loginHits.get(key) || { count: 0, ts: now };
  
  if (now - rec.ts > 60_000) {
    rec.count = 0;
    rec.ts = now;
  }
  
  rec.count++;
  loginHits.set(key, rec);
  
  if (rec.count > 5) return res.status(429).send('too-many');
  next();
}

export function registerAdminRoutes(app: Express) {
  // Bootstrap (first admin creation) - careful one-time registration
  app.post('/api/admin/bootstrap', async (req, res) => {
    try {
      const { email, password, token } = req.body || {};
      
      if (!email || !password) {
        return res.status(400).json({ ok: false, error: 'missing' });
      }
      
      // Check if any admins already exist
      const [{ value: totalAdmins }] = await db.select({ value: count() }).from(adminUsers);
      
      // Optional bootstrap token check (set ADMIN_BOOTSTRAP_TOKEN in secrets if needed)
      if (process.env.ADMIN_BOOTSTRAP_TOKEN && token !== process.env.ADMIN_BOOTSTRAP_TOKEN) {
        return res.status(401).json({ ok: false, error: 'bad-bootstrap-token' });
      }
      
      // If no bootstrap token is set and admins already exist, prevent creation
      if (!process.env.ADMIN_BOOTSTRAP_TOKEN && totalAdmins > 0) {
        return res.status(403).json({ ok: false, error: 'bootstrap-closed' });
      }
      
      // Hash password and create admin
      const hash = await bcrypt.hash(password, 10);
      
      try {
        await db.insert(adminUsers).values({ email, passwordHash: hash });
      } catch {
        return res.status(409).json({ ok: false, error: 'email-exists' });
      }
      
      // Sign JWT token and set secure cookie
      const jwtToken = signAdmin(email);
      res.cookie('admin', jwtToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
      
      console.log(`✅ Admin user created successfully: ${email}`);
      res.json({ ok: true });
      
    } catch (error: any) {
      console.error('Bootstrap error:', error);
      res.status(500).json({ ok: false, error: 'server-error' });
    }
  });

  // Admin login with rate limiting
  app.post('/api/admin/login', rateLimitLogin, async (req, res) => {
    try {
      const { email, password } = req.body || {};
      
      if (!email || !password) {
        return res.status(400).json({ ok: false, error: 'missing-credentials' });
      }
      
      const row = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
      
      if (!row.length) {
        return res.status(401).send('bad-credentials');
      }
      
      const isValidPassword = await bcrypt.compare(password, row[0].passwordHash);
      
      if (!isValidPassword) {
        return res.status(401).send('bad-credentials');
      }
      
      const token = signAdmin(email);
      res.cookie('admin', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
      
      res.json({ ok: true });
      
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({ ok: false, error: 'server-error' });
    }
  });

  // Admin logout
  app.post('/api/admin/logout', (_req, res) => {
    res.clearCookie('admin', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    res.json({ ok: true });
  });

  // Check admin status (for frontend to determine if bootstrap is needed) - NO AUTH REQUIRED
  app.get('/api/admin/status', async (_req, res) => {
    try {
      const [{ value: totalAdmins }] = await db.select({ value: count() }).from(adminUsers);
      res.json({ hasAdmins: totalAdmins > 0 });
    } catch (error: any) {
      console.error('Admin status error:', error);
      res.status(500).json({ error: 'Failed to check admin status' });
    }
  });

  // Protect all admin APIs with authentication (except status, bootstrap, login, logout)
  app.use('/api/admin', (req: any, res: any, next: any) => {
    // Skip auth for these public endpoints
    if (req.path === '/status' || req.path === '/bootstrap' || req.path === '/login' || req.path === '/logout') {
      return next();
    }
    requireAdmin(req, res, next);
  });

  // Get all schools for usage tracking
  app.get('/api/admin/schools', async (_req, res) => {
    try {
      const allSchools = await db.select().from(schools);
      res.json(allSchools);
    } catch (error: any) {
      console.error('Get schools error:', error);
      res.status(500).json({ error: 'Failed to fetch schools' });
    }
  });

  // Secure hard delete ONE school (children are removed via ON DELETE CASCADE)
  app.delete('/api/admin/schools/:id', async (req, res) => {
    const id = String(req.params.id || '');
    
    // Validate UUID format for security
    if (!/^[0-9a-fA-F-]{36}$/.test(id)) {
      return res.status(400).json({ error: 'bad_id' });
    }

    try {
      // Lookup first (for stripeSubscriptionId + early 404)
      const [target] = await db.select().from(schools).where(eq(schools.id, id)).limit(1);
      if (!target) {
        return res.status(404).json({ error: 'not_found' });
      }

      // Try to cancel Stripe subscription (non-blocking, handle failures gracefully)
      if (target.stripeSubscriptionId && process.env.STRIPE_SECRET_KEY) {
        try { 
          const stripe = await import('stripe').then(m => new m.default(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' }));
          await stripe.subscriptions.cancel(target.stripeSubscriptionId); 
          console.log(`✅ Stripe subscription cancelled: ${target.stripeSubscriptionId}`);
        } catch (e: any) { 
          // Handle 404 specifically (subscription already deleted)
          if (e?.statusCode !== 404) {
            console.error('[admin.delete] stripe cancel failed', e);
          }
        }
      }

      // Transaction: delete parent (cascades to children via ON DELETE CASCADE)
      await db.transaction(async (tx) => {
        await tx.delete(schools).where(eq(schools.id, id));
      });

      console.log(`🗑️ School permanently deleted: ${target.name} (${id})`);
      return res.json({ ok: true, id });
    } catch (e: any) {
      console.error('[admin.delete] unexpected error', e);
      return res.status(500).json({ error: 'delete_failed', detail: e?.message });
    }
  });

  // Get all payments for revenue tracking
  app.get('/api/admin/payments', async (_req, res) => {
    try {
      const allPayments = await db.select().from(payments);
      res.json(allPayments);
    } catch (error: any) {
      console.error('Get payments error:', error);
      res.status(500).json({ error: 'Failed to fetch payments' });
    }
  });

  // Get subscription events for tracking changes
  app.get('/api/admin/events', async (_req, res) => {
    try {
      const events = await db.select()
        .from(subscriptionEvents)
        .orderBy(desc(subscriptionEvents.createdAt))
        .limit(500);
      res.json(events);
    } catch (error: any) {
      console.error('Get events error:', error);
      res.status(500).json({ error: 'Failed to fetch events' });
    }
  });

  // Update school details (admin edit functionality)
  app.patch('/api/admin/schools/:id', async (req, res) => {
    try {
      const { plan, status, maxTeachers, maxStudents, adminEmail } = req.body ?? {};
      
      const updates: any = {
        ...(plan ? { plan } : {}),
        ...(status ? { status } : {}),
        ...(maxTeachers !== undefined ? { maxTeachers } : {}),
        ...(maxStudents !== undefined ? { maxStudents } : {}),
        ...(adminEmail ? { adminEmail } : {}),
      };

      await db.update(schools)
        .set(updates)
        .where(eq(schools.id, req.params.id));
      
      res.json({ ok: true });
    } catch (error: any) {
      console.error('Update school error:', error);
      res.status(500).json({ error: 'Failed to update school' });
    }
  });
}