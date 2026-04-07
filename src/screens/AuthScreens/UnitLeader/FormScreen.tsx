import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  Camera,
  Check,
  User,
  Mail,
  ShieldCheck,
  MapPin,
  Globe,
  Book,
  Briefcase,
  Heart,
  Calendar,
} from "lucide-react";
import toast from "react-hot-toast";
// @ts-ignore
import AsyncStorage from "../../../utils/AsyncStorage";
const PRIMARY = "#349DC5";
const passRules = {
  minLength: (v: string) => v.length >= 8,
  hasUpperCase: (v: string) => /[A-Z]/.test(v),
  hasLowerCase: (v: string) => /[a-z]/.test(v),
  hasDigit: (v: string) => /\d/.test(v),
  hasSpecialChar: (v: string) => /[!@#$%^&*]/.test(v),
};
export default function UnitLeaderFormScreen() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    title: "",
    surname: "",
    firstName: "",
    middleName: "",
    unitId: "",
    gender: "",
    email: "",
    confirmEmail: "",
    password: "",
    confirmPassword: "",
    country: "",
    state: "",
    lga: "",
    address: "",
    nearestLandmark: "",
    dobDay: "",
    dobMonth: "",
    ageRange: "",
    highestLevelOfEducation: "",
    employmentStatus: "",
    fieldOfWork: "",
    maritalStatus: "",
  });
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [agree, setAgree] = useState(false);
  const handleChange = (k: string, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));
  const next = async () => {
    if (step === 1) {
      if (
        !form.title ||
        !form.surname ||
        !form.firstName ||
        !form.email ||
        !form.password
      )
        return toast.error("Fill all required fields");
      if (form.email !== form.confirmEmail)
        return toast.error("Emails do not match");
      if (form.password !== form.confirmPassword)
        return toast.error("Passwords do not match");
      if (!Object.values(passRules).every((fn) => fn(form.password)))
        return toast.error("Check security requirements");
      setStep(2);
      window.scrollTo(0, 0);
    } else {
      if (
        !form.country ||
        !form.state ||
        !form.lga ||
        !form.address ||
        !form.maritalStatus
      )
        return toast.error("Fill required fields");
      if (!agree) return toast.error("Accept terms first");
      await AsyncStorage.setItem(
        "user",
        JSON.stringify({ ...form, role: "leader" }),
      );
      navigate("/verify-email");
    }
  };
  const pickImage = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => setProfilePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    };
    input.click();
  };
  return (
    <div className="min-h-screen w-full bg-gray-50 dark:bg-black/95 flex flex-col justify-start items-center overflow-y-auto sm:py-10">
      <div className="w-full sm:max-w-md bg-white dark:bg-[#0f1218] min-h-screen sm:min-h-0 sm:rounded-2xl sm:shadow-2xl overflow-hidden relative pb-16 flex flex-col items-center">
        {/* Header */}
        <div className="w-full px-6 pt-10 sm:pt-6 pb-6 space-y-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => (step === 1 ? navigate(-1) : setStep(1))}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-none">
                Registration
              </h1>
              <p className="text-xs text-gray-500 font-medium">
                Step {step} of 2
              </p>
            </div>
          </div>
          <div className="w-full flex gap-2 h-1.5">
            <div
              className={`flex-1 rounded-full transition-all duration-500 ${step >= 1 ? "bg-[#349DC5]" : "bg-gray-200"}`}
            />
            <div
              className={`flex-1 rounded-full transition-all duration-500 ${step >= 2 ? "bg-[#349DC5]" : "bg-gray-200"}`}
            />
          </div>
        </div>
        <div className="w-full max-w-sm px-6 pb-24 space-y-4 overflow-y-auto overflow-x-hidden">
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="step1"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 20, opacity: 0 }}
                className="space-y-4"
              >
                <p className="text-sm font-bold text-gray-400 uppercase pl-1">
                  Personal Details
                </p>
                <div className="space-y-3">
                  <Input
                    icon={<User size={18} />}
                    placeholder="Title"
                    value={form.title}
                    onChange={(v) => handleChange("title", v)}
                  />
                  <Input
                    icon={<User size={18} />}
                    placeholder="Surname"
                    value={form.surname}
                    onChange={(v) => handleChange("surname", v)}
                  />
                  <Input
                    icon={<User size={18} />}
                    placeholder="First Name"
                    value={form.firstName}
                    onChange={(v) => handleChange("firstName", v)}
                  />
                  <Input
                    icon={<User size={18} />}
                    placeholder="Middle Name"
                    value={form.middleName}
                    onChange={(v) => handleChange("middleName", v)}
                  />
                </div>
                <p className="text-sm font-bold text-gray-400 uppercase pl-1">
                  Church Info
                </p>
                <Input
                  icon={<ShieldCheck size={18} />}
                  placeholder="Unit"
                  value={form.unitId}
                  onChange={(v) => handleChange("unitId", v)}
                />
                <Input
                  icon={<User size={18} />}
                  placeholder="Gender"
                  value={form.gender}
                  onChange={(v) => handleChange("gender", v)}
                />
                <p className="text-sm font-bold text-gray-400 uppercase pl-1">
                  Account & Security
                </p>
                <Input
                  icon={<Mail size={18} />}
                  placeholder="Email"
                  type="email"
                  value={form.email}
                  onChange={(v) => handleChange("email", v)}
                />
                <Input
                  icon={<Mail size={18} />}
                  placeholder="Confirm Email"
                  type="email"
                  value={form.confirmEmail}
                  onChange={(v) => handleChange("confirmEmail", v)}
                />
                <Input
                  icon={<ShieldCheck size={18} />}
                  placeholder="Password"
                  type="password"
                  value={form.password}
                  onChange={(v) => handleChange("password", v)}
                />
                {/* Rules */}
                <div className="p-4 bg-gray-50 dark:bg-[#1a1a2e] rounded-2xl space-y-2 border border-[#EEF2F5] dark:border-[#333]">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">
                    Security Checklist
                  </p>
                  {Object.entries(passRules).map(([k, fn]) => (
                    <div
                      key={k}
                      className={`flex items-center gap-2 text-[10px] font-bold uppercase transition-colors ${fn(form.password) ? "text-green-500" : "text-gray-400"}`}
                    >
                      {fn(form.password) ? (
                        <Check size={12} className="shrink-0" />
                      ) : (
                        <div className="w-3 h-3 border-2 border-current rounded-full shrink-0" />
                      )}
                      {k === "minLength" && "At least 8 characters"}
                      {k === "hasUpperCase" && "Uppercase letter"}
                      {k === "hasLowerCase" && "Lowercase letter"}
                      {k === "hasDigit" && "Numeric digit"}
                      {k === "hasSpecialChar" && "Special symbol"}
                    </div>
                  ))}
                </div>
                <Input
                  icon={<ShieldCheck size={18} />}
                  placeholder="Confirm Password"
                  type="password"
                  value={form.confirmPassword}
                  onChange={(v) => handleChange("confirmPassword", v)}
                />
              </motion.div>
            ) : (
              <motion.div
                key="step2"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="space-y-4"
              >
                <p className="text-sm font-bold text-gray-400 uppercase pl-1">
                  Location & Address
                </p>
                <div className="space-y-3">
                  <Input
                    icon={<Globe size={18} />}
                    placeholder="Country"
                    value={form.country}
                    onChange={(v) => handleChange("country", v)}
                  />
                  <Input
                    icon={<MapPin size={18} />}
                    placeholder="State"
                    value={form.state}
                    onChange={(v) => handleChange("state", v)}
                  />
                  <Input
                    icon={<MapPin size={18} />}
                    placeholder="LGA"
                    value={form.lga}
                    onChange={(v) => handleChange("lga", v)}
                  />
                  <textarea
                    placeholder="Residential Address"
                    value={form.address}
                    onChange={(e) => handleChange("address", e.target.value)}
                    rows={3}
                    className="w-full bg-gray-100 dark:bg-[#1a1a2e] border border-gray-200 dark:border-[#333] rounded-2xl px-4 py-3 text-sm focus:border-[#349DC5] outline-none transition-colors overflow-hidden"
                  />
                </div>
                <p className="text-sm font-bold text-gray-400 uppercase pl-1">
                  Background Details
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    icon={<Calendar size={18} />}
                    placeholder="DOB Day"
                    value={form.dobDay}
                    onChange={(v) => handleChange("dobDay", v)}
                  />
                  <Input
                    icon={<Calendar size={18} />}
                    placeholder="DOB Month"
                    value={form.dobMonth}
                    onChange={(v) => handleChange("dobMonth", v)}
                  />
                </div>
                <Input
                  icon={<User size={18} />}
                  placeholder="Age Range"
                  value={form.ageRange}
                  onChange={(v) => handleChange("ageRange", v)}
                />
                <Input
                  icon={<Book size={18} />}
                  placeholder="Education Level"
                  value={form.highestLevelOfEducation}
                  onChange={(v) => handleChange("highestLevelOfEducation", v)}
                />
                <Input
                  icon={<Briefcase size={18} />}
                  placeholder="Employment Status"
                  value={form.employmentStatus}
                  onChange={(v) => handleChange("employmentStatus", v)}
                />
                <Input
                  icon={<Briefcase size={18} />}
                  placeholder="Field of Work"
                  value={form.fieldOfWork}
                  onChange={(v) => handleChange("fieldOfWork", v)}
                />
                <Input
                  icon={<Heart size={18} />}
                  placeholder="Marital Status"
                  value={form.maritalStatus}
                  onChange={(v) => handleChange("maritalStatus", v)}
                />
                <div className="flex flex-col items-center gap-2 pt-4">
                  <div
                    onClick={pickImage}
                    className="w-20 h-20 rounded-full border-4 border-dashed border-[#349DC5] flex items-center justify-center bg-[#349DC5]05 overflow-hidden cursor-pointer"
                  >
                    {profilePreview ? (
                      <img
                        src={profilePreview}
                        alt="p"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Camera size={32} style={{ color: PRIMARY }} />
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">
                    Update Avatar
                  </p>
                </div>
                <div
                  className="flex items-start gap-3 pt-6 pb-2"
                  onClick={() => setAgree(!agree)}
                >
                  <div
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${agree ? "bg-[#349DC5] border-[#349DC5]" : "border-gray-200 dark:border-[#333]"}`}
                  >
                    {agree && <Check size={14} className="text-white" />}
                  </div>
                  <p className="text-xs text-gray-500 font-medium leading-tight">
                    I have read and agree to the
                    <span className="text-[#349DC5]">
                      Privacy Policy & Terms of Use
                    </span>
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={next}
            className="w-full h-14 rounded-2xl bg-[#349DC5] text-white font-bold shadow-lg shadow-blue-100 dark:shadow-none active:scale-95 transition-all mt-6 uppercase text-sm"
          >
            {step === 1 ? "Go to Step 2" : "Complete Registration"}
          </button>
        </div>
      </div>
    </div>
  );
}
function Input({
  icon,
  placeholder,
  value,
  onChange,
  type = "text",
}: {
  icon: any;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="relative flex items-center bg-gray-100 dark:bg-[#1a1a2e] border border-gray-200 dark:border-[#333] rounded-2xl h-12 px-4 shadow-sm focus-within:border-[#349DC5] transition-colors">
      <div className="text-gray-400 mr-3">{icon}</div>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-transparent text-sm font-medium outline-none text-gray-900 dark:text-white"
      />
    </div>
  );
}
