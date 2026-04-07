/** * FormScreen (SuperAdminForm) — web migration * Full registration form for Super Admin: title, name, email/confirm, password/confirm, * profile photo upload, terms agreement, → navigates to /mail-otp on submit. */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Camera, ChevronLeft, Check } from "lucide-react";
import toast from "react-hot-toast";
// @ts-ignore
import AsyncStorage from "../../../utils/AsyncStorage";
const passwordRules = [
  { test: (v: string) => v.length >= 6, label: "Minimum 6 characters" },
  { test: (v: string) => /[A-Za-z]/.test(v), label: "At least one letter" },
  { test: (v: string) => /[0-9]/.test(v), label: "At least one number" },
  {
    test: (v: string) => /[!@#$%^&*(),.?":{}|<>]/.test(v),
    label: "At least one special character",
  },
];
interface FormState {
  title: string;
  surname: string;
  firstName: string;
  middleName: string;
  phone: string;
  email: string;
  confirmEmail: string;
  password: string;
  confirmPassword: string;
}
export default function SuperAdminFormScreen() {
  const navigate = useNavigate();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [form, setForm] = useState<FormState>({
    title: "",
    surname: "",
    firstName: "",
    middleName: "",
    phone: "",
    email: "",
    confirmEmail: "",
    password: "",
    confirmPassword: "",
  });
  const [agree, setAgree] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const handleChange = (field: keyof FormState, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));
  const pv = {
    length: form.password.length >= 6,
    letter: /[A-Za-z]/.test(form.password),
    number: /[0-9]/.test(form.password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(form.password),
  };
  const pickImage = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setProfileFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setProfileImage(ev.target?.result as string);
      reader.readAsDataURL(file);
    };
    input.click();
  };
  const handleContinue = async () => {
    if (
      !form.title ||
      !form.surname ||
      !form.firstName ||
      !form.email ||
      !form.password
    ) {
      toast("Please fill all required fields.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast("Please enter a valid email.");
      return;
    }
    if (form.email !== form.confirmEmail) {
      toast("Emails do not match.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast("Passwords do not match.");
      return;
    }
    if (!pv.length || !pv.letter || !pv.number || !pv.special) {
      toast("Password must be stronger.");
      return;
    }
    if (!agree) {
      toast("You must agree to the terms.");
      return;
    }
    try {
      await AsyncStorage.setItem(
        "user",
        JSON.stringify({
          title: form.title,
          firstName: form.firstName,
          middleName: form.middleName,
          surname: form.surname,
          phone: form.phone,
          email: form.email,
        }),
      );
      navigate("/verify-email");
    } catch {
      toast.error("Registration failed. Please try again.");
    }
  };
  return (
    <div className="min-h-screen bg-white dark:bg-[#0f1218] overflow-y-auto pb-24">
      <div className="px-4 pt-12 pb-2">
        <button onClick={() => navigate(-1)} className="text-[#9c9c9c]">
          <ChevronLeft size={20} />
        </button>
      </div>
      {/* Logo */}
      <div className="flex justify-center my-4">
        <img
          src="/icon_app.png"
          alt="Streams of Joy"
          className="w-20 h-20 object-contain"
        />
      </div>
      <div className="px-5">
        <h1 className="text-xl font-semibold text-[#111] dark:text-white mb-0.5">
          Welcome
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Please complete your registration.
        </p>
        {[
          { label: "Title", key: "title" },
          { label: "Surname", key: "surname" },
          { label: "Firstname", key: "firstName" },
          { label: "Middlename", key: "middleName" },
          { label: "Email", key: "email", type: "email" },
          { label: "Confirm Email", key: "confirmEmail", type: "email" },
          { label: "Phone", key: "phone", type: "tel" },
        ].map(({ label, key, type }) => (
          <div key={key} className="mb-3">
            <input
              type={type || "text"}
              placeholder={label}
              value={form[key as keyof FormState]}
              onChange={(e) =>
                handleChange(key as keyof FormState, e.target.value)
              }
              autoCapitalize="off"
              className="w-full h-11 border border-[#ddd] dark:border-[#444] rounded-lg px-3.5 text-sm text-[#111] dark:text-white bg-white dark:bg-[#1e1e1e] outline-none focus:border-[#349DC5] placeholder:text-[#9ca3af] transition-all"
            />
          </div>
        ))}
        {/* Password */}
        {[
          { label: "Password (Min. 6 characters)", key: "password" },
          { label: "Confirm Password", key: "confirmPassword" },
        ].map(({ label, key }) => (
          <div key={key} className="mb-3">
            <div className="flex items-center border border-[#ddd] dark:border-[#444] rounded-lg pr-3 bg-white dark:bg-[#1e1e1e] focus-within:border-[#349DC5] transition-colors">
              <input
                type={showPassword ? "text" : "password"}
                placeholder={label}
                value={form[key as keyof FormState]}
                onChange={(e) =>
                  handleChange(key as keyof FormState, e.target.value)
                }
                className="flex-1 h-11 px-3.5 text-sm text-[#111] dark:text-white bg-transparent outline-none placeholder:text-[#9ca3af]"
              />
              <button type="button" onClick={() => setShowPassword((s) => !s)}>
                {showPassword ? (
                  <EyeOff size={18} className="text-gray-400" />
                ) : (
                  <Eye size={18} className="text-gray-400" />
                )}
              </button>
            </div>
          </div>
        ))}
        {/* Password rules */}
        <div className="mb-4 space-y-1">
          {passwordRules.map((rule) => (
            <p
              key={rule.label}
              className={`text-xs flex items-center gap-1.5 ${rule.test(form.password) ? "text-green-600" : "text-red-500"}`}
            >
              • {rule.label}
            </p>
          ))}
        </div>
        {/* Profile photo */}
        <div className="flex flex-col items-center mb-5">
          <button type="button" onClick={pickImage} className="mb-2">
            {profileImage ? (
              <img
                src={profileImage}
                alt="avatar"
                className="w-20 h-20 rounded-full object-cover border-2 border-[#349DC5]"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-[#EEF6FB] border-2 border-dashed border-[#349DC5] flex items-center justify-center">
                <Camera size={36} color="#2CA6FF" />
              </div>
            )}
          </button>
          <p className="text-xs text-[#555] dark:text-gray-400">
            Upload Profile Picture
          </p>
        </div>
        {/* Agreement */}
        <div className="flex items-start gap-2.5 mb-5">
          <button
            type="button"
            onClick={() => setAgree((a) => !a)}
            className={`w-[18px] h-[18px] rounded border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${agree ? "bg-[#2CA6FF] border-[#2CA6FF]" : "border-[#D0D5DD] dark:border-[#444]"}`}
          >
            {agree && <Check size={11} color="white" strokeWidth={3} />}
          </button>
          <p className="text-[11.5px] text-[#344054] dark:text-gray-400 leading-4">
            I have read and agree to the
            <span className="text-[#2CA6FF] cursor-pointer">
              Privacy Policy &amp; Terms of Use
            </span>
          </p>
        </div>
        <motion.button
          onClick={handleContinue}
          disabled={!agree}
          whileTap={{ scale: 0.97 }}
          className="w-full h-12 rounded-xl font-semibold text-white text-base shadow-md disabled:opacity-50"
          style={{ backgroundColor: "#349DC5" }}
        >
          Continue
        </motion.button>
      </div>
    </div>
  );
}
