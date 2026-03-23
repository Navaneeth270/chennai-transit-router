"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Lock, User, Loader2, LogIn, UserPlus } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: AuthUser, tokens: TokenPair) => void;
}

export interface AuthUser {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.92, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 28, delay: 0.05 },
  },
  exit: { opacity: 0, scale: 0.92, y: 20, transition: { duration: 0.15 } },
};

export default function AuthModal({ isOpen, onClose, onAuthSuccess }: Props) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setDisplayName("");
    setError(null);
  };

  const toggleMode = () => {
    setMode(mode === "login" ? "signup" : "login");
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (mode === "signup") {
        const regRes = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, display_name: displayName }),
        });
        if (!regRes.ok) {
          const body = await regRes.json().catch(() => null);
          throw new Error(body?.detail || "Registration failed");
        }
      }

      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!loginRes.ok) {
        const body = await loginRes.json().catch(() => null);
        throw new Error(body?.detail || "Login failed");
      }
      const tokens: TokenPair = await loginRes.json();

      const meRes = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (!meRes.ok) throw new Error("Failed to fetch user profile");
      const user: AuthUser = await meRes.json();

      onAuthSuccess(user, tokens);
      resetForm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  const canSubmit =
    email.length > 3 &&
    password.length >= 6 &&
    (mode === "login" || displayName.length > 0) &&
    !isLoading;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            className="w-[380px] glass-panel overflow-hidden"
          >
            <div className="p-5 pb-4 border-b border-border-glass flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-accent-cyan/10 flex items-center justify-center border border-accent-cyan/20">
                  {mode === "login" ? (
                    <LogIn size={18} className="text-accent-cyan" />
                  ) : (
                    <UserPlus size={18} className="text-accent-cyan" />
                  )}
                </div>
                <div>
                  <h2 className="text-[15px] font-semibold">
                    {mode === "login" ? "Welcome Back" : "Create Account"}
                  </h2>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    {mode === "login"
                      ? "Sign in to access saved routes"
                      : "Join to save routes & track carbon"}
                  </p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
              >
                <X size={15} className="text-text-muted" />
              </motion.button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3">
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-3 rounded-xl bg-red-500/8 border border-red-500/15 text-[12px] text-red-300"
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {mode === "signup" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <InputField
                    icon={<User size={15} className="text-text-muted" />}
                    type="text"
                    placeholder="Display name"
                    value={displayName}
                    onChange={setDisplayName}
                  />
                </motion.div>
              )}

              <InputField
                icon={<Mail size={15} className="text-text-muted" />}
                type="email"
                placeholder="Email address"
                value={email}
                onChange={setEmail}
              />

              <InputField
                icon={<Lock size={15} className="text-text-muted" />}
                type="password"
                placeholder="Password (min 6 chars)"
                value={password}
                onChange={setPassword}
              />

              <motion.button
                type="submit"
                disabled={!canSubmit}
                whileHover={canSubmit ? { scale: 1.01 } : {}}
                whileTap={canSubmit ? { scale: 0.98 } : {}}
                className="w-full py-3 rounded-xl font-semibold text-[13px]
                           bg-gradient-to-r from-accent-cyan to-accent-cyan/80
                           text-bg-primary shadow-lg shadow-accent-cyan/20
                           disabled:opacity-25 disabled:cursor-not-allowed disabled:shadow-none
                           transition-all duration-200 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    {mode === "login" ? "Signing in..." : "Creating account..."}
                  </>
                ) : mode === "login" ? (
                  <>
                    <LogIn size={15} />
                    Sign In
                  </>
                ) : (
                  <>
                    <UserPlus size={15} />
                    Create Account
                  </>
                )}
              </motion.button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={toggleMode}
                  className="text-[12px] text-text-muted hover:text-accent-cyan transition-colors"
                >
                  {mode === "login"
                    ? "Don't have an account? Sign up"
                    : "Already have an account? Sign in"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function InputField({
  icon,
  type,
  placeholder,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 bg-white/3 border border-white/5 focus-within:border-white/15 focus-within:bg-white/5 transition-all duration-200">
      {icon}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-[13px] text-text-primary placeholder:text-text-muted outline-none"
      />
    </div>
  );
}
