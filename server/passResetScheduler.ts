import { storage } from "./storage";

class PassResetScheduler {
  private scheduledResets = new Map<string, NodeJS.Timeout>();

  constructor() {
    this.startDailyResetScheduler();
  }

  private startDailyResetScheduler() {
    // Schedule reset at midnight every day
    this.scheduleNextMidnightReset();
  }

  private scheduleNextMidnightReset() {
    const now = new Date();
    const nextMidnight = new Date();
    
    // Set to next midnight
    nextMidnight.setDate(now.getDate() + 1);
    nextMidnight.setHours(0, 0, 0, 0);
    
    const timeUntilMidnight = nextMidnight.getTime() - now.getTime();
    
    console.log(`Scheduling next pass reset for ${nextMidnight.toLocaleString()} (in ${Math.round(timeUntilMidnight / 1000 / 60)} minutes)`);
    
    setTimeout(async () => {
      await this.performDailyReset();
      // Schedule the next reset for tomorrow
      this.scheduleNextMidnightReset();
    }, timeUntilMidnight);
  }

  private async performDailyReset() {
    try {
      console.log('Starting daily pass reset at midnight...');
      
      // Get all schools and reset their active passes
      // Note: We'll need to add a method to get all schools
      // For now, we'll handle this differently by getting all active passes
      
      // This is a simplified approach - in a real system you'd get all schools
      // and reset passes for each school individually
      const schools = await this.getAllSchools();
      
      let totalReturned = 0;
      for (const school of schools) {
        const returned = await storage.returnAllActivePasses(school.schoolId);
        totalReturned += returned;
        
        if (returned > 0) {
          console.log(`Daily reset: Returned ${returned} active passes for school ${school.name}`);
        }
      }
      
      console.log(`Daily reset completed. Total passes returned: ${totalReturned}`);
      
    } catch (error) {
      console.error('Error during daily pass reset:', error);
    }
  }

  private async getAllSchools() {
    try {
      return await storage.getAllSchools();
    } catch (error) {
      console.error('Error getting schools for daily reset:', error);
      return [];
    }
  }

  // Manual reset for testing
  async manualReset(schoolId: string): Promise<number> {
    console.log(`Manual pass reset initiated for school ${schoolId}`);
    const returned = await storage.returnAllActivePasses(schoolId);
    console.log(`Manual reset completed. Returned ${returned} passes for school ${schoolId}`);
    return returned;
  }

  // Get time until next reset (for display purposes)
  getTimeUntilNextReset(): { hours: number; minutes: number } {
    const now = new Date();
    const nextMidnight = new Date();
    nextMidnight.setDate(now.getDate() + 1);
    nextMidnight.setHours(0, 0, 0, 0);
    
    const diffMs = nextMidnight.getTime() - now.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return { hours, minutes };
  }
}

// Create a singleton instance
export const passResetScheduler = new PassResetScheduler();