"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Shield } from "lucide-react";

import heroBg from "@/assets/hero-bg.jpg";
import xpsLogo from "@/assets/xps-logo.png";
import { setSessionCookies } from "@/lib/cookies";
import { webEnv } from "@/lib/env";
import { supabase } from "@/integrations/supabase/client";

type AuthRoute = {
  title: string;
  subtitle: string;
  cta: string;
};

function InputField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-white/50">{label}</label>
      <input
        type={type}
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-gold/40"
      />
    </div>
  );
}

export function LiveAuthView({
  pathname,
  auth,
}: {
  pathname: string;
  auth: AuthRoute;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("demo@xps.local");
  const [password, setPassword] = useState("changeme123");
  const [fullName, setFullName] = useState("XPS Operator");
  const [role, setRole] = useState<"employee" | "manager" | "owner" | "admin">("employee");
  const [jobTitle, setJobTitle] = useState("Sales Operator");
  const [territory, setTerritory] = useState("Florida");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let accessToken: string | null = null;

      if (pathname === "/onboarding") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role,
              job_title: jobTitle,
              territory,
            },
            emailRedirectTo: webEnv.apiUrl.startsWith("http") ? undefined : window.location.origin,
          },
        });

        if (signUpError) {
          throw signUpError;
        }

        accessToken = data.session?.access_token ?? null;
        if (!accessToken) {
          throw new Error("Supabase account created. If email confirmation is enabled, confirm the account first, then sign in.");
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          throw signInError;
        }

        accessToken = data.session.access_token;
      }

      const response = await fetch(`${webEnv.apiUrl}/auth/supabase/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: accessToken }),
      });
      const data = (await response.json()) as { token?: string; user?: unknown; error?: string };

      if (!response.ok || !data.token) {
        throw new Error(data.error || "Unable to start an XPS workspace session");
      }

      localStorage.setItem("xps_token", data.token);
      localStorage.setItem("xps_user", JSON.stringify(data.user ?? {}));
      setSessionCookies((data.user as { role?: string } | undefined)?.role || "employee");
      router.push("/dashboard");
      router.refresh();
    } catch (submitError) {
      setError((submitError as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-background text-foreground lg:grid-cols-[1.05fr_0.95fr]">
      <aside className="relative hidden overflow-hidden border-r border-white/10 lg:block">
        <Image src={heroBg} alt="" fill priority className="object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/75 to-background" />
        <div className="relative flex h-full flex-col justify-between p-10">
          <Link href="/" className="flex items-center gap-3">
            <Image src={xpsLogo} alt="XPS" className="h-11 w-11 rounded-lg" priority />
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-[0.22em] text-white">XPS INTELLIGENCE</div>
              <div className="text-[10px] uppercase tracking-[0.28em] text-white/55">Command center</div>
            </div>
          </Link>

          <div className="max-w-xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-black/40 px-4 py-2 text-xs uppercase tracking-[0.24em] text-gold-light">
              <Shield className="h-3.5 w-3.5" />
              Secure workspace
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white">The sales command center your team can actually operate every day.</h1>
            <p className="mt-5 max-w-lg text-sm leading-7 text-white/68">
              Sign in to manage leads, run scraping workflows, review recommendations, and operate the system from a single governed workspace.
            </p>
          </div>
        </div>
      </aside>

      <main className="flex items-center justify-center px-4 py-12 sm:px-6 lg:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Image src={xpsLogo} alt="XPS" className="h-10 w-10 rounded-lg" priority />
            <div>
              <div className="text-sm font-semibold tracking-[0.22em] text-foreground">XPS INTELLIGENCE</div>
              <div className="text-[10px] uppercase tracking-[0.26em] text-muted-foreground">Command center</div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-card/80 p-6 shadow-elevated backdrop-blur-xl sm:p-8">
            <div className="mb-8">
              <p className="text-xs uppercase tracking-[0.26em] text-gold">{auth.subtitle}</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white">{auth.title}</h2>
              <p className="mt-3 text-sm leading-6 text-white/65">
                {pathname === "/login"
                  ? "Enter your workspace to review leads, pipeline movement, assistant guidance, and system status."
                  : "Create your workspace profile so the system can tailor territory, role access, and assistant behavior."}
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              {pathname === "/onboarding" ? (
                <>
                  <InputField label="Full name" value={fullName} onChange={setFullName} />
                  <div>
                    <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-white/50">Role</label>
                    <select
                      aria-label="Role"
                      value={role}
                      onChange={(event) => setRole(event.target.value as typeof role)}
                      className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-gold/40"
                    >
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                      <option value="owner">Owner</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <InputField label="Job title" value={jobTitle} onChange={setJobTitle} />
                  <InputField label="Territory" value={territory} onChange={setTerritory} />
                </>
              ) : null}
              <InputField label="Email" value={email} onChange={setEmail} type="email" />
              <InputField label="Password" value={password} onChange={setPassword} type="password" />
              {error ? <div className="rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div> : null}
              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-gold px-4 py-3 text-sm font-semibold text-black transition hover:-translate-y-0.5 hover:shadow-gold disabled:cursor-not-allowed disabled:opacity-70"
              >
                {auth.cta}
                {!loading ? <ArrowRight className="h-4 w-4" /> : null}
              </button>
            </form>
            {pathname === "/login" ? (
              <div className="mt-4 text-sm text-white/55">
                First run?{" "}
                <Link className="text-gold transition hover:text-gold-light" href="/onboarding">
                  Create the first admin account
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
