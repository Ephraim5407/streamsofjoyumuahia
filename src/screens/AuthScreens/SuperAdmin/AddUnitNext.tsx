import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, MapPin, Phone, Pencil, X, Plus } from "lucide-react";
interface Admin {
  id: string;
  name: string;
  phone: string;
}
export default function AddUnitNext() {
  const navigate = useNavigate();
  const [admins, setAdmins] = useState<Admin[]>([
    { id: "1", name: "Pastor John Philip Emeka", phone: "0803 324 2345" },
    { id: "2", name: "Pastor John Philip Emeka", phone: "0803 565 1455" },
  ]);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<string | null>(null);
  const handleRemove = (id: string) => {
    setAdmins((prev) => prev.filter((a) => a.id !== id));
    setRemoveTarget(null);
  };
  const handleAdd = () => {
    const newId = String(Date.now());
    setAdmins((prev) => [
      ...prev,
      { id: newId, name: "New Leader", phone: "080x xxx xxxx" },
    ]);
  };
  return (
    <div className="min-h-screen bg-white dark:bg-[#0f1218] relative">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-12 left-5 z-10 p-1"
      >
        <ArrowLeft size={26} color="#000" />
      </button>
      {/* Header */}
      <div className="pt-28 flex flex-col items-center mb-10 px-5">
        <h2 className="text-xl font-semibold text-center text-[#1a1a1a] dark:text-white mb-2">
          Set Up Unit Leaders
        </h2>
        <p className="text-sm text-center text-[#555] dark:text-gray-400 leading-5">
          You can add multiple unit leaders by clicking
          <span className="">&quot;Add Unit Leader&quot;</span>
        </p>
      </div>
      {/* Admin list */}
      <div
        className="px-5 pb-48 space-y-4 overflow-y-auto"
        style={{ maxHeight: "calc(100vh - 240px)" }}
      >
        <AnimatePresence>
          {admins.map((admin) => (
            <motion.div
              key={admin.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="mb-1"
            >
              <div className="flex items-center flex-wrap gap-1 mb-2">
                <MapPin size={14} color="#E53935" />
                <span className="text-sm font-medium text-[#333] dark:text-gray-200">
                  {admin.name}
                </span>
                <Phone size={12} color="#4CAF50" className="ml-1" />
                <span className="text-xs text-[#333] dark:text-gray-400">
                  {admin.phone}
                </span>
              </div>
              <div className="flex gap-2.5">
                <button
                  onClick={() => setEditTarget(admin.id)}
                  className="flex items-center gap-1.5 px-5 py-2 bg-white dark:bg-[#1e1e1e] rounded-lg shadow text-sm text-[#333] dark:text-white"
                >
                  <Pencil size={14} color="green" />
                  Edit
                </button>
                <button
                  onClick={() => setRemoveTarget(admin.id)}
                  className="flex items-center gap-1.5 px-5 py-2 bg-white dark:bg-[#1e1e1e] rounded-lg shadow text-sm text-[#333] dark:text-white"
                >
                  <X size={14} color="red" />
                  Remove
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {/* FAB — Add */}
      <button
        onClick={handleAdd}
        className="fixed bottom-24 right-7 w-[60px] h-[60px] rounded-full bg-white dark:bg-[#1e1e1e] shadow flex items-center justify-center"
      >
        <div
          className="w-[42px] h-[42px] rounded-full flex items-center justify-center"
          style={{ backgroundColor: "#349DC5" }}
        >
          <Plus size={26} color="white" />
        </div>
      </button>
      {/* Continue button */}
      <div className="fixed bottom-6 left-5 right-5">
        <motion.button
          onClick={() => navigate("/sa/generate-access-code")}
          whileTap={{ scale: 0.97 }}
          className="w-full py-4 rounded-xl text-white font-semibold text-base"
          style={{ backgroundColor: "#349DC5" }}
        >
          Continue
        </motion.button>
      </div>
      {/* Remove confirmation dialog */}
      <AnimatePresence>
        {removeTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-6 w-full max-w-sm shadow-md"
            >
              <h3 className="text-base font-bold text-[#111] dark:text-white mb-2">
                Remove
              </h3>
              <p className="text-sm text-[#555] dark:text-gray-400 mb-5">
                Are you sure you want to remove this admin?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setRemoveTarget(null)}
                  className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-semibold text-[#333] dark:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRemove(removeTarget)}
                  className="flex-1 py-3 rounded-xl bg-red-500 text-sm font-semibold text-white"
                >
                  Yes, Remove
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Edit stub dialog */}
      <AnimatePresence>
        {editTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-6 w-full max-w-sm shadow-md"
            >
              <h3 className="text-base font-bold text-[#111] dark:text-white mb-2">
                Edit Admin
              </h3>
              <p className="text-sm text-[#555] dark:text-gray-400 mb-5">
                Edit functionality coming soon.
              </p>
              <button
                onClick={() => setEditTarget(null)}
                className="w-full py-3 rounded-xl font-semibold text-white"
                style={{ backgroundColor: "#349DC5" }}
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
