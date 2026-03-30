import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Users, LogOut, FileText, Settings, UserCircle, ChevronRight, Fingerprint, ShieldAlert, BookOpen, AlertCircle, Moon, Sun } from "lucide-react";
import axios from "axios";
import { BASE_URl } from "../../api/users";
import toast from "react-hot-toast";
import { AppEventBus } from "../../utils/AppEventBus";

const token = () => localStorage.getItem("token");

export default function MoreScreen() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showUpdatesModal, setShowUpdatesModal] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem("theme") === "dark" || document.documentElement.classList.contains("dark");
  });

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BASE_URl}/api/users/me`, { headers: { Authorization: `Bearer ${token()}` } });
      if (res.data?.ok) {
        setProfile(res.data.user);
      }
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchProfile();
    const bioPref = localStorage.getItem("biometricEnabled");
    if (bioPref === "true") setBiometricEnabled(true);

    const unsub = AppEventBus.on((event, payload) => {
      if (event === "themeChanged") {
        setIsDarkMode(payload);
      }
    });
    return unsub;
  }, [fetchProfile]);

  const toggleTheme = (val: boolean) => {
    setIsDarkMode(val);
    AppEventBus.emit("setDarkMode", val);
  };

  const handleLogout = async () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("activeUnitId");
    navigate("/welcome", { replace: true });
  };

  const whoManage = profile?.activeRole === 'SuperAdmin' ? 'superadmin' : profile?.activeRole === 'UnitLeader' ? 'unitleader' : profile?.activeRole === 'MinistryAdmin' ? 'ministryadmn' : 'member';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#111] pb-24">
      {/* Header */}
      <div className="bg-white dark:bg-[#1a1a1a] border-b border-gray-100 dark:border-white/5 px-4 pt-10 pb-4 sticky top-0 z-20">
        <h1 className="text-xl font-black text-[#00204a] dark:text-white uppercase tracking-tight">More</h1>
      </div>

      <div className="px-4 pt-6 space-y-6">
        
        {/* Profile Link */}
        <div className="space-y-2">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest pl-2">Account</p>
          <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden shadow-sm">
            <button onClick={() => navigate("/profile")} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#349DC5]/10 flex items-center justify-center">
                  <UserCircle size={20} className="text-[#349DC5]" />
                </div>
                <div>
                  <p className="text-sm font-black text-[#00204a] dark:text-white">Profile</p>
                  <p className="text-xs font-medium text-gray-400">View and edit your personal details</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-gray-300" />
            </button>
          </div>
        </div>

        {/* Manage Section */}
        {whoManage !== 'member' && (
          <div className="space-y-2">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest pl-2">Manage</p>
            <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden shadow-sm">
              <button 
                onClick={() => {
                  if (whoManage === 'superadmin' || whoManage === 'ministryadmn') {
                    navigate("/sa/all-units");
                  } else {
                    navigate("/manage-unit");
                  }
                }}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                    <Users size={20} className="text-[#349DC5]" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-[#00204a] dark:text-white">
                      Manage {whoManage === 'superadmin' ? 'Admins & Work Plans' : whoManage === 'unitleader' ? 'and control unit' : 'Youth And Singles'}
                    </p>
                    <p className="text-xs font-medium text-gray-400">
                      {whoManage === 'superadmin' ? 'Approve Unit Leaders and Work Plans' : `Manage and control ${whoManage === "unitleader" ? "Unit" : "Youth and Singles"} (approvals, duties)`}
                    </p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-300" />
              </button>
            </div>
          </div>
        )}

        {whoManage === 'member' && (
          <div className="space-y-2">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest pl-2">Manage</p>
            <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden shadow-sm">
              <button 
                onClick={() => navigate("/work-plans")}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                    <Users size={20} className="text-[#349DC5]" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-[#00204a] dark:text-white">View Unit Work Plan</p>
                    <p className="text-xs font-medium text-gray-400">View Your Unit Work Plan</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-300" />
              </button>
            </div>
          </div>
        )}

        {/* Legal Section */}
        <div className="space-y-2">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest pl-2">Legal</p>
          <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden shadow-sm">
            <button onClick={() => setShowTermsModal(true)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center">
                  <FileText size={20} className="text-[#349DC5]" />
                </div>
                <p className="text-sm font-black text-[#00204a] dark:text-white">Terms & Privacy Policy</p>
              </div>
              <ChevronRight size={18} className="text-gray-300" />
            </button>
          </div>
        </div>

        {/* App Section */}
        <div className="space-y-2">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest pl-2">App</p>
          <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden shadow-sm">
            <button onClick={() => setShowUpdatesModal(true)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center">
                  <AlertCircle size={20} className="text-[#349DC5]" />
                </div>
                <div>
                  <p className="text-sm font-black text-[#00204a] dark:text-white">App Updates & Version Info</p>
                  <p className="text-xs font-medium text-gray-400">Current: v1.0.0 • Web Version</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-gray-300" />
            </button>
          </div>
        </div>

        {/* Settings Section */}
        <div className="space-y-2">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest pl-2">Settings</p>
          <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden shadow-sm flex flex-col divide-y divide-gray-100 dark:divide-white/5">
            <div className="w-full flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center">
                  <Fingerprint size={20} className="text-[#349DC5]" />
                </div>
                <p className="text-sm font-black text-[#00204a] dark:text-white">Enable/Disable Biometric Login</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={biometricEnabled} 
                  onChange={(e) => {
                    const val = e.target.checked;
                    setBiometricEnabled(val);
                    localStorage.setItem("biometricEnabled", String(val));
                    if(val) toast.success("Biometric login enabled on this device");
                    else toast.success("Biometric login disabled");
                  }} 
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#349DC5]"></div>
              </label>
            </div>
            
            {/* Dark Mode Toggle */}
            <div className="w-full flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center">
                  {isDarkMode ? <Moon size={20} className="text-[#349DC5]" /> : <Sun size={20} className="text-[#349DC5]" />}
                </div>
                <p className="text-sm font-black text-[#00204a] dark:text-white">Dark Mode</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={isDarkMode} 
                  onChange={(e) => toggleTheme(e.target.checked)} 
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#349DC5]"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Logout */}
        <button onClick={() => setShowLogoutModal(true)} className="w-full bg-white dark:bg-[#1e1e1e] rounded-2xl border border-red-50 dark:border-red-900/10 p-4 shadow-sm flex items-center justify-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors mt-4">
          <LogOut size={18} className="text-red-500" />
          <span className="text-sm font-black text-red-500">Logout</span>
        </button>

      </div>

      {/* Modals */}
      <AnimatePresence>
        {showTermsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowTermsModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white dark:bg-[#1e1e1e] w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center">
              <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
                <BookOpen size={28} className="text-[#349DC5]" />
              </div>
              <h3 className="text-lg font-black text-[#00204a] dark:text-white uppercase tracking-tight mb-2">Terms and Privacy Policy</h3>
              <p className="text-sm font-medium text-gray-400 mb-6">The Terms and Privacy Policy content is being finalized and will be available in the next release. Stay tuned!</p>
              <button onClick={() => setShowTermsModal(false)} className="w-full py-4 bg-[#349DC5] text-white rounded-2xl text-xs font-black uppercase tracking-wider">Understood</button>
            </motion.div>
          </div>
        )}

        {showUpdatesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowUpdatesModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white dark:bg-[#1e1e1e] w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-4">
                <ShieldAlert size={28} className="text-emerald-500" />
              </div>
              <h3 className="text-lg font-black text-[#00204a] dark:text-white uppercase tracking-tight mb-2">Up to date</h3>
              <p className="text-sm font-medium text-gray-400 mb-6">You are using the latest version of the Streams of Joy web application. Updates are applied automatically on refresh.</p>
              <button onClick={() => setShowUpdatesModal(false)} className="w-full py-4 bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider">Close</button>
            </motion.div>
          </div>
        )}

        {showLogoutModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowLogoutModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white dark:bg-[#1e1e1e] w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center">
              <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
                <LogOut size={28} className="text-red-500 ml-1" />
              </div>
              <h3 className="text-lg font-black text-[#00204a] dark:text-white uppercase tracking-tight mb-2">Confirm Logout</h3>
              <p className="text-sm font-medium text-gray-400 mb-6">Are you sure you want to log out of your account?</p>
              <div className="flex gap-3">
                <button onClick={() => setShowLogoutModal(false)} className="flex-1 py-4 rounded-2xl border border-gray-200 dark:border-white/10 text-xs font-black text-gray-400 uppercase tracking-wider">Cancel</button>
                <button onClick={handleLogout} className="flex-1 py-4 bg-red-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider">Yes, Logout</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
