"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Dumbbell, ChevronRight } from "lucide-react";

const registerSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email(),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
    phone: z.string().optional(),
    dateOfBirth: z.string().optional(),
    address: z.string().optional(),
    gender: z.string().optional(),
    occupation: z.string().optional(),
    emergencyContact: z.string().optional(),
    gymNotes: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterValues = z.infer<typeof registerSchema>;

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label className="text-sm font-medium text-zinc-300" htmlFor={htmlFor}>
      {children}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-400 mt-1">{message}</p>;
}

const inputClass =
  "bg-zinc-800/70 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:border-orange-500 focus-visible:ring-orange-500/20 h-10";

const selectClass =
  "flex h-10 w-full rounded-md border border-zinc-700 bg-zinc-800/70 px-3 py-1 text-sm text-white shadow-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 transition-colors";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      dateOfBirth: "",
      address: "",
      gender: "",
      occupation: "",
      emergencyContact: "",
      gymNotes: "",
    },
  });

  const onSubmit = async (values: RegisterValues) => {
    setError(null);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: values.name,
        email: values.email,
        password: values.password,
        phone: values.phone || undefined,
        dateOfBirth: values.dateOfBirth || undefined,
        address: values.address || undefined,
        gender: values.gender || undefined,
        occupation: values.occupation || undefined,
        emergencyContact: values.emergencyContact || undefined,
        gymNotes: values.gymNotes || undefined,
      }),
    });
    const json = await res.json();

    if (!res.ok) {
      setError(json.error ?? "Registration failed");
      return;
    }

    router.push("/auth/sign-in?registered=1");
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/60">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-500 shadow-md shadow-orange-500/30">
            <Dumbbell className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-base tracking-tight">CrosCal</span>
        </div>
        <Link
          href="/auth/sign-in"
          className="text-sm text-zinc-400 hover:text-white transition-colors flex items-center gap-1"
        >
          Already a member? Sign in <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </header>

      {/* Content */}
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg space-y-8">
          {/* Heading */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-black text-white tracking-tight">
              Join <span className="text-orange-500">CrosCal</span>
            </h1>
            <p className="text-zinc-400 text-sm">
              Create your account. An admin will approve it before you can sign in.
            </p>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm shadow-xl shadow-black/40 overflow-hidden">
            <form onSubmit={form.handleSubmit(onSubmit)} className="divide-y divide-zinc-800/60">

              {/* Section: Account */}
              <div className="px-6 py-5 space-y-4">
                <p className="text-xs font-semibold text-orange-500 uppercase tracking-widest">
                  Account
                </p>

                <div className="space-y-1.5">
                  <FieldLabel htmlFor="name">Full name</FieldLabel>
                  <Input id="name" type="text" autoComplete="name" placeholder="Juan dela Cruz" className={inputClass} {...form.register("name")} />
                  <FieldError message={form.formState.errors.name?.message} />
                </div>

                <div className="space-y-1.5">
                  <FieldLabel htmlFor="email">Email address</FieldLabel>
                  <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" className={inputClass} {...form.register("email")} />
                  <FieldError message={form.formState.errors.email?.message} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="••••••••"
                        className={`${inputClass} pr-10`}
                        {...form.register("password")}
                      />
                      <button
                        type="button"
                        className="absolute right-0 top-0 h-full px-3 text-zinc-400 hover:text-zinc-200 transition-colors"
                        onClick={() => setShowPassword((v) => !v)}
                      >
                        {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <FieldError message={form.formState.errors.password?.message} />
                  </div>

                  <div className="space-y-1.5">
                    <FieldLabel htmlFor="confirmPassword">Confirm</FieldLabel>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="••••••••"
                        className={`${inputClass} pr-10`}
                        {...form.register("confirmPassword")}
                      />
                      <button
                        type="button"
                        className="absolute right-0 top-0 h-full px-3 text-zinc-400 hover:text-zinc-200 transition-colors"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <FieldError message={form.formState.errors.confirmPassword?.message} />
                  </div>
                </div>
              </div>

              {/* Section: Personal */}
              <div className="px-6 py-5 space-y-4">
                <p className="text-xs font-semibold text-orange-500 uppercase tracking-widest">
                  Personal info
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <FieldLabel htmlFor="phone">Phone</FieldLabel>
                    <Input id="phone" type="tel" autoComplete="tel" placeholder="09XX XXX XXXX" className={inputClass} {...form.register("phone")} />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel htmlFor="dateOfBirth">Date of birth</FieldLabel>
                    <Input id="dateOfBirth" type="date" className={inputClass} {...form.register("dateOfBirth")} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <FieldLabel htmlFor="gender">Gender</FieldLabel>
                    <select id="gender" {...form.register("gender")} className={selectClass}>
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel htmlFor="occupation">Occupation</FieldLabel>
                    <Input id="occupation" type="text" placeholder="e.g. Engineer" className={inputClass} {...form.register("occupation")} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <FieldLabel htmlFor="address">Address</FieldLabel>
                  <Input id="address" type="text" autoComplete="street-address" placeholder="Street, city, barangay" className={inputClass} {...form.register("address")} />
                </div>

                <div className="space-y-1.5">
                  <FieldLabel htmlFor="emergencyContact">Emergency contact</FieldLabel>
                  <Input id="emergencyContact" type="text" placeholder="Name and phone number" className={inputClass} {...form.register("emergencyContact")} />
                </div>
              </div>

              {/* Section: Gym */}
              <div className="px-6 py-5 space-y-4">
                <p className="text-xs font-semibold text-orange-500 uppercase tracking-widest">
                  Gym info
                </p>

                <div className="space-y-1.5">
                  <FieldLabel htmlFor="gymNotes">Fitness goals / notes</FieldLabel>
                  <textarea
                    id="gymNotes"
                    rows={3}
                    placeholder="Fitness goals, medical conditions, anything the gym should know…"
                    className="flex w-full rounded-md border border-zinc-700 bg-zinc-800/70 px-3 py-2 text-sm text-white placeholder:text-zinc-500 shadow-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 transition-colors resize-none"
                    {...form.register("gymNotes")}
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="px-6 py-5 space-y-4">
                {error && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-red-400 flex-shrink-0" />
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting}
                  className="w-full h-11 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all border-0"
                >
                  {form.formState.isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Submitting…
                    </span>
                  ) : (
                    "Create account"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
