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
import OtpScreen from "@/components/auth/OtpScreen";
import SetPasswordScreen from "@/components/auth/SetPasswordScreen";
import { authApi } from "@/lib/authApi";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

type LoginStep = 'credentials' | 'otp' | 'set-password';

const Login: React.FC = () => {
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<LoginStep>('credentials');
  const [email, setEmail] = useState('');
  const [tempToken, setTempToken] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const redirectToDashboard = (role?: string) => {
    // Check role from parameter or localStorage if not provided
    let userRole = role;
    if (!userRole) {
      const userStr = localStorage.getItem('user');
      const userData = userStr ? JSON.parse(userStr) : null;
      userRole = userData?.role;
    }

    if (userRole === 'author') {
      navigate("/author/proposals");
    } else {
      navigate("/proposals");
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const password = data.password && data.password.trim() ? data.password : undefined;
      const response = await authApi.login(data.email, password);

      if (response.requires_otp) {
        setEmail(data.email);
        setStep('otp');
        toast({
          title: "OTP sent",
          description: response.message || "Check your email for a verification code.",
        });
      } else if (response.token) {
        loginWithToken(response.token, response);
        toast({ title: "Welcome back!", description: "You have successfully logged in." });
        redirectToDashboard(response.user?.role || response.role);
      }
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || error.message || "Please check your credentials and try again.";
      
      toast({
        variant: "destructive",
        title: "Login failed",
        description: msg,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpVerify = async (otp: string) => {
    setIsLoading(true);
    try {
      const response = await authApi.verifyOtp(email, otp);

      if (response.temp_token) {
        setTempToken(response.temp_token);
        setStep('set-password');
      } else if (response.token) {
        loginWithToken(response.token, response);
        toast({ title: "Welcome back!", description: "You have successfully logged in." });
        redirectToDashboard(response.user?.role || response.role);
      }
    } catch (error: any) {
      const msg = error.response?.data?.error || error.message || "Invalid or expired code. Please try again.";
      toast({
        variant: "destructive",
        title: "Verification failed",
        description: msg,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPassword = async (password: string) => {
    if (!tempToken) return;
    setIsLoading(true);
    try {
      const response = await authApi.setPassword(tempToken, password);
      loginWithToken(response.token, response);
      toast({ title: "Password set!", description: "Your account is ready." });
      redirectToDashboard(response.user?.role || response.role);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to set password",
        description: error.response?.data?.message || "Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'otp':
        return (
          <OtpScreen 
            email={email} 
            onVerify={handleOtpVerify} 
            isLoading={isLoading} 
            onBack={() => setStep('credentials')}
          />
        );
      case 'set-password':
        return (
          <SetPasswordScreen 
            title="Set your password" 
            onSubmit={handleSetPassword} 
            isLoading={isLoading} 
          />
        );
      default:
        return (
          <div className="animate-fade-in">
            <div className="flex items-center justify-center mb-6">
              <img src={brandLogo} alt="Ethics Press" className="h-14 w-14 object-contain" />
            </div>
            
            <div className="text-center space-y-2 mb-8">
              <h1 className="text-2xl font-semibold text-foreground">Proposal Portal</h1>
              <p className="text-muted-foreground">Access your academic review dashboard</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground font-medium">
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@university.edu"
                  className="h-12 text-base bg-[#f0f4f8] border-0 placeholder:text-muted-foreground/60 focus-visible:ring-[#3d5a47]"
                  {...register("email")}
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-foreground font-medium">
                    Password
                  </Label>
                  <Link
                    to="/forgot-password"
                    className="text-sm font-medium text-[#3d5a47] hover:text-[#2d4a37] transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  className="h-12 text-base bg-[#f0f4f8] border-0 placeholder:text-muted-foreground/60 focus-visible:ring-[#3d5a47]"
                  {...register("password")}
                />
                <p className="text-xs text-muted-foreground">Leave blank for first-time login</p>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-medium bg-[#3d5a47] hover:bg-[#2d4a37] text-white"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Log in"
                )}
              </Button>
            </form>
          </div>
        );
    }
  };

  return (
    <div className="flex min-h-screen">
      <div
        className="hidden md:flex md:w-1/2 relative bg-cover bg-center"
        style={{ backgroundImage: `url(${loginBg})` }}
      />
      <div className="flex w-full md:w-1/2 flex-col items-center justify-center p-8 bg-[#f2f2ee]">
        <Card className="w-full max-w-md shadow-lg border-0 bg-white">
          <CardContent className="p-8 space-y-6">
            {renderStep()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
