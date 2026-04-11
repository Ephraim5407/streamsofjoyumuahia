import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import axios from "axios";
import apiClient from "../../api/client";
import AsyncStorage from "../../utils/AsyncStorage";
import { BASE_URl } from "../../api/users";
import SuperAdminDashboard from "./SuperAdmin/DashboardScreen";
import UnitLeaderDashboard from "./UnitLeader/UnitLeaderDashboard";
import MemberDashboard from "./Member/MemberDashboard";
import MinistryDashboard from "./MinistryAdmin/MinistryDashboard";

export default function HomeScreen() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          setRole("Guest");
          return;
        }

        // Always fetch fresh from API so profile stays up-to-date
        try {
          const res = await apiClient.get(`/api/users/me`);
          if (res.data?.ok) {
            const user = res.data.user;
            // Merge any locally stored activeUnitId
            const storedUnitId = await AsyncStorage.getItem("activeUnitId");
            if (storedUnitId) user.activeUnitId = storedUnitId === "global" ? null : storedUnitId;
            await AsyncStorage.setItem("user", JSON.stringify(user));
            setRole(user.activeRole || "Member");
            return;
          }
        } catch {
          // Network failure — fall back to cached user
        }

        // Fallback: use cached user
        const raw = await AsyncStorage.getItem("user");
        if (raw) {
          const user = JSON.parse(raw);
          setRole(user.activeRole || "Member");
        } else {
          setRole("Guest");
        }
      } catch {
        setRole("Guest");
      } finally {
        setLoading(false);
      }
    };
    checkRole();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background dark:bg-dark-background">
        <div className="w-14 h-14 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[10px] font-bold text-primary uppercase tracking-[0.3em] animate-pulse">
          Establishing Connection...
        </p>
      </div>
    );
  }

  if (role === "SuperAdmin") return <SuperAdminDashboard />;
  if (role === "UnitLeader") return <UnitLeaderDashboard />;
  if (role === "MinistryAdmin") return <MinistryDashboard />;
  if (role === "Member" || role === "Worker") return <MemberDashboard />;
  if (role === "Guest") return <Navigate to="/welcome" replace />;

  // Any other role → default to MemberDashboard
  return <MemberDashboard />;
}
