import { createContext, useContext } from "react";
import type { Session, User } from "@supabase/supabase-js";

type AuthContextValue = {
  session: Session;
  user: User;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = AuthContext.Provider;

export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return value;
};
