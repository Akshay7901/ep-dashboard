import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

import { Loader2, FileText, Mail, Lock } from "lucide-react";

import loginBg from "@/assets/login-bg.jpg";

/* ================== Validation ================== */

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

/* ================== Component ================== */

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  /* ================== Submit ================== */

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);

    try {
      await login({
        email: data.email,
        password: data.password,
      });

      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });

      navigate("/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error?.message || "Please check your credentials and try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  /* ================== UI ================== */

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* ================= LEFT SIDE IMAGE ================= */}
      <div
        className="hidden lg:flex relative items-center justify-center bg-cover bg-center"
        style={{ backgroundImage: `url(${loginBg})` }}
      >
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-foreground/60" />

        {/* Text Content */}
        <div className="relative z-10 text-white px-12 max-w-xl">
          <h1 className="text-4xl font-bold mb-6 leading-tight">
            Manage Your Proposals <br />
            Smarter & Faster
          </h1>

          <p className="text-lg text-gray-200 mb-8">
            Track, organize, and close deals efficiently using ProposalHub’s powerful dashboard.
          </p>

          {/* Branding */}
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center">
              <FileText className="text-white" />
            </div>

            <span className="text-xl font-semibold">ProposalHub Platform</span>
          </div>
        </div>
      </div>

      {/* ================= RIGHT SIDE LOGIN ================= */}
      <div className="flex items-center justify-center bg-background p-8">
        <div className="w-full max-w-md bg-card rounded-2xl shadow-xl p-8 space-y-6">
          {/* Logo */}
          <div className="flex flex-col items-center gap-3 mb-4">
            <div className="h-14 w-14 rounded-xl bg-primary flex items-center justify-center">
              <FileText className="h-7 w-7 text-primary-foreground" />
            </div>

            <h1 className="text-2xl font-bold text-foreground">ProposalHub</h1>

            <p className="text-muted-foreground text-sm text-center">Sign in to manage your proposals</p>
          </div>

          {/* Heading */}
          <div className="text-center">
            <h2 className="text-xl font-semibold">Welcome Back 👋</h2>

            <p className="text-sm text-muted-foreground mt-1">Enter your credentials to continue</p>
          </div>

          {/* ================= FORM ================= */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div>
              <Label>Email</Label>

              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

                <Input type="email" placeholder="you@company.com" className="pl-10" {...register("email")} />
              </div>

              {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center">
                <Label>Password</Label>

                <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                  Forgot?
                </Link>
              </div>

              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

                <Input type="password" placeholder="••••••••" className="pl-10" {...register("password")} />
              </div>

              {errors.password && <p className="text-sm text-destructive mt-1">{errors.password.message}</p>}
            </div>

            {/* Submit */}
            <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground pt-4">© 2025 ProposalHub. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
