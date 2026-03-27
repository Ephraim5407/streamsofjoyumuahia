import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Camera,
  Phone,
  Mail,
  Lock,
  Bell,
  LogOut,
  Trash2,
  Edit2,
  Shield,
  X,
  ChevronRight,
  Save,
  Key,
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { BASE_URl } from "../../../api/users";
import AsyncStorage from "../../../utils/AsyncStorage";
export default function SuperAdminProfileScreen() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [saving, setSaving] = useState(false); // Form States const [editForm, setEditForm] = useState({ title:'', firstName:'', middleName:'', surname:'', phone:'', email:'' }); const [passForm, setPassForm] = useState({ current:'', new:'', confirm:'' }); const [notifs, setNotifs] = useState({ reports: true, announcements: true, finance: true, events: true }); const [avatarPreview, setAvatarPreview] = useState<string | null>(null); const [avatarFile, setAvatarFile] = useState<File | null>(null); const fetchData = useCallback(async () => { setLoading(true); try { const token = await AsyncStorage.getItem('token'); if (!token) { navigate('/login'); return; } const res = await axios.get(`${BASE_URl}/api/users/me`, { headers: { Authorization:`Bearer ${token}` } }); if (res.data?.ok) { const u = res.data.user; setProfile(u); setEditForm({ title: u.title ||'', firstName: u.firstName ||'', middleName: u.middleName ||'', surname: u.surname ||'', phone: u.phone ||'', email: u.email ||'' }); setAvatarPreview(u?.profile?.avatar || null); await AsyncStorage.setItem('user', JSON.stringify(u)); } } catch (e) { toast.error("Failed to load profile"); } finally { setLoading(false); } }, [navigate]); useEffect(() => { fetchData(); }, [fetchData]); const handlePickAvatar = () => { const input = document.createElement('input'); input.type ='file'; input.accept ='image/*'; input.onchange = (e: any) => { const file = e.target.files?.[0]; if (!file) return; setAvatarFile(file); const reader = new FileReader(); reader.onload = ev => setAvatarPreview(ev.target?.result as string); reader.readAsDataURL(file); }; input.click(); }; const saveProfile = async () => { setSaving(true); try { const token = await AsyncStorage.getItem('token'); const res = await axios.put(`${BASE_URl}/api/users/${profile._id}`, editForm, { headers: { Authorization:`Bearer ${token}` } }); if (res.data?.ok) { if (avatarFile) { const formData = new FormData(); formData.append('file', avatarFile); formData.append('userId', profile._id); await axios.post(`${BASE_URl}/api/upload/profile`, formData); } toast.success("Profile updated successfully!"); setActiveModal(null); fetchData(); } } catch (e: any) { toast.error(e.response?.data?.message ||"Failed to save profile"); } finally { setSaving(false); } }; const changePassword = async () => { if (passForm.new !== passForm.confirm) { toast.error("Passwords do not match"); return; } if (passForm.new.length < 6) { toast.error("New password too short"); return; } setSaving(true); try { const token = await AsyncStorage.getItem('token'); const res = await axios.post(`${BASE_URl}/api/users/change-password`, { currentPassword: passForm.current, newPassword: passForm.new }, { headers: { Authorization:`Bearer ${token}` } }); if (res.data?.ok) { toast.success("Password changed successfully!"); setPassForm({ current:'', new:'', confirm:'' }); setActiveModal(null); } } catch (e: any) { toast.error(e.response?.data?.message ||"Failed to change password"); } finally { setSaving(false); } }; const handleLogout = async () => { await AsyncStorage.removeItem('token'); await AsyncStorage.removeItem('user'); toast.success("Logged out successfully"); navigate('/login'); }; if (loading && !profile) { return ( <div className="flex items-center justify-center min-h-[60vh]"> <div className="w-10 h-10 border-4 border-[#349DC5] border-t-transparent rounded-full animate-spin" /> </div> ); } return ( <div className="pb-24 max-w-4xl mx-auto px-4 pt-6"> {/* Header */} <header className="flex items-center gap-4 mb-10"> <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-primary transition-all active:scale-95"> <ArrowLeft size={24} /> </button> <h1 className="text-xl font-bold text-[#00204a] dark:text-white uppercase">Account Setup</h1> </header> {/* Profile Card */} <section className="mb-10 text-center"> <div className="relative inline-block group"> <div className="w-28 h-28 rounded-[36px] border-4 border-[#349DC530] p-1 overflow-hidden shadow-md transition-transform group-hover:scale-[1.02]"> <img src={avatarPreview ||`https://ui-avatars.com/api/?background=349DC5&color=fff&size=128&name=${profile?.firstName}`} alt="Avatar" className="w-full h-full object-cover rounded-[28px]" /> </div> <button onClick={handlePickAvatar} className="absolute -bottom-1 -right-1 p-2.5 bg-white dark:bg-[#1e1e1e] rounded-[18px] text-[#349DC5] shadow border border-gray-100 dark:border-[#333] hover:bg-gray-50 transition-colors" > <Camera size={20} /> </button> </div> <div className="mt-4 px-6 flex flex-col items-center"> <h2 className="text-2xl font-bold text-[#00204a] dark:text-white leading-tight"> {[profile?.title, profile?.firstName, profile?.middleName, profile?.surname].filter(Boolean).join('')} </h2> <div className="mt-2 px-3 py-1 bg-blue-50/50 dark:bg-blue-900/10 rounded-full flex items-center gap-1.5"> <Shield size={12} className="text-[#349DC5]" /> <span className="text-[10px] font-bold text-[#349DC5] uppercase">{profile?.activeRole ||'Global Member'}</span> </div> </div> <div className="mt-6 grid grid-cols-2 gap-3 max-w-xs mx-auto"> <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-3 flex items-center gap-3"> <Phone size={14} className="text-gray-400" /> <span className="text-[11px] font-bold text-gray-500 truncate">{profile?.phone ||'No phone'}</span> </div> <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-3 flex items-center gap-3"> <Mail size={14} className="text-gray-400" /> <span className="text-[11px] font-bold text-gray-500 truncate">{profile?.email ||'No email'}</span> </div> </div> </section> <div className="h-px bg-gray-100 dark:bg-[#333] mb-8" /> {/* Menu Options */} <section className="space-y-3 pb-8"> {[ { icon: <Edit2 size={20} className="text-blue-500" />, label:'Edit Personal Info', onClick: () => setActiveModal('edit') }, { icon: <Key size={20} className="text-orange-500" />, label:'Password Security', onClick: () => setActiveModal('pass') }, { icon: <Bell size={20} className="text-purple-500" />, label:'Notification Preferences', onClick: () => setActiveModal('notif') }, { icon: <LogOut size={20} className="text-red-500" />, label:'Logout Session', onClick: () => setActiveModal('logout'), danger: true }, { icon: <Trash2 size={20} className="text-gray-400" />, label:'Delete Account', onClick: () => setActiveModal('delete'), danger: true }, ].map((item, idx) => ( <button key={idx} onClick={item.onClick} className="w-full h-16 flex items-center justify-between px-5 bg-white dark:bg-[#1e1e1e] rounded-3xl shadow-sm border border-gray-50 dark:border-[#333] hover:-translate-y-1 transition-all active:scale-[0.98]" > <div className="flex items-center gap-4"> <div className="p-2.5 rounded-2xl bg-gray-50 dark:bg-gray-800/50"> {item.icon} </div> <span className={cn("text-sm font-bold", item.danger ?"text-red-500" :"text-[#00204a] dark:text-gray-100")}> {item.label} </span> </div> <ChevronRight size={18} className="text-gray-300" /> </button> ))} </section> {/* Modals Implementation */} <AnimatePresence> {activeModal && ( <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center px-4"> <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveModal(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" /> <motion.div initial={{ y:"100%" }} animate={{ y: 0 }} exit={{ y:"100%" }} className="relative w-full max-w-md bg-white dark:bg-[#1e1e1e] rounded-t-[40px] sm:rounded-[40px] pb-12 overflow-hidden shadow-md" > <div className="p-8 pb-4 flex items-center justify-between border-b border-gray-50 dark:border-[#333] mb-6"> <h3 className="text-xl font-bold text-[#00204a] dark:text-white uppercase"> {activeModal ==='edit' &&'Edit Identity'} {activeModal ==='pass' &&'Security Update'} {activeModal ==='notif' &&'Alerts'} {activeModal ==='logout' &&'Ending Session'} {activeModal ==='delete' &&'Account Removal'} </h3> <button onClick={() => setActiveModal(null)} className="p-2 text-gray-400"><X /></button> </div> <div className="px-8 max-h-[70vh] overflow-y-auto custom-scrollbar"> {/* Edit Info Form */} {activeModal ==='edit' && ( <div className="space-y-4"> <Input label="Title" value={editForm.title} onChange={(v: string) => setEditForm(f => ({...f, title: v}))} /> <Input label="First Name" value={editForm.firstName} onChange={(v: string) => setEditForm(f => ({...f, firstName: v}))} /> <Input label="Middle Name" value={editForm.middleName} onChange={(v: string) => setEditForm(f => ({...f, middleName: v}))} /> <Input label="Surname" value={editForm.surname} onChange={(v: string) => setEditForm(f => ({...f, surname: v}))} /> <Input label="Phone" value={editForm.phone} onChange={(v: string) => setEditForm(f => ({...f, phone: v}))} /> <Input label="Email" value={editForm.email} onChange={(v: string) => setEditForm(f => ({...f, email: v}))} disabled /> <button onClick={saveProfile} disabled={saving} className="w-full h-14 bg-[#349DC5] text-white font-bold rounded-3xl shadow shadow-blue-100 mt-6 active:scale-95 transition-all flex items-center justify-center gap-2" > {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><span>SAVE UPDATE</span><Save size={18} /></>} </button> </div> )} {/* Password Form */} {activeModal ==='pass' && ( <div className="space-y-4"> <Input label="Current Password" type="password" value={passForm.current} onChange={(v: string) => setPassForm(f => ({...f, current: v}))} /> <Input label="New Password" type="password" value={passForm.new} onChange={(v: string) => setPassForm(f => ({...f, new: v}))} /> <Input label="Confirm New Password" type="password" value={passForm.confirm} onChange={(v: string) => setPassForm(f => ({...f, confirm: v}))} /> <button onClick={changePassword} disabled={saving} className="w-full h-14 bg-[#349DC5] text-white font-bold rounded-3xl shadow shadow-blue-100 mt-6 active:scale-95 transition-all flex items-center justify-center gap-2" > {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><span>REWRITE PASSWORD</span><Lock size={18} /></>} </button> </div> )} {/* Notifications Settings */} {activeModal ==='notif' && ( <div className="space-y-4 pb-4"> <Toggle label="Unit Reports & Updates" checked={notifs.reports} onChange={(v: boolean) => setNotifs(n => ({...n, reports: v}))} /> <Toggle label="Church Announcements" checked={notifs.announcements} onChange={(v: boolean) => setNotifs(n => ({...n, announcements: v}))} /> <Toggle label="Financial Overviews" checked={notifs.finance} onChange={(v: boolean) => setNotifs(n => ({...n, finance: v}))} /> <Toggle label="Event Reminders" checked={notifs.events} onChange={(v: boolean) => setNotifs(n => ({...n, events: v}))} /> <button onClick={() => { toast.success("Preferences saved!"); setActiveModal(null); }} className="w-full h-14 bg-[#349DC5] text-white font-bold rounded-3xl shadow shadow-blue-100 mt-6 hover:shadow-none transition-all" > SAVE ALERT SETTINGS </button> </div> )} {/* Logout Confirmation */} {activeModal ==='logout' && ( <div className="text-center py-6"> <div className="w-20 h-20 bg-red-50 dark:bg-red-900/10 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500"> <LogOut size={40} /> </div> <h4 className="text-xl font-bold text-[#00204a] dark:text-white mb-2 font-['Inter']">Are you sure?</h4> <p className="text-sm text-gray-500 mb-10 leading-relaxed px-10">You're about to end your session. You'll need credentials to log back in.</p> <div className="flex flex-col gap-3"> <button onClick={handleLogout} className="w-full h-14 bg-red-500 text-white font-bold rounded-3xl shadow shadow-red-100 dark:shadow-none active:scale-95 transition-all uppercase">Yes, Log Me Out</button> <button onClick={() => setActiveModal(null)} className="w-full h-14 bg-gray-50 dark:bg-gray-800 text-gray-400 font-bold rounded-3xl uppercase">Keep Session</button> </div> </div> )} {/* Delete Confirmation */} {activeModal ==='delete' && ( <div className="text-center py-6"> <div className="w-20 h-20 bg-red-50 dark:bg-red-900/10 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600"> <Trash2 size={40} /> </div> <h4 className="text-xl font-bold text-[#00204a] dark:text-white mb-2">Delete Identity?</h4> <p className="text-sm text-gray-500 mb-10 leading-relaxed px-10">This action is irreversible. All your personal data and reports will be permanently purged.</p> <div className="flex flex-col gap-3"> <button className="w-full h-14 bg-red-600 text-white font-bold rounded-3xl shadow shadow-red-100 dark:shadow-none uppercase">Yes, Purge My Data</button> <button onClick={() => setActiveModal(null)} className="w-full h-14 bg-gray-50 dark:bg-gray-800 text-gray-400 font-bold rounded-3xl uppercase">Cancel Removal</button> </div> </div> )} </div> </motion.div> </div> )} </AnimatePresence> </div> );
} // --- Local Helpers ---
function Input({
  label,
  value,
  onChange,
  type = "text",
  disabled = false,
}: any) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-gray-400 uppercase pl-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          "w-full h-14 bg-gray-50/50 dark:bg-[#1a1a2e]/50 border-2 border-transparent focus:border-[#349DC5] focus:bg-white dark:focus:bg-[#1a1a2e] outline-none rounded-3xl px-6 text-sm font-bold transition-all placeholder:text-gray-300",
          disabled && "opacity-50 cursor-not-allowed bg-gray-100/50",
        )}
      />
    </div>
  );
}
function Toggle({ label, checked, onChange }: any) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/20 rounded-2xl">
      <span className="text-sm font-bold text-[#00204a] dark:text-gray-200">
        {label}
      </span>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          "w-12 h-6 rounded-full relative transition-colors p-1",
          checked ? "bg-[#349DC5]" : "bg-gray-200 dark:bg-gray-700",
        )}
      >
        <div
          className={cn(
            "w-4 h-4 bg-white rounded-full transition-all shadow-sm",
            checked ? "ml-6" : "ml-0",
          )}
        />
      </button>
    </div>
  );
}
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join("");
}
