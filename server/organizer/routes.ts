import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { validate } from '../validate';

interface AuthenticatedRequest extends Request {
  user: { id: string; schoolId: string };
}

// Validation schemas
const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
  color: z.string().optional().default('#3b82f6')
});

const entrySchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().optional(),
  categoryId: z.string().uuid('Invalid category ID'),
  tags: z.array(z.string()).optional().default([]),
  priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  dueDate: z.string().optional()
});

const eventSchema = z.object({
  title: z.string().min(1, 'Event title is required'),
  description: z.string().optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  allDay: z.boolean().optional().default(false)
});

// Category handlers
const listCategories = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { schoolId } = req.user;
    const categories = await storage.getOrganizerCategories(schoolId);
    res.json({ ok: true, data: categories });
  } catch (error: any) {
    console.error('List categories error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch categories' });
  }
};

const createCategory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { schoolId, id: userId } = req.user;
    const data = req.valid.body;
    
    const category = await storage.createOrganizerCategory({
      ...data,
      schoolId,
      createdBy: userId
    });
    
    res.json({ ok: true, data: category });
  } catch (error: any) {
    console.error('Create category error:', error);
    res.status(500).json({ ok: false, error: 'Failed to create category' });
  }
};

const deleteCategory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { schoolId } = req.user;
    const { id } = req.params;
    
    await storage.deleteOrganizerCategory(id, schoolId);
    res.json({ ok: true });
  } catch (error: any) {
    console.error('Delete category error:', error);
    res.status(500).json({ ok: false, error: 'Failed to delete category' });
  }
};

// Entry handlers
const listEntries = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { schoolId } = req.user;
    const { categoryId } = req.query;
    
    const entries = await storage.getOrganizerEntries(schoolId, categoryId as string);
    res.json({ ok: true, data: entries });
  } catch (error: any) {
    console.error('List entries error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch entries' });
  }
};

const createEntry = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { schoolId, id: userId } = req.user;
    const data = req.valid.body;
    
    const entry = await storage.createOrganizerEntry({
      ...data,
      schoolId,
      createdBy: userId
    });
    
    res.json({ ok: true, data: entry });
  } catch (error: any) {
    console.error('Create entry error:', error);
    res.status(500).json({ ok: false, error: 'Failed to create entry' });
  }
};

const updateEntry = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { schoolId } = req.user;
    const { id } = req.params;
    const data = req.body; // updateEntry doesn't use validate middleware, so using req.body
    
    const entry = await storage.updateOrganizerEntry(id, data, schoolId);
    res.json({ ok: true, data: entry });
  } catch (error: any) {
    console.error('Update entry error:', error);
    res.status(500).json({ ok: false, error: 'Failed to update entry' });
  }
};

const deleteEntry = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { schoolId } = req.user;
    const { id } = req.params;
    
    await storage.deleteOrganizerEntry(id, schoolId);
    res.json({ ok: true });
  } catch (error: any) {
    console.error('Delete entry error:', error);
    res.status(500).json({ ok: false, error: 'Failed to delete entry' });
  }
};

// Event handlers
const listEvents = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { schoolId } = req.user;
    const events = await storage.getOrganizerEvents(schoolId);
    res.json({ ok: true, data: events });
  } catch (error: any) {
    console.error('List events error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch events' });
  }
};

const createEvent = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { schoolId, id: userId } = req.user;
    const data = req.valid.body;
    
    const event = await storage.createOrganizerEvent({
      ...data,
      schoolId,
      createdBy: userId
    });
    
    res.json({ ok: true, data: event });
  } catch (error: any) {
    console.error('Create event error:', error);
    res.status(500).json({ ok: false, error: 'Failed to create event' });
  }
};

const deleteEvent = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { schoolId } = req.user;
    const { id } = req.params;
    
    await storage.deleteOrganizerEvent(id, schoolId);
    res.json({ ok: true });
  } catch (error: any) {
    console.error('Delete event error:', error);
    res.status(500).json({ ok: false, error: 'Failed to delete event' });
  }
};

// CSV Export
const exportCsv = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { schoolId } = req.user;
    const { categoryId } = req.query;
    
    const entries = await storage.getOrganizerEntries(schoolId, categoryId as string);
    
    // Simple CSV generation
    const headers = ['Title', 'Content', 'Priority', 'Due Date', 'Tags', 'Created'];
    const rows = entries.map(entry => [
      entry.title,
      entry.content || '',
      entry.priority,
      entry.dueDate || '',
      entry.tags?.join(', ') || '',
      new Date(entry.createdAt).toLocaleDateString()
    ]);
    
    const csv = [headers, ...rows].map(row => 
      row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="organizer-export.csv"');
    res.send(csv);
  } catch (error: any) {
    console.error('Export CSV error:', error);
    res.status(500).json({ ok: false, error: 'Failed to export data' });
  }
};

export function registerOrganizerRoutes(app: any, requireAuth: any) {
  // Categories
  app.get('/api/organizer/categories', requireAuth, listCategories);
  app.post('/api/organizer/categories', requireAuth, validate({ body: categorySchema }), createCategory);
  app.delete('/api/organizer/categories/:id', requireAuth, deleteCategory);

  // Entries
  app.get('/api/organizer/entries', requireAuth, listEntries);
  app.post('/api/organizer/entries', requireAuth, validate({ body: entrySchema }), createEntry);
  app.put('/api/organizer/entries/:id', requireAuth, updateEntry);
  app.delete('/api/organizer/entries/:id', requireAuth, deleteEntry);

  // Events
  app.get('/api/organizer/events', requireAuth, listEvents);
  app.post('/api/organizer/events', requireAuth, validate({ body: eventSchema }), createEvent);
  app.delete('/api/organizer/events/:id', requireAuth, deleteEvent);

  // Export
  app.get('/api/organizer/export', requireAuth, exportCsv);
}