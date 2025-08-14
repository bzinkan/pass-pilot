import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from './use-toast';

interface NotificationOptions {
  user: any;
  enabled?: boolean;
}

export function usePassNotifications({ user, enabled = true }: NotificationOptions) {
  const { toast } = useToast();

  // Query active passes for the user's school
  const { data: activePasses = [] } = useQuery({
    queryKey: ['/api/passes/active', user?.schoolId],
    enabled: enabled && !!user?.schoolId,
    refetchInterval: 30000, // Check every 30 seconds
  });

  // Check for passes expiring soon
  useEffect(() => {
    if (!enabled || !activePasses.length) return;

    const now = new Date();
    const expiringSoon = activePasses.filter((pass: any) => {
      const expiresAt = new Date(pass.expiresAt);
      const timeRemaining = expiresAt.getTime() - now.getTime();
      return timeRemaining <= 5 * 60 * 1000 && timeRemaining > 0; // 5 minutes or less
    });

    expiringSoon.forEach((pass: any) => {
      const expiresAt = new Date(pass.expiresAt);
      const minutesRemaining = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60));
      
      toast({
        title: "Pass Expiring Soon",
        description: `${pass.studentName}'s pass expires in ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}`,
        variant: "destructive",
      });
    });
  }, [activePasses, enabled, toast]);

  return { activePasses };
}