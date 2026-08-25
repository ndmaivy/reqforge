import { useState } from "react";
import { ArrowRight, Loader, LockKeyhole, Mail, UserRound } from "lucide-react";
import logoImg from "../../imports/image.png";
import { getErrorMessage } from "../../services/api";
import { login, register } from "../../services/auth";
import type { AuthResponse } from "../../types/auth";

type AuthMode = "login" | "register";

interface AuthPageProps {
  onAuthenticated: (response: AuthResponse) => void;
}

export function AuthPage({ onAuthenticated }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isRegister = mode === "register";

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError(null);
    setPassword("");
    setConfirmPassword("");
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (isRegister && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const response = isRegister
        ? await register({ full_name: fullName.trim(), email, password })
        : await login({ email, password });
      onAuthenticated(response);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to continue. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main
      className="min-h-screen flex items-center justify-center px-5 py-10"
      style={{ background: "var(--background)", fontFamily: "var(--font-sans)" }}
    >
      <section
        className="w-full max-w-md rounded-2xl border p-7 shadow-sm"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2.5 mb-7">
          <img src={logoImg} alt="ReqForge" className="w-9 h-9 rounded-lg object-cover" />
          <span style={{ fontWeight: 700, fontSize: "17px", letterSpacing: "-0.02em" }}>
            <span style={{ color: "#60A5FA" }}>Req</span><span style={{ color: "#1E3A8A" }}>Forge</span>
          </span>
        </div>

        <div className="mb-6">
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--foreground)", letterSpacing: "-0.02em" }}>
            {isRegister ? "Create your account" : "Welcome back"}
          </h1>
          <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginTop: "5px" }}>
            {isRegister ? "Start organizing feedback into better requirements." : "Sign in to continue to your projects."}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {isRegister && (
            <Field label="Full name" icon={<UserRound size={15} />}>
              <input
                required
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Your name"
                className="w-full bg-transparent outline-none"
                style={{ fontSize: "13px", color: "var(--foreground)" }}
              />
            </Field>
          )}

          <Field label="Email" icon={<Mail size={15} />}>
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="w-full bg-transparent outline-none"
              style={{ fontSize: "13px", color: "var(--foreground)" }}
            />
          </Field>

          <Field label="Password" icon={<LockKeyhole size={15} />}>
            <input
              required
              type="password"
              minLength={isRegister ? 8 : 1}
              autoComplete={isRegister ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={isRegister ? "At least 8 characters" : "Your password"}
              className="w-full bg-transparent outline-none"
              style={{ fontSize: "13px", color: "var(--foreground)" }}
            />
          </Field>

          {isRegister && (
            <Field label="Confirm password" icon={<LockKeyhole size={15} />}>
              <input
                required
                type="password"
                minLength={8}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repeat your password"
                className="w-full bg-transparent outline-none"
                style={{ fontSize: "13px", color: "var(--foreground)" }}
              />
            </Field>
          )}

          {error && (
            <p className="rounded-md px-3 py-2" style={{ background: "#FEF2F2", color: "#B91C1C", fontSize: "12.5px" }}>
              {error}
            </p>
          )}

          <button
            disabled={submitting}
            type="submit"
            className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: "var(--primary)", fontSize: "13px", fontWeight: 600 }}
          >
            {submitting ? <Loader size={15} className="animate-spin" /> : <ArrowRight size={15} />}
            {submitting ? "Please wait..." : isRegister ? "Create account" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center" style={{ fontSize: "12.5px", color: "var(--muted-foreground)" }}>
          {isRegister ? "Already have an account?" : "New to ReqForge?"}{" "}
          <button
            type="button"
            onClick={() => switchMode(isRegister ? "login" : "register")}
            style={{ color: "#1E3A8A", fontWeight: 600 }}
          >
            {isRegister ? "Sign in" : "Create an account"}
          </button>
        </p>
      </section>
    </main>
  );
}

function Field({ children, icon, label }: { children: React.ReactNode; icon: React.ReactNode; label: string }) {
  return (
    <label className="block">
      <span className="block mb-1.5" style={{ fontSize: "12.5px", fontWeight: 500, color: "#374151" }}>{label}</span>
      <span
        className="flex items-center gap-2.5 rounded-md border px-3 py-2.5"
        style={{ borderColor: "var(--border)", background: "#F8FAFC", color: "#64748B" }}
      >
        {icon}
        {children}
      </span>
    </label>
  );
}
