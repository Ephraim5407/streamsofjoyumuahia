import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Lottie from "lottie-react";
import { ArrowLeft } from "lucide-react";
// @ts-ignore
import comingSoonAnimation from "../assets/lottie/coming-soon.json";

const PRIMARY_BLUE = "#007BFF";

export default function LegalContentScreen() {
  const location = useLocation();
  const navigate = useNavigate();

  // Equivalent roughly to route.params.type
  const type = location.state?.type === "privacy" ? "privacy" : "terms";
  const [backScale, setBackScale] = useState(1);

  const handleBackPress = async () => {
    setBackScale(0.9);
    setTimeout(() => {
      setBackScale(1);
      navigate(-1);
    }, 150);
  };

  return (
    <div className="flex-1 w-full min-h-screen bg-gradient-to-b from-[#f0f4f8] via-[#e1e8ed] to-[#d4e4f7] dark:from-[#121820] dark:via-[#1e2732] dark:to-[#1a232c] flex flex-col relative text-black dark:text-white">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 h-20 px-5 flex justify-center items-center border-b border-black/5 dark:border-white/5 backdrop-blur-xl bg-white/70 dark:bg-black/60 shadow-sm">
        <motion.button
          onClick={handleBackPress}
          animate={{ scale: backScale }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          style={{ boxShadow: `0 4px 8px rgba(0, 123, 255, 0.25)` }}
          className="absolute left-5 w-12 h-12 rounded-full bg-white dark:bg-gray-800 flex justify-center items-center border border-blue-500/20 shadow-lg hover:shadow transition-shadow"
        >
          <ArrowLeft size={24} color={PRIMARY_BLUE} strokeWidth={3} />
        </motion.button>
        <motion.h1
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-[22px] font-bold text-[#2c3e50] dark:text-[#f0f4f8] text-center"
        >
          {type === "terms" ? "Terms of Use" : "Privacy Policy"}
        </motion.h1>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col justify-center items-center pt-[120px] px-5 w-full">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center"
        >
          <div
            className="rounded-[25px] overflow-hidden mb-5 bg-white/5 dark:bg-black/5 backdrop-blur-sm shadow-md"
            style={{ boxShadow: "0 12px 25px rgba(0, 123, 255, 0.4)" }}
          >
            <Lottie
              animationData={comingSoonAnimation}
              loop={true}
              autoPlay={true}
              style={{ width: 280, height: 280 }}
            />
          </div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-[18px] font-medium text-[#555] dark:text-[#999] text-center mt-2.5"
          >
            We're crafting this carefully. Check back soon!
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
