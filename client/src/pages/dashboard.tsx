import { useQuery } from "@tanstack/react-query";
import TopBar from "@/components/layout/top-bar";
import StatsCards from "@/components/stats-cards";
import ActivePassesTable from "@/components/active-passes-table";
import CreatePassForm from "@/components/create-pass-form";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/stats"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: activePasses, isLoading: passesLoading } = useQuery({
    queryKey: ["/api/hall-passes/active"],
    refetchInterval: 30000,
  });

  return (
    <>
      <TopBar 
        title="Dashboard" 
        subtitle="Monitor and manage student hall passes" 
      />
      
      <StatsCards stats={stats} isLoading={statsLoading} />
      
      <ActivePassesTable passes={activePasses} isLoading={passesLoading} />
      
      <CreatePassForm />
    </>
  );
}
