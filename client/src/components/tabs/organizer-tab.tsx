import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Calendar, FileText, Tag, Download, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface OrganizerCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
  schoolId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface OrganizerEntry {
  id: string;
  title: string;
  content?: string;
  categoryId: string;
  tags?: string[];
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  completed: boolean;
  schoolId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface OrganizerEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  allDay: boolean;
  schoolId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export default function OrganizerTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("categories");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");

  // Categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['/api/organizer/categories'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/organizer/categories');
      const json = await res.json();
      return json.data || json;
    }
  });

  // Entries
  const { data: entries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ['/api/organizer/entries', selectedCategoryId],
    queryFn: async () => {
      const url = selectedCategoryId 
        ? `/api/organizer/entries?categoryId=${selectedCategoryId}`
        : '/api/organizer/entries';
      const res = await apiRequest('GET', url);
      const json = await res.json();
      return json.data || json;
    }
  });

  // Events
  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['/api/organizer/events'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/organizer/events');
      const json = await res.json();
      return json.data || json;
    }
  });

  // Mutations
  const createCategoryMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; color?: string }) =>
      apiRequest('POST', '/api/organizer/categories', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizer/categories'] });
      toast({ title: "Category created successfully" });
    },
    onError: () => toast({ title: "Failed to create category", variant: "destructive" })
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/organizer/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizer/categories'] });
      toast({ title: "Category deleted successfully" });
    },
    onError: () => toast({ title: "Failed to delete category", variant: "destructive" })
  });

  const createEntryMutation = useMutation({
    mutationFn: (data: { title: string; content?: string; categoryId: string; priority?: string; dueDate?: string; tags?: string[] }) =>
      apiRequest('POST', '/api/organizer/entries', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizer/entries'] });
      toast({ title: "Entry created successfully" });
    },
    onError: () => toast({ title: "Failed to create entry", variant: "destructive" })
  });

  const toggleEntryMutation = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      apiRequest('PUT', `/api/organizer/entries/${id}`, { completed }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizer/entries'] });
    },
    onError: () => toast({ title: "Failed to update entry", variant: "destructive" })
  });

  const deleteEntryMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/organizer/entries/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizer/entries'] });
      toast({ title: "Entry deleted successfully" });
    },
    onError: () => toast({ title: "Failed to delete entry", variant: "destructive" })
  });

  const createEventMutation = useMutation({
    mutationFn: (data: { title: string; description?: string; startDate: string; endDate?: string; allDay?: boolean }) =>
      apiRequest('POST', '/api/organizer/events', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizer/events'] });
      toast({ title: "Event created successfully" });
    },
    onError: () => toast({ title: "Failed to create event", variant: "destructive" })
  });

  const deleteEventMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/organizer/events/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizer/events'] });
      toast({ title: "Event deleted successfully" });
    },
    onError: () => toast({ title: "Failed to delete event", variant: "destructive" })
  });

  const handleExport = () => {
    const url = selectedCategoryId 
      ? `/api/organizer/export?categoryId=${selectedCategoryId}`
      : '/api/organizer/export';
    window.open(url, '_blank');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Organizer</h2>
        <div className="flex gap-2">
          <Button onClick={handleExport} variant="outline" size="sm" data-testid="button-export">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="categories" data-testid="tab-categories">Categories</TabsTrigger>
          <TabsTrigger value="entries" data-testid="tab-entries">Tasks & Notes</TabsTrigger>
          <TabsTrigger value="events" data-testid="tab-events">Events</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Categories</h3>
            <CreateCategoryDialog onSubmit={createCategoryMutation.mutate} />
          </div>
          
          {categoriesLoading ? (
            <div className="text-center py-8">Loading categories...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category: OrganizerCategory) => (
                <Card key={category.id} className="relative">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg" style={{ color: category.color }}>
                        {category.name}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteCategoryMutation.mutate(category.id)}
                        data-testid={`button-delete-category-${category.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {category.description && (
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="entries" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold">Tasks & Notes</h3>
              <Select value={selectedCategoryId || ""} onValueChange={setSelectedCategoryId}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All categories</SelectItem>
                  {categories.map((category: OrganizerCategory) => (
                    <SelectItem key={category.id} value={category.id || ""}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <CreateEntryDialog categories={categories} onSubmit={createEntryMutation.mutate} />
          </div>

          {entriesLoading ? (
            <div className="text-center py-8">Loading entries...</div>
          ) : (
            <div className="space-y-4">
              {entries.map((entry: OrganizerEntry) => (
                <Card key={entry.id} className={`${entry.completed ? 'opacity-60' : ''}`}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={entry.completed}
                          onChange={(e) => toggleEntryMutation.mutate({ id: entry.id, completed: e.target.checked })}
                          className="h-4 w-4"
                          data-testid={`checkbox-entry-${entry.id}`}
                        />
                        <CardTitle className={`text-lg ${entry.completed ? 'line-through' : ''}`}>
                          {entry.title}
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getPriorityColor(entry.priority)}>
                          {entry.priority}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteEntryMutation.mutate(entry.id)}
                          data-testid={`button-delete-entry-${entry.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {entry.content && (
                      <p className="text-sm text-muted-foreground mb-2">{entry.content}</p>
                    )}
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        {entry.tags && entry.tags.length > 0 && (
                          <div className="flex gap-1">
                            {entry.tags.map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      {entry.dueDate && (
                        <span>Due: {new Date(entry.dueDate).toLocaleDateString()}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Events</h3>
            <CreateEventDialog onSubmit={createEventMutation.mutate} />
          </div>

          {eventsLoading ? (
            <div className="text-center py-8">Loading events...</div>
          ) : (
            <div className="space-y-4">
              {events.map((event: OrganizerEvent) => (
                <Card key={event.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{event.title}</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteEventMutation.mutate(event.id)}
                        data-testid={`button-delete-event-${event.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {event.description && (
                      <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {new Date(event.startDate).toLocaleDateString()} 
                        {event.endDate && ` - ${new Date(event.endDate).toLocaleDateString()}`}
                      </span>
                      {event.allDay && <Badge variant="outline" className="text-xs">All Day</Badge>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Create Category Dialog Component
function CreateCategoryDialog({ onSubmit }: { onSubmit: (data: any) => void }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3b82f6'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({ name: '', description: '', color: '#3b82f6' });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-category">
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Category</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              data-testid="input-category-name"
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              data-testid="input-category-description"
            />
          </div>
          <div>
            <Label htmlFor="color">Color</Label>
            <Input
              id="color"
              type="color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              data-testid="input-category-color"
            />
          </div>
          <Button type="submit" className="w-full" data-testid="button-submit-category">
            Create Category
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Create Entry Dialog Component
function CreateEntryDialog({ categories, onSubmit }: { categories: OrganizerCategory[]; onSubmit: (data: any) => void }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    categoryId: '',
    priority: 'medium',
    dueDate: '',
    tags: [] as string[]
  });
  const [tagInput, setTagInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      dueDate: formData.dueDate || undefined
    });
    setFormData({ title: '', content: '', categoryId: '', priority: 'medium', dueDate: '', tags: [] });
    setTagInput('');
    setOpen(false);
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(tag => tag !== tagToRemove) });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-entry">
          <Plus className="h-4 w-4 mr-2" />
          Add Entry
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Entry</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              data-testid="input-entry-title"
            />
          </div>
          <div>
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              data-testid="input-entry-content"
            />
          </div>
          <div>
            <Label htmlFor="categoryId">Category</Label>
            <Select value={formData.categoryId || ""} onValueChange={(value) => setFormData({ ...formData, categoryId: value })}>
              <SelectTrigger data-testid="select-entry-category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id || ""}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="priority">Priority</Label>
            <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
              <SelectTrigger data-testid="select-entry-priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              data-testid="input-entry-due-date"
            />
          </div>
          <div>
            <Label>Tags</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add tag"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                data-testid="input-entry-tag"
              />
              <Button type="button" onClick={addTag} variant="outline" size="sm">
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {formData.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1 text-xs"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          </div>
          <Button type="submit" className="w-full" data-testid="button-submit-entry">
            Create Entry
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Create Event Dialog Component
function CreateEventDialog({ onSubmit }: { onSubmit: (data: any) => void }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    allDay: false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      startDate: new Date(formData.startDate).toISOString(),
      endDate: formData.endDate ? new Date(formData.endDate).toISOString() : undefined
    });
    setFormData({ title: '', description: '', startDate: '', endDate: '', allDay: false });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-event">
          <Plus className="h-4 w-4 mr-2" />
          Add Event
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              data-testid="input-event-title"
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              data-testid="input-event-description"
            />
          </div>
          <div>
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="datetime-local"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              required
              data-testid="input-event-start-date"
            />
          </div>
          <div>
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="datetime-local"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              data-testid="input-event-end-date"
            />
          </div>
          <div className="flex items-center space-x-2">
            <input
              id="allDay"
              type="checkbox"
              checked={formData.allDay}
              onChange={(e) => setFormData({ ...formData, allDay: e.target.checked })}
              data-testid="checkbox-event-all-day"
            />
            <Label htmlFor="allDay">All Day</Label>
          </div>
          <Button type="submit" className="w-full" data-testid="button-submit-event">
            Create Event
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}