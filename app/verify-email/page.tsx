"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Ticket, CheckCircle, XCircle, Loader2, ArrowRight } from "lucide-react";
import { authApi, extractError } from "@/lib/api";
import toast from "react-hot-toast";

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMsg("Verification token is missing in the URL.");
      return;
    }

    let active = true;
    async function performVerification() {
      try {
        const res = await authApi.verifyEmail(token!);
        if (!active) return;

        if (!res.success) {
          setStatus("error");
          setErrorMsg(extractError(res));
          return;
        }

        setStatus("success");
        toast.success("Email verified successfully!");
        // Refresh session/user status if logged in
        setTimeout(() => {
          router.push("/login");
        }, 4000);
      } catch (err: any) {
        if (!active) return;
        setStatus("error");
        setErrorMsg(err.message || "An unexpected error occurred during verification.");
      }
    }

    performVerification();
    return () => {
      active = false;
    };
  }, [token, router]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-16 bg-[#060f17]">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full bg-[#ff5a5f]/6 blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 28, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="rounded-3xl bg-[#112240] border border-white/8 overflow-hidden shadow-2xl shadow-black/50 p-8 text-center">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 w-fit mx-auto mb-8">
            <div className="w-8 h-8 rounded-lg bg-[#ff5a5f] flex items-center justify-center shadow-[0_0_14px_rgba(255,90,95,0.4)]">
              <Ticket className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">
              Event<span className="text-[#ff5a5f]">Nest</span>
            </span>
          </Link>

          {status === "loading" && (
            <div className="py-8 space-y-4">
              <Loader2 className="w-12 h-12 text-[#ff5a5f] animate-spin mx-auto" />
              <h2 className="text-xl font-extrabold text-white">Verifying email address</h2>
              <p className="text-white/45 text-sm">Please hold on while we verify your credentials…</p>
            </div>
          )}

          {status === "success" && (
            <div className="py-6 space-y-5">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-extrabold text-white">Email Verified!</h2>
                <p className="text-white/45 text-sm leading-relaxed">
                  Thank you! Your email address has been successfully verified. You now have full access to EventNest.
                </p>
              </div>
              <p className="text-white/30 text-xs">Redirecting you to the sign-in page shortly…</p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#ff5a5f] text-white font-bold text-sm shadow-[0_0_16px_rgba(255,90,95,0.3)] hover:shadow-[0_0_24px_rgba(255,90,95,0.45)] transition-all"
              >
                Go to Sign In <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {status === "error" && (
            <div className="py-6 space-y-5">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-extrabold text-white">Verification Failed</h2>
                <p className="text-red-400/80 text-sm leading-relaxed">{errorMsg}</p>
              </div>
              <p className="text-white/35 text-xs">
                The link might be invalid or expired. If you are logged in, you can request a new verification email from your dashboard.
              </p>
              <div className="flex flex-col gap-2 pt-2">
                <Link
                  href="/login"
                  className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-semibold text-sm hover:bg-white/10 hover:border-white/20 transition-all"
                >
                  Back to Log In
                </Link>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#ff5a5f] animate-spin" />
      </div>
    }>
      <VerifyEmailForm />
    </Suspense>
  );
}
