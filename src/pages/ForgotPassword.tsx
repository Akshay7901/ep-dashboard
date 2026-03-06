import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Mail, FileText } from 'lucide-react';
import loginBg from '@/assets/login-bg.jpg';
import brandLogo from '@/assets/brand-logo.webp';
import OtpScreen from '@/components/auth/OtpScreen';
import SetPasswordScreen from '@/components/auth/SetPasswordScreen';
import { authApi } from '@/lib/authApi';

const forgotSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotFormData = z.infer<typeof forgotSchema>;
type ForgotStep = 'email' | 'otp' | 'set-password';

const ForgotPassword: React.FC = () => {
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<ForgotStep>('email');
  const [email, setEmail] = useState('');
  const [tempToken, setTempToken] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotFormData>({
    resolver: zodResolver(forgotSchema),
  });

  const onSubmit = async (data: ForgotFormData) => {
    setIsLoading(true);
    try {
      await authApi.forgotPassword(data.email);
      setEmail(data.email);
      setStep('otp');
      toast({
        title: 'OTP sent!',
        description: 'Check your email for a verification code.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Request failed',
        description: error.response?.data?.message || 'Unable to send reset email. Please try again.',
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
        toast({ title: 'Welcome back!', description: 'You have successfully logged in.' });
        navigate('/proposals');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Verification failed',
        description: error.response?.data?.error || error.message || 'Invalid or expired code. Please try again.',
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
      toast({ title: 'Password reset!', description: 'Your new password has been set.' });
      const userStr = localStorage.getItem('user');
      const userData = userStr ? JSON.parse(userStr) : null;
      if (userData?.role === 'author') {
        navigate('/author/proposals');
      } else {
        navigate('/proposals');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to set password',
        description: error.response?.data?.message || 'Please try again.',
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
            onBack={() => setStep('email')}
          />
        );
      case 'set-password':
        return (
          <SetPasswordScreen 
            title="Reset your password" 
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
              <h2 className="text-2xl font-semibold text-foreground">Forgot password?</h2>
              <p className="text-muted-foreground text-sm">
                Enter your email and we'll send you a verification code
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground font-medium">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    className="pl-10 h-12 bg-[#f0f4f8] border-0 focus-visible:ring-[#3d5a47]"
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-medium bg-[#3d5a47] hover:bg-[#2d4a37] text-white"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send verification code'
                )}
              </Button>
            </form>

            <div className="text-center mt-6">
              <Link
                to="/login"
                className="inline-flex items-center text-sm font-medium text-[#3d5a47] hover:text-[#2d4a37] transition-colors"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to login
              </Link>
            </div>
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

export default ForgotPassword;
