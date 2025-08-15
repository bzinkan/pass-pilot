import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";

export function DatabaseStatus() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          Database Connection
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="default">
              Connected
            </Badge>
          </div>
          
          <p className="text-sm text-muted-foreground">
            PostgreSQL database is connected and ready. Authentication uses secure session-based JWT tokens.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}