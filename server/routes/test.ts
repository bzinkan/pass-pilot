/**
 * Development-only test routes for duplicate school checking
 * These routes are disabled in production for security
 */

import { Router } from 'express';
import { storage } from '../storage';
import { normalizeSchoolSlug } from '../utils/schoolSlug';

export const testRouter = Router();

// Development-only test route for duplicate school guard
testRouter.post('/__test__/createSchool', async (req, res) => {
  // Disable in production for security
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).end();
  }

  try {
    const { name } = req.body || {};
    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }

    const slug = normalizeSchoolSlug(name);
    console.log(`[TEST] Checking for duplicate school slug: ${slug}`);

    // Check if school with this slug already exists
    const existing = await storage.getSchoolBySlug(slug);
    if (existing) {
      console.log(`[TEST] Duplicate found: ${existing.name}`);
      return res.status(409).json({ 
        error: 'School already exists',
        existing: { id: existing.id, name: existing.name, slug: existing.slug }
      });
    }

    // Create test school
    const schoolData = {
      schoolId: `test_${Date.now()}`,
      name,
      slug,
      plan: 'TRIAL' as const,
      adminEmail: `test-${Date.now()}@example.com`,
      maxTeachers: 1,
      maxStudents: 200,
      verified: true,
      isTrialExpired: false
    };

    const school = await storage.createSchool(schoolData);
    console.log(`[TEST] Created test school: ${school.name} (${school.slug})`);

    return res.status(201).json({ 
      id: school.id, 
      name: school.name,
      slug: school.slug 
    });

  } catch (error: any) {
    console.error('[TEST] Error creating school:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Test route to check slug generation
testRouter.post('/__test__/checkSlug', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).end();
  }

  try {
    const { name } = req.body || {};
    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }

    const slug = normalizeSchoolSlug(name);
    const existing = await storage.getSchoolBySlug(slug);

    return res.json({
      name,
      slug,
      exists: !!existing,
      existing: existing ? { 
        id: existing.id, 
        name: existing.name, 
        slug: existing.slug 
      } : null
    });

  } catch (error: any) {
    console.error('[TEST] Error checking slug:', error);
    return res.status(500).json({ error: error.message });
  }
});