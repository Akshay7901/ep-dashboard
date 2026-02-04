import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import loginBg from "@/assets/login-bg.jpg";
import brandLogo from "@/assets/brand-logo.webp";
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters")
});
type LoginFormData = z.infer<typeof loginSchema>;
const Login: React.FC = () => {
  const {
    login
  } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: {
      errors
    }
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema)
  });
  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await login({
        email: data.email,
        password: data.password
      });
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in."
      });
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error?.message || "Please check your credentials and try again."
      });
    } finally {
      setIsLoading(false);
    }
  };
  return <div className="flex min-h-screen">
      {/* Left side - Image */}
      <div className="hidden md:flex md:w-1/2 relative bg-cover bg-center" style={{
      backgroundImage: `url(${loginBg})`
    }} />

      {/* Right side - Login form */}
      <div className="flex w-full md:w-1/2 flex-col items-center justify-center p-8 bg-[#f2f2ee]">
        <Card className="w-full max-w-md shadow-lg border-0 bg-white">
          <CardContent className="p-8 space-y-6">
            {/* Logo */}
            <div className="flex items-center justify-center">
              <img src={brandLogo} alt="Ethics Press" className="h-14 w-14 object-contain" />
            </div>

            {/* Title and subtitle */}
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-semibold text-foreground">Proposal Portal</h1>
              <p className="text-muted-foreground">Access your academic review dashboard</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground font-medium">
                  Email address
                </Label>
                <Input id="email" type="email" placeholder="your.email@university.edu" className="h-12 text-base bg-[#f0f4f8] border-0 placeholder:text-muted-foreground/60" {...register("email")} />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground font-medium">
                  Access code
                </Label>
                <Input id="password" type="password" placeholder="Enter your code" className="h-12 text-base bg-[#f0f4f8] border-0 placeholder:text-muted-foreground/60" {...register("password")} />
                {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
              </div>

              <Button type="submit" className="w-full h-12 text-base font-medium bg-[#3d5a47] hover:bg-[#2d4a37] text-white " disabled={isLoading}>
                {isLoading ? <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Signing in...
                  </> : "Log in"}
              </Button>
            </form>

            <div className="text-center">
              
            </div>
          </CardContent>
        </Card>
      </div>
    </div>;
};
export default Login;