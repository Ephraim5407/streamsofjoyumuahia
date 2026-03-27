import { useNavigate } from "react-router-dom";
import { ArrowLeft, Truck, LayoutDashboard, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import Lottie from "lottie-react";
// @ts-ignore
import comingSoonAnimation from "../../assets/lottie/coming-soon.json";

export default function Logistics() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0f1113] pb-32">
      <div className="bg-[#00204a] pt-12 sm:pt-16 pb-32 sm:pb-24 px-6 sm:px-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-20 opacity-10 pointer-events-none">
          <Truck size={300} className="text-[#349DC5] -rotate-12" />
        </div>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center gap-4 sm:gap-6">
            <button onClick={() => navigate(-1)} className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-2xl bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all active:scale-95">
              <ArrowLeft size={28} />
            </button>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight leading-[1.1] sm:leading-none">Logistics</h1>
              <div className="flex items-center gap-3 mt-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[#349DC5] animate-pulse" />
                <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Transport & Delivery</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 -mt-8 flex items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center bg-white dark:bg-[#1a1c1e] rounded-[56px] p-20 shadow-sm border border-gray-100 dark:border-white/5 w-full max-w-2xl text-center overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 p-10 opacity-[0.02] pointer-events-none">
            <Truck size={200} className="-rotate-12" />
          </div>

          <div className="w-64 h-64 mb-10 bg-blue-50/50 dark:bg-white/[0.02] rounded-[48px] p-4 flex items-center justify-center border border-blue-500/10 shadow-2xl shadow-blue-500/5 overflow-hidden">
            <Lottie
              animationData={comingSoonAnimation}
              loop={true}
              autoPlay={true}
              style={{ width: 240, height: 240 }}
            />
          </div>
          
          <h2 className="text-3xl font-black text-[#00204a] dark:text-white uppercase tracking-tighter mb-4">
            Logistics Platform Under Construction
          </h2>
          
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-relaxed max-w-sm mb-12">
            The transport and deployment management tools will be available soon in an upcoming release.
          </p>

          <div className="flex items-center gap-3 py-4 px-10 bg-[#00204a] text-white rounded-2xl shadow-xl active:scale-95 transition-all cursor-pointer group" onClick={() => navigate("/home")}>
             <LayoutDashboard size={18} className="text-[#349DC5] transition-transform group-hover:rotate-12" />
             <span className="text-[11px] font-black uppercase tracking-widest">Return to Dashboard</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
