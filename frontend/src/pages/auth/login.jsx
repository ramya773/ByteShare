var __defProp = Object.defineProperty;
var __name = (target, value) =>
  __defProp(target, "name", { value, configurable: true });
import { useLocation, Link } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { BookOpen, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
function Login() {
  const [_, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const loginMutation = useLogin();
  const onSubmit = /* @__PURE__ */ __name((values) => {
    loginMutation.mutate(
      { data: values },
      {
        onSuccess: /* @__PURE__ */ __name((data) => {
          login(data.token);
          toast({
            title: "Welcome back!",
            description: "Successfully logged in.",
          });
          setLocation("/dashboard");
        }, "onSuccess"),
        onError: /* @__PURE__ */ __name((err) => {
          toast({
            variant: "destructive",
            title: "Login failed",
            description:
              err.error?.error || "Invalid credentials. Please try again.",
          });
        }, "onError"),
      },
    );
  }, "onSubmit");
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="flex flex-col justify-center px-8 sm:px-16 lg:px-24 xl:px-32 relative">
        <Link
          href="/"
          className="absolute top-8 left-8 flex items-center gap-2 text-primary hover:opacity-80 transition-opacity"
        >
          <BookOpen className="w-6 h-6" />
          <span className="font-display font-bold text-xl tracking-tight text-foreground">
            ByteShare
          </span>
        </Link>

        <div className="max-w-md w-full mx-auto mt-16">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              Login To Your Account
            </h1>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter a valid Email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full h-11 text-base font-medium"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Log In"
                )}
              </Button>
            </form>
          </Form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link
              href="/register"
              className="text-primary font-medium hover:underline"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>

      <div className="hidden lg:flex bg-muted flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5" />
        <div className="relative z-10 max-w-lg text-center">
          <blockquote className="text-2xl font-medium leading-relaxed text-foreground mb-6">
            "The beautiful thing about learning is that no one can take it away
            from you."
          </blockquote>
          <p className="text-muted-foreground font-medium">— B.B. King</p>
        </div>
      </div>
    </div>
  );
}
__name(Login, "Login");
export { Login as default };
