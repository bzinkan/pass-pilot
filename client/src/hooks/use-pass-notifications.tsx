import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface PassNotificationProps {
  user: any;
  enabled?: boolean;
}

export function usePassNotifications({ user, enabled = true }: PassNotificationProps) {
  const { toast } = useToast();
  const notifiedPasses = useRef(new Set<string>());
  
  const { data: activePasses } = useQuery({
    queryKey: ['/api/passes/active'],
    refetchInterval: enabled && user?.enableNotifications ? 30000 : false, // Check every 30 seconds
    enabled: enabled && user?.enableNotifications,
  });

  useEffect(() => {
    if (!user?.enableNotifications || !activePasses || !Array.isArray(activePasses)) return;

    const passTimeout = user.passTimeout || 30; // Default to 30 minutes
    const now = new Date();

    activePasses.forEach((pass: any) => {
      if (!pass.checkoutTime || notifiedPasses.current.has(pass.id)) return;

      const checkoutTime = new Date(pass.checkoutTime);
      const minutesOut = Math.floor((now.getTime() - checkoutTime.getTime()) / (1000 * 60));

      // Check if pass is overdue
      if (minutesOut >= passTimeout) {
        notifiedPasses.current.add(pass.id);
        
        toast({
          title: "Pass Overdue",
          description: `${pass.student?.name || 'Student'} has been out for ${minutesOut} minutes (${pass.passType} pass)`,
          variant: "destructive",
        });
      }
    });
  }, [activePasses, user?.enableNotifications, user?.passTimeout, toast]);

  // Clean up notifications for returned passes
  useEffect(() => {
    if (!activePasses || !Array.isArray(activePasses)) return;
    
    const activePassIds = new Set(activePasses.map((pass: any) => pass.id));
    const notifiedPassIds = Array.from(notifiedPasses.current);
    
    notifiedPassIds.forEach(passId => {
      if (!activePassIds.has(passId)) {
        notifiedPasses.current.delete(passId);
      }
    });
  }, [activePasses]);
}