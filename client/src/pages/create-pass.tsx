import TopBar from "@/components/layout/top-bar";
import CreatePassForm from "@/components/create-pass-form";

export default function CreatePass() {
  return (
    <>
      <TopBar 
        title="Create Hall Pass" 
        subtitle="Issue a new hall pass to a student" 
      />
      
      <CreatePassForm />
    </>
  );
}
