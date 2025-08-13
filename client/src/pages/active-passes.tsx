import { useQuery } from "@tanstack/react-query";
import TopBar from "@/components/layout/top-bar";
import ActivePassesTable from "@/components/active-passes-table";

export default function ActivePasses() {
  const { data: activePasses, isLoading } = useQuery({
    queryKey: ["/api/hall-passes/active"],
    refetchInterval: 30000,
  });

  return (
    <>
      <TopBar 
        title="Active Passes" 
        subtitle="View and manage currently active hall passes" 
      />
      
      <ActivePassesTable passes={activePasses} isLoading={isLoading} showCreateButton={false} />
    </>
  );
}
