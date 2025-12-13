import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

/**
 * Component shown when API configuration is invalid
 * This helps users and developers quickly identify deployment issues
 */
export function ApiConfigError() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-red-50 to-red-100">
      <div className="max-w-2xl w-full space-y-4">
        <Alert variant="destructive" className="border-2">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle className="text-xl font-bold">Configuration Error</AlertTitle>
          <AlertDescription className="mt-4 space-y-4">
            <p className="text-base">
              <strong>The application cannot connect to the backend server.</strong>
            </p>
            <p>
              This usually means the <code className="bg-red-200 px-2 py-1 rounded">VITE_API_BASE</code> environment 
              variable is not set correctly in your deployment platform.
            </p>
            
            <div className="bg-white/50 p-4 rounded-lg space-y-2 text-sm">
              <p className="font-semibold">For Administrators:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Go to your Vercel project settings</li>
                <li>Navigate to <strong>Environment Variables</strong></li>
                <li>Add or update: <code className="bg-gray-200 px-2 py-1 rounded text-xs">VITE_API_BASE</code></li>
                <li>Set the value to your Railway backend URL (e.g., <code className="bg-gray-200 px-2 py-1 rounded text-xs">https://myones-production.up.railway.app</code>)</li>
                <li>Redeploy the application</li>
              </ol>
            </div>

            <div className="bg-white/50 p-4 rounded-lg space-y-2 text-sm">
              <p className="font-semibold">For Users:</p>
              <p>
                We're experiencing technical difficulties. Please try again later or contact support 
                if this issue persists.
              </p>
            </div>

            <p className="text-xs text-muted-foreground mt-4">
              Check the browser console (F12) for more detailed error information.
            </p>
          </AlertDescription>
        </Alert>

        <div className="text-center text-sm text-muted-foreground">
          <p>See <code>DEPLOYMENT_GUIDE.md</code> for complete setup instructions</p>
        </div>
      </div>
    </div>
  );
}
