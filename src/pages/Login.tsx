import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Mail, Lock, User, ArrowLeft, Loader2 } from "lucide-react";

import loginImage from "@/assets/login-side.jpg";

/* ================= Validation ================= */

const schema = z.object({
  name: z.string().min(2, "Name required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Min 6 characters"),
});

type FormData = z.infer<typeof schema>;

/* ================= Component ================= */

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);

    setTimeout(() => {
      console.log(data);
      setLoading(false);
      navigate("/dashboard");
    }, 1500);
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* ================= LEFT FORM ================= */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-6">
          {/* Back Button */}
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-black">
            <ArrowLeft size={18} />
            Back
          </button>

          {/* Heading */}
          <div className="text-center">
            <h1 className="text-3xl font-bold">Register</h1>

            <p className="text-gray-500 text-sm mt-1">Create your new account</p>
          </div>

          {/* ================= FORM ================= */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Name */}
            <div>
              <Label>Name</Label>

              <div className="relative mt-1">
                <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />

                <Input placeholder="Enter your name" className="pl-10 bg-orange-50 border-none" {...register("name")} />
              </div>

              {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>}
            </div>

            {/* Email */}
            <div>
              <Label>Email</Label>

              <div className="relative mt-1">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />

                <Input
                  placeholder="Enter valid email"
                  className="pl-10 bg-orange-50 border-none"
                  {...register("email")}
                />
              </div>

              {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <Label>Password</Label>

              <div className="relative mt-1">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />

                <Input
                  type="password"
                  placeholder="Set a strong password"
                  className="pl-10 bg-orange-50 border-none"
                  {...register("password")}
                />
              </div>

              {errors.password && <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>}
            </div>

            {/* Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-400 hover:bg-orange-500 text-white rounded-xl h-11"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Please wait
                </>
              ) : (
                "Login"
              )}
            </Button>
          </form>

          {/* Remember + Forgot */}
          <div className="flex justify-between text-sm text-gray-500">
            <label className="flex items-center gap-2">
              <input type="checkbox" />
              Remember me
            </label>

            <Link to="/forgot-password" className="text-orange-500 hover:underline">
              Forgot Password?
            </Link>
          </div>

          {/* Social */}
          <div className="text-center text-sm text-gray-400">
            <p className="my-3">Or continue with</p>

            <div className="flex justify-center gap-4 text-lg">
              <button>🔵</button>
              <button>🟢</button>
              <button>⚫</button>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-sm text-gray-500 pt-2">
            Already have account?{" "}
            <Link to="/login" className="text-orange-500 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* ================= RIGHT IMAGE ================= */}
      <div className="hidden lg:block w-1/2">
        <img src={loginImage} alt="Login" className="h-full w-full object-cover" />
      </div>
    </div>
  );
};

export default Login;
