import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import axios from "axios";

import LayoutWrapper from "./components/LayoutWrapper";
import InstallPWAPrompt from "./components/InstallPWAPrompt";
import GlobalErrorBoundary from "./components/GlobalErrorBoundary";

import LegalContentScreen from "./screens/LegalContentScreen";
import AdminFinanceSummary from "./screens/AdminFinance/AdminFinanceSummary";
import ExpensesAdmin from "./screens/AdminFinance/ExpensesAdmin";
import IncomeAdmin from "./screens/AdminFinance/IncomeAdmin";
import WelcomeScreen from "./screens/AuthScreens/Home/WelcomeScreen";
import MailOtpScreen from "./screens/AuthScreens/Home/MailOtpScreen";
import AwaitingApprovalScreen from "./screens/AuthScreens/AwaitingApprovalScreen";
import LoginScreen from "./screens/AuthScreens/Login/LoginScreen";
import ForgotPasswordScreen from "./screens/AuthScreens/Login/ForgotPasswordScreen";
import RegistrationScreen from "./screens/AuthScreens/Registration/RegistrationScreen";
import RegularRegistrationForm from "./screens/AuthScreens/Registration/RegularRegistrationForm";
import AddAnnouncementScreen from "./screens/AuthScreens/SuperAdmin/AddAnnouncement";
import AddEventScreen from "./screens/AuthScreens/SuperAdmin/AddEvent";
import AddNewSuperAdminScreen from "./screens/AuthScreens/SuperAdmin/AddNewSuperAdmin";
import AddUnitLeadersScreen from "./screens/AuthScreens/SuperAdmin/AddUnitLeaders";
import AddUnitNext from "./screens/AuthScreens/SuperAdmin/AddUnitNext";
import ApproveMinistryAdminsScreen from "./screens/AuthScreens/SuperAdmin/ApproveMinistryAdmins";
import ApproveSuperAdminsScreen from "./screens/AuthScreens/SuperAdmin/ApproveSuperAdmins";
import ApproveUnitLeadersScreen from "./screens/AuthScreens/SuperAdmin/ApproveUnitLeaders";
import EventsAnnouncementsScreen from "./screens/AuthScreens/SuperAdmin/EventAndAnnouncement";
import FingerprintSetupScreen from "./screens/AuthScreens/SuperAdmin/FingerprintSetup";
import SuperAdminFormScreen from "./screens/AuthScreens/SuperAdmin/FormScreen";
import ManageUnit from "./screens/AuthScreens/SuperAdmin/ManageUnit";
import SuperAdminProfileDetail from "./screens/AuthScreens/SuperAdmin/ProfileDetail";
import SuperAdminFinanceSummary from "./screens/AuthScreens/SuperAdmin/FinanceSummary";
import SuperAdminRegistrationScreen from "./screens/AuthScreens/SuperAdmin/RegistrationScreen";
import UnitLeaderFormScreen from "./screens/AuthScreens/UnitLeader/FormScreen";
import UnitLeaderManageUnit from "./screens/AuthScreens/UnitLeader/ManageUnit";
import SuperAdminDashboard from "./screens/main/SuperAdmin/DashboardScreen";
import ProfileScreen from "./screens/main/ProfileScreen";
import SuperAdminAddUnit from "./screens/main/SuperAdmin/AddUnitScreen";
import SuperAdminChurchSwitch from "./screens/main/SuperAdmin/ChurchSwitchScreen";
import UserRoles from "./screens/main/SuperAdmin/UserRoles";
import UnitLeaderDashboard from "./screens/main/UnitLeader/UnitLeaderDashboard";
import MemberList from "./screens/main/MemberList";
import SoulHarvested from "./screens/main/SoulHarvested";
import PeopleInvited from "./screens/main/PeopleInvited";
import Reports from "./screens/main/Reports";
import Achievements from "./screens/main/Achievements";
import AllUnitDashboards from "./screens/main/SuperAdmin/AllUnitDashboards";

import AttendanceHome from "./screens/main/AttendanceHome";
import FinanceSummary from "./screens/main/FinanceSummary";
import FinanceRecord from "./screens/main/FinanceRecord";
import Approvals from "./screens/main/Approvals";
import UnitMarriages from "./screens/main/UnitMarriages";
import UnitGraduates from "./screens/main/UnitGraduates";
import UnitTestimonies from "./screens/main/UnitTestimonies";
import MemberReports from "./screens/main/Member/MemberReports";
import MembersAssisted from "./screens/main/MembersAssisted";
import Notification from "./screens/main/Notification";
import NotificationDetail from "./screens/main/NotificationDetail";
import ComposeEmail from "./screens/main/ComposeEmail";
import HomeScreen from "./screens/main/HomeScreen";
import FinanceHistory from "./screens/main/FinanceHistory";
import RecoveredAddicts from "./screens/main/RecoveredAddicts";
import AssignUnitControl from "./screens/main/AssignUnitControl";
import MinistryDashboard from "./screens/main/MinistryAdmin/MinistryDashboard";
import StudentsList from "./screens/main/StudentsList";
import TakeAttendance from "./screens/main/TakeAttendance";
import JoinChurchScreen from "./screens/main/JoinChurchScreen";
import WorkPlansList from "./screens/main/WorkPlansList";
import WorkPlanDetail from "./screens/main/WorkPlanDetail";
import NewWorkPlan from "./screens/main/NewWorkPlan";
import AdminWorkPlansList from "./screens/main/AdminWorkPlansList";
import AdminViewWorkPlan from "./screens/main/AdminViewWorkPlan";
import AttendanceRecord from "./screens/main/AttendanceRecord";
import MoreScreen from "./screens/main/MoreScreen";
import SupportScreen from "./screens/main/SupportScreen";
import ExternalInvitations from "./screens/main/ExternalInvitations";
import FirstTimers from "./screens/main/FirstTimers";
import AssignedFirstTimers from "./screens/main/AssignedFirstTimers";
import SongsReleased from "./screens/main/SongsReleased";
import EmporiumSales from "./screens/main/EmporiumSales";
import Logistics from "./screens/main/Logistics";
import Equipment from "./screens/main/Equipment";
import Broadcast from "./screens/main/Broadcast";


// Smart root redirect — sends logged-in users to /home, others to /welcome
function RootRedirect() {
  const [dest, setDest] = useState<string | null>(null);
  useEffect(() => {
    const token = localStorage.getItem("token");
    setDest(token ? "/home" : "/welcome");
  }, []);
  if (!dest) return null;
  return <Navigate to={dest} replace />;
}

import ComingSoonScreen from "./screens/ComingSoon/ComingSoon";

const ComingSoon = ({ title }: { title: string }) => (
  <ComingSoonScreen title={title} />
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      refetchOnWindowFocus: true,
      retry: 2,
    },
  },
});

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    // Global Axios Interceptor for 401 Unauthorized
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401 || error.response?.status === 403) {
           // We clear localStorage and redirect to /login
           localStorage.removeItem("token");
           localStorage.removeItem("user");
           localStorage.removeItem("activeUnitId");
           if (window.location.pathname !== '/login' && window.location.pathname !== '/welcome') {
               window.location.href = '/login';
           }
        }
        return Promise.reject(error);
      }
    );

    // Simulate App Bootstrap Gate / Splash Screen sequence
    const initApp = async () => {
      // Intialize push notifications, socket connection here.
      await new Promise((resolve) => setTimeout(resolve, 3000));
      setAppIsReady(true);
    };
    initApp();

    return () => {
       axios.interceptors.response.eject(interceptor);
    };
  }, []);

  if (!appIsReady) {
    return (
      <div className="flex h-[100dvh] w-screen flex-col items-center justify-center bg-[#2CA6FF]">
        <div className="relative flex items-center justify-center">
          {/* Circular logo background */}
          <div className="absolute w-32 h-32 bg-white rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] animate-pulse" />
          <img
            src="/icon_app.png"
            alt="Streams of Joy"
            className="w-24 h-24 relative object-contain drop-shadow-sm"
          />
        </div>
        
        {/* Modern progress indicator */}
        <div className="mt-16 w-48 h-1.5 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm border border-white/10">
          <div className="h-full bg-white rounded-full animate-loading-bar shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
        </div>
        
        <p className="mt-6 text-white text-[14px] font-bold tracking-widest uppercase opacity-80">
          Streams of Joy
        </p>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <InstallPWAPrompt />
        <GlobalErrorBoundary>
          <LayoutWrapper>
            <Routes>
              <Route path="/login" element={<LoginScreen />} />
            <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
            <Route path="/register" element={<RegistrationScreen />} />
            <Route
              path="/register/complete"
              element={<RegularRegistrationForm />}
            />
            <Route path="/sa/dashboard" element={<SuperAdminDashboard />} />
            <Route path="/sa/profile" element={<ProfileScreen />} />
            <Route path="/sa/add-unit" element={<SuperAdminAddUnit />} />
            <Route
              path="/sa/church-switch"
              element={<SuperAdminChurchSwitch />}
            />

            <Route
              path="/sa/add-announcement"
              element={<AddAnnouncementScreen />}
            />
            <Route path="/sa/add-event" element={<AddEventScreen />} />
            <Route
              path="/sa/add-super-admin"
              element={<AddNewSuperAdminScreen />}
            />
            <Route
              path="/sa/add-unit-leaders"
              element={<AddUnitLeadersScreen />}
            />
            <Route path="/sa/unit-lead-list" element={<AddUnitNext />} />
            <Route
              path="/sa/approve-ministry-admins"
              element={<ApproveMinistryAdminsScreen />}
            />
            <Route
              path="/sa/approve-super-admins"
              element={<ApproveSuperAdminsScreen />}
            />
            <Route
              path="/sa/approve-unit-leaders"
              element={<ApproveUnitLeadersScreen />}
            />
            <Route
              path="/sa/events-announcements"
              element={<EventsAnnouncementsScreen />}
            />
            <Route
              path="/sa/fingerprint-setup"
              element={<FingerprintSetupScreen />}
            />
            <Route path="/sa/form" element={<SuperAdminFormScreen />} />
            <Route path="/sa/manage-unit" element={<ManageUnit />} />
            <Route
              path="/sa/profile-detail/:userId"
              element={<SuperAdminProfileDetail />}
            />
            <Route
              path="/sa/user-roles/:userId"
              element={<UserRoles />}
            />
            <Route
              path="/sa/finance-summary"
              element={<SuperAdminFinanceSummary />}
            />
            <Route
              path="/sa/registration"
              element={<SuperAdminRegistrationScreen />}
            />
            <Route path="/ul/form" element={<UnitLeaderFormScreen />} />
            <Route path="/ul/manage-unit" element={<UnitLeaderManageUnit />} />
            <Route path="/ul/dashboard" element={<UnitLeaderDashboard />} />
            <Route path="/ul/profile" element={<ProfileScreen />} />
            <Route path="/profile" element={<ProfileScreen />} />
            <Route path="/member-list" element={<MemberList />} />
            <Route path="/soul-harvested" element={<SoulHarvested />} />
            <Route path="/people-invited" element={<PeopleInvited />} />
            <Route path="/achievements" element={<Achievements />} />
            <Route path="/attendance-home" element={<AttendanceHome />} />
            <Route path="/finance/reports" element={<FinanceSummary />} />
            <Route path="/finance-summary" element={<FinanceSummary />} />
            <Route path="/finance/record" element={<FinanceRecord />} />
            <Route path="/approvals" element={<Approvals />} />
            <Route path="/reports/married" element={<UnitMarriages />} />
            <Route path="/reports/graduates" element={<UnitGraduates />} />
            <Route path="/reports/testimonies" element={<UnitTestimonies />} />
            <Route path="/member/reports" element={<MemberReports />} />
            <Route path="/members-assisted" element={<MembersAssisted />} />
            <Route path="/recovered-addicts" element={<RecoveredAddicts />} />
            <Route path="/notifications" element={<Notification />} />
            <Route
              path="/notifications/detail"
              element={<NotificationDetail />}
            />
            <Route path="/notifications/compose" element={<ComposeEmail />} />
            <Route path="/compose-email" element={<ComposeEmail />} />
            <Route path="/home" element={<HomeScreen />} />
            <Route
              path="/sales"
              element={<EmporiumSales />}
            />
            <Route
              path="/reports/songs"
              element={<SongsReleased />}
            />
            <Route
              path="/reports/logistics"
              element={<Logistics />}
            />
            <Route
              path="/reports/equipment"
              element={<Equipment />}
            />
            <Route
              path="/reports/broadcast"
              element={<Broadcast />}
            />
            <Route
              path="/reports/external"
              element={<ExternalInvitations />}
            />
            <Route
              path="/reports/first-timers"
              element={<FirstTimers />}
            />
            <Route
              path="/reports/assigned"
              element={<AssignedFirstTimers />}
            />
            {/* SA shortcuts */}
            <Route path="/sa/all-units" element={<ManageUnit />} />
            <Route path="/sa/members" element={<MemberList />} />
            <Route path="/sa/workers" element={<MemberList />} />
            <Route path="/sa/unit-dashboards" element={<AllUnitDashboards />} />
            <Route path="/sa/profile" element={<ProfileScreen />} />
            <Route path="/sa/new-members" element={<MemberList />} />
            <Route path="/sa/youth-and-singles" element={<MemberList />} />
            <Route path="/sa/events" element={<EventsAnnouncementsScreen />} />
            {/* UL shortcuts */}
            <Route path="/manage-unit" element={<UnitLeaderManageUnit />} />
            <Route path="/ul/manage-unit" element={<UnitLeaderManageUnit />} />
            <Route path="/ul/approve-members" element={<Approvals />} />
            <Route path="/ul/work-plans" element={<WorkPlansList />} />
            <Route path="/church-switch" element={<SuperAdminChurchSwitch />} />
            {/* Finance admin */}
            <Route
              path="/admin-finance/summary"
              element={<AdminFinanceSummary />}
            />
            <Route path="/admin-finance/expenses" element={<ExpensesAdmin />} />
            <Route path="/admin-finance/income" element={<IncomeAdmin />} />

            {/* Finance History */}
            <Route path="/finance/history" element={<FinanceHistory />} />
            <Route path="/finance/history/income" element={<FinanceHistory />} />
            <Route path="/finance/history/expense" element={<FinanceHistory />} />

            {/* Recovered Addicts */}
            <Route path="/recovered-addicts" element={<RecoveredAddicts />} />

            {/* Assign Unit Control */}
            <Route path="/assign-unit-control" element={<AssignUnitControl />} />
            <Route path="/ul/assign-unit-control" element={<AssignUnitControl />} />
            <Route path="/sa/assign-unit-control" element={<AssignUnitControl />} />

            {/* Work Plans */}
            <Route path="/work-plans" element={<WorkPlansList />} />
            <Route path="/work-plans/new" element={<NewWorkPlan />} />
            <Route path="/work-plans/:id/edit" element={<NewWorkPlan />} />
            <Route path="/work-plans/:id" element={<WorkPlanDetail />} />
            <Route path="/sa/work-plans" element={<AdminWorkPlansList />} />
            <Route path="/admin-work-plans" element={<AdminWorkPlansList />} />
            <Route path="/admin-work-plans/:id" element={<AdminViewWorkPlan />} />

            {/* Attendance Recording */}
            <Route path="/attendance/record" element={<AttendanceRecord />} />
            <Route path="/attendance/records" element={<AttendanceRecord />} />
            <Route path="/attendance/main-church" element={<AttendanceRecord />} />
            <Route path="/attendance/ys" element={<AttendanceRecord />} />
            <Route path="/attendance/students" element={<StudentsList />} />
            <Route path="/attendance/take" element={<TakeAttendance />} />

            {/* Ministry & Join */}
            <Route path="/ministry/dashboard" element={<MinistryDashboard />} />
            <Route path="/ministry-dashboard" element={<MinistryDashboard />} />
            <Route path="/join-church" element={<JoinChurchScreen />} />

            <Route path="/reports" element={<Reports />} />
            <Route path="/support" element={<SupportScreen />} />
            <Route path="/more" element={<MoreScreen />} />
            <Route path="/legal" element={<LegalContentScreen />} />
            <Route path="/welcome" element={<WelcomeScreen />} />
            <Route path="/verify-email" element={<MailOtpScreen />} />
            <Route
              path="/awaiting-approval"
              element={<AwaitingApprovalScreen />}
            />
            <Route path="/" element={<RootRedirect />} />
          </Routes>
          </LayoutWrapper>
        </GlobalErrorBoundary>
      </BrowserRouter>
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}
