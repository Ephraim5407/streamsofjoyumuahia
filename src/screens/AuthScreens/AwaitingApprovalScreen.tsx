import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import axios from "axios";
import { Clock, ArrowRight } from "lucide-react";
// @ts-ignore
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URl } from "../../api/users";
export default function AwaitingApprovalScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const name = location.state?.name as string | undefined;
  const [checking, setChecking] = useState(false);
  const onCheckStatus = async () => {
    if (checking) return;
    setChecking(true);
    try {
      let email: string | null = location.state?.email || null;
      if (!email) {
        try {
          email = await AsyncStorage.getItem("pendingEmail");
        } catch {}
      }
      if (!email) {
        try {
          const raw = await AsyncStorage.getItem("user");
          if (raw) {
            const u = JSON.parse(raw);
            email = u?.email || null;
          }
        } catch {}
      }
      if (!email) {
        toast.error("No email found. Please provide your email to continue.");
        navigate("/register");
        return;
      }
      const resp = await axios.post(`${BASE_URl}/api/users/lookup-email`, {
        email,
      });
      if (resp.data?.ok && resp.data.exists) {
        const { approved, registrationCompleted, hasPassword } = resp.data;
        if (approved === true) {
          toast.success("Your account has been approved. You can now login.");
          navigate("/login");
          return;
        }
        if (registrationCompleted === false || hasPassword === false) {
          toast("Action required: Please finish your registration.");
          navigate("/verify-email", {
            state: { email, userId: resp.data.userId },
          });
          return;
        }
        toast(
          "Your account is still pending. A leader has not approved your account yet.",
        );
      } else if (resp.data?.ok && resp.data.exists === false) {
        toast.error("We could not find an account for that email.");
        navigate("/register");
      } else {
        toast.error("Unexpected response from server.");
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Network error";
      toast.error(`Check failed: ${msg}`);
    } finally {
      setChecking(false);
    }
  };
  return (
    <div className="flex-1 w-full min-h-screen bg-white dark:bg-[#0f1218] flex flex-col items-center justify-center px-8 pt-12 pb-10">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="w-[72px] h-[72px] rounded-full bg-[#e8f5fb] dark:bg-[#1a3a4a] flex items-center justify-center mb-5 shadow-md"
        style={{ boxShadow: "0 6px 20px rgba(52,157,197,0.20)" }}
      >
        <Clock size={38} color="#349DC5" strokeWidth={1.8} />
      </motion.div>
      <motion.h1
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.6 }}
        className="text-[22px] font-bold text-[#0E2433] dark:text-white mb-3 text-center"
      >
        {name ? `Thanks, ${name}!` : "Registration Submitted"}
      </motion.h1>
      <motion.p
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.25, duration: 0.6 }}
        className="text-base text-[#444] dark:text-gray-400 text-center leading-relaxed mb-10 max-w-sm"
      >
        Your account is awaiting approval by a leader. You&apos;ll get access to
        the dashboard once approved.
      </motion.p>
      <motion.button
        onClick={onCheckStatus}
        disabled={checking}
        whileTap={{ scale: 0.96 }}
        whileHover={{ scale: 1.02 }}
        className="flex flex-row items-center gap-3 bg-[#349DC5] text-white font-semibold text-base px-8 py-3.5 rounded-[10px] shadow-md disabled:opacity-60 transition-all"
        style={{ boxShadow: "0 4px 16px rgba(52,157,197,0.30)" }}
      >
        {checking ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <span>Check status</span>
            <ArrowRight size={18} color="white" />
          </>
        )}
      </motion.button>
    </div>
  );
}
