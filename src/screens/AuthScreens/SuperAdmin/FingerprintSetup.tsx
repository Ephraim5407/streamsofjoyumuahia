/** * FingerprintSetupScreen — Web adaptation * Native biometrics (expo-local-authentication) don't exist on web. * We show a clear informational screen with an"Enable" hint that * directs users to the mobile app, and a Skip → Login link. */
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Fingerprint, Smartphone } from "lucide-react";
const PRIMARY = "#349DC5";
export default function FingerprintSetupScreen() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-white dark:bg-[#0f1218] flex flex-col items-center justify-center px-6 relative">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-12 left-5 text-2xl text-black dark:text-white"
      >
        ←
      </button>
      {/* Fingerprint icon */}
      <div className="mb-8">
        <div
          className="w-[140px] h-[140px] rounded-full flex items-center justify-center"
          style={{ backgroundColor: "#e6f4f9" }}
        >
          <div
            className="w-[110px] h-[110px] rounded-full flex items-center justify-center border-2 bg-white"
            style={{ borderColor: "#c5e6f0" }}
          >
            <Fingerprint size={74} color={PRIMARY} />
          </div>
        </div>
      </div>
      <h1 className="text-xl font-semibold text-[#0D1B34] dark:text-white mb-2.5 text-center">
        Biometric Login
      </h1>
      <p className="text-sm text-[#5B5B5B] dark:text-gray-400 text-center mb-8 leading-6 max-w-xs">
        Biometric authentication is available on the
        <strong>Streams of Joy mobile app</strong>. Download the app to enable
        fingerprint login.
      </p>
      <motion.button
        onClick={() => navigate("/login")}
        whileTap={{ scale: 0.97 }}
        className="w-full max-w-xs flex items-center justify-center gap-2 h-14 rounded-xl text-white font-semibold text-base shadow-md mb-5"
        style={{ backgroundColor: PRIMARY }}
      >
        <Smartphone size={20} /> Get Mobile App
      </motion.button>
      <button
        onClick={() => navigate("/login")}
        className="text-base font-medium"
        style={{ color: PRIMARY }}
      >
        Skip
      </button>
    </div>
  );
}
