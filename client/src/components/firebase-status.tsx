import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database } from "lucide-react";

export function FirebaseStatus() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5 text-green-500" />
          Authentication System
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="default">
              Database Authentication Active
            </Badge>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Using secure PostgreSQL database authentication with JWT sessions.
            Firebase authentication has been disabled for simplicity and reliability.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}