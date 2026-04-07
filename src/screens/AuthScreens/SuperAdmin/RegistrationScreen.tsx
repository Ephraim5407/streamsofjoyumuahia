import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, Camera, Check, Eye, EyeOff, X } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { BASE_URl } from "../../../api/users";
// @ts-ignore
import AsyncStorage from "../../../utils/AsyncStorage";
const rules = {
  length: (v: string) => v.length >= 8,
  upper: (v: string) => /[A-Z]/.test(v),
  lower: (v: string) => /[a-z]/.test(v),
  number: (v: string) => /\d/.test(v),
  special: (v: string) => /[!@#$%^&*(),.?":{}|<>]/.test(v),
};
export default function SuperAdminRegistrationScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userId, email, prefills = {} } = (location.state as any) || {};
  const [form, setForm] = useState({
    title: prefills.title || "",
    surname: prefills.surname || "",
    firstName: prefills.firstName || "",
    middleName: prefills.middleName || "",
    password: "",
    confirmPassword: "",
  });
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [showPass, setShowPass] = useState(false);
  const passOk = Object.values(rules).every((fn) => fn(form.password));
  const handleChange = (field: string, val: string) =>
    setForm((f) => ({ ...f, [field]: val }));
  const pickImage = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    };
    input.click();
  };
  const submit = async () => {
    if (!form.title || !form.surname || !form.firstName) {
      toast.error("Please fill required fields.");
      return;
    }
    if (!passOk) {
      toast.error("Password does not meet requirements");
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (!agree) {
      toast.error("Please accept the terms");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${BASE_URl}/api/auth/complete-superadmin`, {
        userId,
        email,
        title: form.title,
        surname: form.surname,
        firstName: form.firstName,
        middleName: form.middleName,
        password: form.password,
      });
      if (res.data.ok) {
        await AsyncStorage.setItem("pendingUserId", res.data.userId);
        if (avatarFile) {
          const formData = new FormData();
          formData.append("userId", res.data.userId);
          formData.append("file", avatarFile);
          await axios.post(`${BASE_URl}/api/upload/profile`, formData);
        }
        toast.success("Registration complete!");
        navigate("/sa/fingerprint-setup");
      } else {
        toast.error(res.data.message || "Failed to complete registration");
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Error occurred");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen w-full bg-gray-50 dark:bg-black/95 flex flex-col justify-start items-center overflow-y-auto sm:py-10">
      <div className="w-full sm:max-w-md bg-white dark:bg-[#0f1218] min-h-screen sm:min-h-0 sm:rounded-2xl sm:shadow-2xl overflow-hidden relative pb-16 flex flex-col items-center">
        {/* Header */}
        <div className="w-full flex items-center justify-between px-6 pt-10 sm:pt-6 pb-4">
          <button onClick={() => navigate(-1)} className="p-1.5">
            <ChevronLeft size={24} className="text-[#349DC5]" />
          </button>
          <img src="/icon_app.png" alt="logo" className="h-10 w-auto" />
          <div className="w-9" />
        </div>
        <div className="w-full max-w-sm px-6 py-4 flex flex-col">
          <h1 className="text-2xl font-bold text-[#0E2433] dark:text-white mb-1">
            Welcome!
          </h1>
          <p className="text-sm text-gray-500 mb-8 font-medium">
            Please complete your registration.
          </p>
          {/* Avatar Pick */}
          <div className="flex flex-col items-center mb-8 relative">
            <div
              className="w-[88px] h-[88px] rounded-full border-[3px] border-[#0E5F87] overflow-hidden bg-[#0E5F8710] flex items-center justify-center cursor-pointer shadow-md"
              onClick={pickImage}
            >
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Camera size={32} className="text-[#349DC5]" />
              )}
            </div>
            <p className="text-[11px] font-bold text-gray-400 mt-2 uppercase">
              Add Profile Photo
            </p>
          </div>
          <div className="space-y-4">
            <input
              placeholder="Title"
              value={form.title}
              onChange={(e) => handleChange("title", e.target.value)}
              className="w-full h-12 rounded-xl border border-[#d4dce1] dark:border-[#333] px-4 text-sm bg-gray-50 dark:bg-[#1a1a2e] outline-none focus:border-[#349DC5] transition-colors"
            />
            <input
              placeholder="Surname"
              value={form.surname}
              onChange={(e) => handleChange("surname", e.target.value)}
              className="w-full h-12 rounded-xl border border-[#d4dce1] dark:border-[#333] px-4 text-sm bg-gray-50 dark:bg-[#1a1a2e] outline-none focus:border-[#349DC5] transition-colors"
            />
            <input
              placeholder="First Name"
              value={form.firstName}
              onChange={(e) => handleChange("firstName", e.target.value)}
              className="w-full h-12 rounded-xl border border-[#d4dce1] dark:border-[#333] px-4 text-sm bg-gray-50 dark:bg-[#1a1a2e] outline-none focus:border-[#349DC5] transition-colors"
            />
            <input
              placeholder="Middle Name"
              value={form.middleName}
              onChange={(e) => handleChange("middleName", e.target.value)}
              className="w-full h-12 rounded-xl border border-[#d4dce1] dark:border-[#333] px-4 text-sm bg-gray-50 dark:bg-[#1a1a2e] outline-none focus:border-[#349DC5] transition-colors"
            />
            <input
              placeholder="Email"
              value={email}
              disabled
              className="w-full h-12 rounded-xl border border-[#d4dce1] dark:border-[#333] px-4 text-sm bg-gray-100 dark:bg-[#111] text-gray-400 outline-none"
            />
            {/* Password Fields */}
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                placeholder="Password"
                value={form.password}
                onChange={(e) => handleChange("password", e.target.value)}
                className="w-full h-12 rounded-xl border border-[#d4dce1] dark:border-[#333] px-4 pr-12 text-sm bg-gray-50 dark:bg-[#1a1a2e] outline-none focus:border-[#349DC5]"
              />
              <button
                onClick={() => setShowPass(!showPass)}
                className="absolute right-4 top-3.5 text-gray-400"
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <input
              type={showPass ? "text" : "password"}
              placeholder="Confirm Password"
              value={form.confirmPassword}
              onChange={(e) => handleChange("confirmPassword", e.target.value)}
              className="w-full h-12 rounded-xl border border-[#d4dce1] dark:border-[#333] px-4 text-sm bg-gray-50 dark:bg-[#1a1a2e] outline-none focus:border-[#349DC5]"
            />
          </div>
          {/* Requirements Box */}
          <div className="mt-4 p-4 bg-gray-50 dark:bg-[#1a1a2e] rounded-2xl space-y-1.5 border border-gray-100 dark:border-[#333]">
            {Object.entries(rules).map(([k, fn]) => (
              <div
                key={k}
                className={`flex items-center gap-2 text-[11px] font-bold uppercase ${fn(form.password) ? "text-green-500" : "text-gray-400"}`}
              >
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${fn(form.password) ? "bg-green-500 text-white" : "bg-gray-200 text-gray-400"}`}
                >
                  {fn(form.password) ? <Check size={10} /> : <X size={10} />}
                </div>
                {k === "length" && "Min 8 characters"}
                {k === "upper" && "Uppercase letter"}
                {k === "lower" && "Lowercase letter"}
                {k === "number" && "Digit (0-9)"}
                {k === "special" && "Special symbol"}
              </div>
            ))}
          </div>
          <div
            className="flex items-start gap-3 mt-6 mb-8"
            onClick={() => setAgree(!agree)}
          >
            <div
              className={`w-5 h-5 rounded-md border flex items-center justify-center cursor-pointer transition-colors ${agree ? "bg-[#349DC5] border-[#349DC5]" : "border-[#d4dce1] dark:border-[#333]"}`}
            >
              {agree && <Check size={14} className="text-white" />}
            </div>
            <p className="text-xs text-gray-500 font-medium leading-relaxed">
              I have read and agree to the
              <span className="text-[#349DC5]">
                Privacy Policy & Terms of Use
              </span>
              .
            </p>
          </div>
          <button
            onClick={submit}
            disabled={loading || !agree}
            className="w-full h-14 rounded-2xl bg-[#349DC5] text-white font-bold shadow-lg shadow-blue-100 dark:shadow-none disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center"
          >
            {loading ? (
              <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              "CONTINUE"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
