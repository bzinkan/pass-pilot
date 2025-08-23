// Shared session store for consistent authentication across all routes
export const sessions = new Map<string, { 
  userId: string; 
  schoolId: string; 
  expires: Date 
}>();

export type SessionData = {
  userId: string;
  schoolId: string; 
  expires: Date;
};