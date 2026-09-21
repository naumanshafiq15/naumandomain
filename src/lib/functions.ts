import { supabase } from "@/integrations/supabase/client";

export async function invokeFunction<T>(name: string, body?: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, body ? { body } : undefined);

  if (error) {
    let message = error.message;
    try {
      const responseBody = await (error as { context?: Response }).context?.json();
      if (responseBody?.error) {
        message = responseBody.error;
      }
    } catch {
      // Keep the original error message if the response body is not JSON.
    }
    throw new Error(message);
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data as T;
}
