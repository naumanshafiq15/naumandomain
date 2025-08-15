import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useLinnworksAuth() {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const authenticate = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.functions.invoke('linnworks-auth');
      
      if (authError) {
        throw new Error(authError.message);
      }

      if (data?.token) {
        setAuthToken(data.token);
        toast({
          title: "Authentication successful",
          description: "Connected to Linnworks API",
        });
      } else {
        throw new Error('No token received from authentication');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      setError(errorMessage);
      toast({
        title: "Authentication failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    authenticate();
  }, []);

  return {
    authToken,
    isLoading,
    error,
    authenticate,
  };
}