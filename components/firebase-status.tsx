import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { firebaseService } from "@/lib/firebase";

export function FirebaseStatus() {
  const isConfigured = firebaseService.isConfigured();
  
  const getStatus = () => {
    if (!isConfigured) {
      return {
        icon: <XCircle className="h-5 w-5 text-destructive" />,
        status: "Not Configured",
        variant: "destructive" as const,
        message: "Firebase keys are missing. Please add your Firebase configuration in the secrets."
      };
    }
    
    return {
      icon: <CheckCircle className="h-5 w-5 text-green-500" />,
      status: "Configured",
      variant: "default" as const,
      message: "Firebase is properly configured and ready to use."
    };
  };

  const statusInfo = getStatus();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {statusInfo.icon}
          Firebase Integration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant={statusInfo.variant}>
              {statusInfo.status}
            </Badge>
          </div>
          
          <p className="text-sm text-muted-foreground">
            {statusInfo.message}
          </p>

          {isConfigured && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Configuration Details:</h4>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Project ID: {import.meta.env.VITE_FIREBASE_PROJECT_ID}</div>
                <div>App ID: {import.meta.env.VITE_FIREBASE_APP_ID}</div>
                <div>API Key: {import.meta.env.VITE_FIREBASE_API_KEY ? '••••••••' : 'Not set'}</div>
              </div>
            </div>
          )}

          {!isConfigured && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Required Environment Variables:
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• VITE_FIREBASE_API_KEY</li>
                <li>• VITE_FIREBASE_PROJECT_ID</li>
                <li>• VITE_FIREBASE_APP_ID</li>
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}