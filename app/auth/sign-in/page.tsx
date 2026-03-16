"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Dumbbell, Zap, Target, TrendingUp } from "lucide-react";

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type SignInValues = z.infer<typeof signInSchema>;

export default function SignInPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const registered = searchParams.get("registered") === "1";
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: SignInValues) => {
    setError(null);
    const res = await signIn("credentials", {
      redirect: false,
      email: values.email,
      password: values.password,
      callbackUrl,
    });

    if (!res || res.error) {
      setError("Invalid email or password");
      return;
    }

    const session = await getSession();
    const role = (session?.user as any)?.role;

    if (role === "ADMIN") router.push("/admin/analytics");
    else if (role === "COACH") router.push("/coach/dashboard");
    else if (role === "CLIENT") router.push("/client/dashboard");
    else router.push(callbackUrl || "/");
  };

  return (
    <div className="flex min-h-screen bg-zinc-950">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(234,88,12,0.18),_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(234,88,12,0.10),_transparent_60%)]" />

        {/* Decorative grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Big decorative dumbbell */}
        <div className="absolute -right-16 top-1/2 -translate-y-1/2 opacity-[0.04]">
          <Dumbbell className="w-[420px] h-[420px] text-orange-400" strokeWidth={1} />
        </div>

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-orange-500 shadow-lg shadow-orange-500/30">
            <Dumbbell className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-xl tracking-tight">CrosCal</span>
        </div>

        {/* Hero text */}
        <div className="relative space-y-6">
          <div className="space-y-3">
            <p className="text-orange-500 text-sm font-semibold uppercase tracking-widest">
              Your Training Hub
            </p>
            <h2 className="text-5xl font-black text-white leading-[1.05] tracking-tight">
              Push Your<br />
              <span className="text-orange-500">Limits.</span>
            </h2>
            <p className="text-zinc-400 text-base leading-relaxed max-w-xs">
              Track progress, follow your plan, and reach goals — all in one place built for serious athletes.
            </p>
          </div>

          {/* Feature bullets */}
          <div className="space-y-3">
            {[
              { icon: Target, label: "Goal tracking with real-time progress" },
              { icon: Zap, label: "Personalized workout programs" },
              { icon: TrendingUp, label: "Coach-guided session logging" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-orange-500/15 border border-orange-500/20">
                  <Icon className="w-3.5 h-3.5 text-orange-400" />
                </div>
                <span className="text-zinc-300 text-sm">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="relative text-zinc-600 text-xs">
          © {new Date().getFullYear()} CrosCal Gym Management
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 bg-zinc-950 lg:bg-zinc-900/50">
        {/* Mobile logo */}
        <div className="flex lg:hidden items-center gap-2 mb-8">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-orange-500 shadow-lg shadow-orange-500/30">
            <Dumbbell className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">CrosCal</span>
        </div>

        <div className="w-full max-w-sm space-y-8">
          {/* Heading */}
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Welcome back
            </h1>
            <p className="text-zinc-400 text-sm">
              Sign in to your account to continue training.
            </p>
          </div>

          {/* Registered success */}
          {registered && (
            <div className="flex items-start gap-3 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3">
              <div className="mt-0.5 h-2 w-2 rounded-full bg-green-400 flex-shrink-0" />
              <p className="text-sm text-green-400">
                Registration submitted. You can sign in once an admin approves your account.
              </p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300" htmlFor="email">
                Email address
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="bg-zinc-800/70 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:border-orange-500 focus-visible:ring-orange-500/20 h-11"
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p className="text-xs text-red-400">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="bg-zinc-800/70 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:border-orange-500 focus-visible:ring-orange-500/20 h-11 pr-11"
                  {...form.register("password")}
                />
                <button
                  type="button"
                  className="absolute right-0 top-0 h-full px-3 text-zinc-400 hover:text-zinc-200 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-xs text-red-400">{form.formState.errors.password.message}</p>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5">
                <div className="h-1.5 w-1.5 rounded-full bg-red-400 flex-shrink-0" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="w-full h-11 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm shadow-lg shadow-orange-500/25 transition-all hover:shadow-orange-500/40 border-0"
            >
              {form.formState.isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Signing in…
                </span>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-zinc-500">
            New here?{" "}
            <Link
              href="/auth/register"
              className="text-orange-400 hover:text-orange-300 font-medium transition-colors"
            >
              Register as a client
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
