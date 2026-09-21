import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { invokeFunction } from "@/lib/functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type AdminUser = {
  id: string;
  email?: string;
  role: string;
  createdAt?: string;
};

export default function Admin() {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [createdEmail, setCreatedEmail] = useState<string | null>(null);
  const { toast } = useToast();

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const data = await invokeFunction<{ users: AdminUser[] }>("admin-list-users");
      setUsers(data.users || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load users";
      toast({
        title: "Could not load users",
        description: message,
        variant: "destructive",
      });
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

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
      const data = await invokeFunction<{ email?: string }>("admin-create-user", {
        email: trimmedEmail,
        password,
      });

      setCreatedEmail(data?.email ?? trimmedEmail);
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      toast({
        title: "User created",
        description: `Login is ready for ${data?.email ?? trimmedEmail}.`,
      });
      await loadUsers();
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

  const handleDeleteUser = async (target: AdminUser) => {
    if (!target.id) return;
    if (target.id === user.id) return;
    if (target.role === "admin") return;

    const confirmed = window.confirm(`Delete ${target.email || "this user"}? They will no longer be able to sign in.`);
    if (!confirmed) return;

    setDeletingId(target.id);
    try {
      await invokeFunction("admin-delete-user", { userId: target.id });
      toast({
        title: "User deleted",
        description: `${target.email || "User"} can no longer sign in.`,
      });
      await loadUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete user";
      toast({
        title: "Could not delete user",
        description: message,
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
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

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            Delete a user to stop them signing in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <p className="text-sm text-muted-foreground">Loading users...</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users found.</p>
          ) : (
            <div className="divide-y rounded-md border">
              {users.map((item) => {
                const isSelf = item.id === user.id;
                const isAdmin = item.role === "admin";
                const canDelete = !isSelf && !isAdmin;

                return (
                  <div key={item.id} className="flex items-center justify-between gap-4 px-3 py-3">
                    <div>
                      <p className="text-sm font-medium">{item.email || item.id}</p>
                      <p className="text-xs text-muted-foreground">
                        {isAdmin ? "Admin" : "User"}
                        {isSelf ? " · you" : ""}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!canDelete || deletingId === item.id}
                      onClick={() => handleDeleteUser(item)}
                    >
                      {deletingId === item.id ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
