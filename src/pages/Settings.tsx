import { FormEvent, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleUpdatePassword = async (event: FormEvent) => {
    event.preventDefault();

    if (!currentPassword || !password) {
      toast({
        title: "Missing details",
        description: "Enter your current password and a new password.",
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
        description: "Re-enter the same new password in both fields.",
        variant: "destructive",
      });
      return;
    }

    if (!user.email) {
      toast({
        title: "Could not update password",
        description: "No email is attached to this account.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (verifyError) {
        throw new Error("Current password is incorrect.");
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        throw error;
      }

      setCurrentPassword("");
      setPassword("");
      setConfirmPassword("");
      toast({
        title: "Password updated",
        description: "Use the new password the next time you sign in.",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update password";
      toast({
        title: "Could not update password",
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
          <CardTitle>Settings</CardTitle>
          <CardDescription>
            Change the password for {user.email}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="current-password">Current password</Label>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-new-password">Confirm new password</Label>
              <Input
                id="confirm-new-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Saving..." : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
