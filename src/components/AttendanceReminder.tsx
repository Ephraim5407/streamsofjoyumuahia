import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Bell, ArrowRight } from "lucide-react";
import { getMainChurchAttendances, getYSAttendances } from "../api/attendance";
import AsyncStorage from "../utils/AsyncStorage";

export default function AttendanceReminder() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAttendance = async () => {
      try {
        const userRaw = await AsyncStorage.getItem("user");
        if (!userRaw) return;
        const user = JSON.parse(userRaw);
        
        // Only remind Unit Leaders
        if (user.activeRole !== "UnitLeader") return;

        const now = new Date();
        const day = now.getDay(); // 0: Sunday, 2: Tuesday, 3: Wednesday
        const hour = now.getHours();
        
        // Service days: Sunday (0), Tuesday (2), Wednesday (3)
        const isServiceDay = day === 0 || day === 2 || day === 3;
        if (!isServiceDay) return;

        // Only remind after certain times
        // Sunday: after 10am
        // Weekdays: after 6pm
        const isTime = (day === 0 && hour >= 10) || (day !== 0 && hour >= 18);
        if (!isTime) return;

        // Check if we already reminded today
        const todayStr = now.toISOString().split('T')[0];
        const lastReminder = await AsyncStorage.getItem("lastAttendanceReminder");
        if (lastReminder === todayStr) return;

        // Fetch today's records to see if anything is missing
        const mainRecords = await getMainChurchAttendances();
        const ysRecords = await getYSAttendances();
        
        const hasMainToday = mainRecords.some(r => r.date.startsWith(todayStr));
        const hasYSToday = ysRecords.some(r => r.date.startsWith(todayStr));

        if (!hasMainToday && !hasYSToday) {
          showReminder(todayStr);
        }
      } catch (e) {
        console.error("Reminder check failed", e);
      }
    };

    const showReminder = (dateStr: string) => {
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white dark:bg-[#1a1a1a] shadow-2xl rounded-[1.5rem] pointer-events-auto flex ring-1 ring-black/5 dark:ring-white/10 overflow-hidden`}>
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <div className="h-10 w-10 rounded-full bg-[#349DC5]/10 flex items-center justify-center text-[#349DC5]">
                  <Bell size={20} />
                </div>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-black text-[#00204a] dark:text-white uppercase tracking-tight">
                  Attendance Reminder
                </p>
                <p className="mt-1 text-[11px] font-bold text-gray-400 uppercase leading-tight">
                  You haven't recorded today's attendance yet. Please log it now.
                </p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-gray-100 dark:border-white/5">
            <button
              onClick={async () => {
                toast.dismiss(t.id);
                await AsyncStorage.setItem("lastAttendanceReminder", dateStr);
                navigate("/attendance/record");
              }}
              className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-black text-[#349DC5] hover:bg-[#349DC5]/5 focus:outline-none"
            >
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      ), { duration: 10000 });
    };

    // Delay initial check to let app settle
    const timer = setTimeout(checkAttendance, 5000);
    return () => clearTimeout(timer);
  }, [location.pathname, navigate]);

  return null;
}
