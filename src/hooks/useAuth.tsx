import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type AppRole = "head_coach" | "assistant_coach" | "player";

export interface Profile {
  id: string;
  full_name: string;
  org_id: string | null;
  jersey_number: string | null;
}

export interface Organization {
  id: string;
  name: string;
  join_code: string;
  created_by: string | null;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  org: Organization | null;
  role: AppRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [org, setOrg] = useState<Organization | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  const finishInit = () => {
    if (!initialized.current) {
      initialized.current = true;
      setLoading(false);
    }
  };

  const loadUserData = async (userId: string) => {
    const [profileRes, roleRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
    ]);

    const p = profileRes.data as Profile | null;
    setProfile(p);
    setRole((roleRes.data?.role as AppRole | undefined) ?? null);

    if (p?.org_id) {
      const { data: orgData } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", p.org_id)
        .maybeSingle();
      setOrg(orgData as Organization | null);
    } else {
      setOrg(null);
    }
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        setTimeout(() => {
          loadUserData(newSession.user.id).finally(finishInit);
        }, 0);
      } else {
        setProfile(null);
        setOrg(null);
        setRole(null);
        finishInit();
      }
    });

    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      setSession(existing);
      setUser(existing?.user ?? null);
      if (existing?.user) {
        loadUserData(existing.user.id).finally(finishInit);
      } else {
        finishInit();
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (user) await loadUserData(user.id);
  };

  return (
    <AuthContext.Provider
      value={{ user, session, profile, org, role, loading, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
