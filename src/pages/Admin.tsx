import { FormEvent, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function Admin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdEmail, setCreatedEmail] = useState<string | null>(null);
  const { toast } = useToast();

  const handleCreateUser = async (event: FormEvent) => {
    event.preventDefault();

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      toast({
        title: "Missing details",
        description: "Enter an email address and password.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "Re-enter the same password in both fields.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setCreatedEmail(null);

    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: { email: trimmedEmail, password },
      });

      if (error) {
        let message = error.message;
        try {
          const body = await (error as { context?: Response }).context?.json();
          if (body?.error) {
            message = body.error;
          }
        } catch {
          // Keep the original error message if the response body is not JSON.
        }
        throw new Error(message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setCreatedEmail(data?.email ?? trimmedEmail);
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      toast({
        title: "User created",
        description: `Login is ready for ${data?.email ?? trimmedEmail}.`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create user";
      toast({
        title: "Could not create user",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>Create user</CardTitle>
          <CardDescription>
            Create an email and password for someone who should access this dashboard.
            Share those details with them directly. They cannot sign up themselves.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-user-email">Email</Label>
              <Input
                id="new-user-email"
                type="email"
                autoComplete="off"
                placeholder="user@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-user-password">Password</Label>
              <Input
                id="new-user-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-user-password-confirm">Confirm password</Label>
              <Input
                id="new-user-password-confirm"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Creating..." : "Create user"}
            </Button>
          </form>

          {createdEmail && (
            <p className="mt-4 text-sm text-muted-foreground">
              Created <span className="font-medium text-foreground">{createdEmail}</span>.
              Give them this email and the password you set.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
