/** * RegularRegistrationForm — 2-Step Web Migration * Step 1: Personal Info, Role, Church/Ministry, Unit, Gender, Phone, Password * Step 2: Location (Country→State→LGA), DOB, Occupation, Work Fields, Marital Status, Profile Photo */
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import axios from "axios";
import {
  ChevronLeft,
  Eye,
  EyeOff,
  Check,
  X,
  ChevronDown,
  Plus,
  Camera,
} from "lucide-react";
import {
  checkPhone,
  completeRegularRegistration,
} from "../../../api/registration";
import {
  fetchCountries,
  fetchLocationSuggestions,
} from "../../../api/locations";
import { BASE_URl } from "../../../api/users";
// @ts-ignore
import AsyncStorage from "../../../utils/AsyncStorage"; // ─── Config ──────────────────────────────────────────────────────────────────
const PRIMARY = "#2CA6FF";
const passwordRules = [
  { test: (v: string) => v.length >= 6, label: "Minimum 6 characters" },
  {
    test: (v: string) => /[A-Za-z]/.test(v),
    label: "At least one letter (A-Z or a-z)",
  },
  { test: (v: string) => /\d/.test(v), label: "At least one number (0-9)" },
  {
    test: (v: string) => /[^A-Za-z0-9]/.test(v),
    label: "At least one special character (@#$%^&+=/?!)",
  },
];
const TITLE_OPTIONS = [
  "Mr",
  "Mrs",
  "Miss",
  "Ms",
  "Dr",
  "Pastor",
  "Bro",
  "Sis",
  "Prof",
  "Engr",
  "Deacon",
  "Deaconess",
];
const GENDER_OPTIONS = ["Male", "Female"];
const ROLE_OPTIONS = [
  { label: "Member", value: "Member" },
  { label: "Unit Leader", value: "UnitLeader" },
];
const EMPLOYMENT_OPTIONS = [
  "Employed",
  "Self-employed",
  "Student",
  "Unemployed",
  "Retired",
];
const MARITAL_OPTIONS = ["Single", "Married", "Divorced", "Widowed"];
const WORK_FIELD_OPTIONS = [
  "Health/Medical",
  "Real Estate",
  "Education",
  "Finance",
  "Technology",
  "Hospitality",
  "Retail",
  "Logistics",
  "Construction",
  "Manufacturing",
  "Agriculture",
]; // ─── Sub-components ──────────────────────────────────────────────────────────
function LabelInput({
  label,
  sublabel,
  value,
  onChange,
  placeholder,
  type = "text",
  onBlur,
}: any) {
  return (
    <div className="mb-4">
      <label className="block text-[13px] font-semibold text-[#344054] dark:text-gray-300 mb-1.5">
        {label}
      </label>
      {sublabel && (
        <p className="text-[11.5px] text-[#667085] dark:text-gray-400 mb-2 leading-4">
          {sublabel}
        </p>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className="w-full h-12 border border-[#D0D5DD] dark:border-[#333] rounded-xl px-4 text-sm text-[#101828] dark:text-white bg-white dark:bg-[#1a1c23] outline-none focus:border-[#2CA6FF] focus:ring-4 focus:ring-[#2CA6FF]/10 transition-all placeholder:text-[#98A2B3] shadow-sm hover:border-[#2CA6FF]/50"
      />
    </div>
  );
}
function Select({
  label,
  sublabel,
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: any) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  const selected = options?.find((o: any) => (o.value ?? o) === value);
  return (
    <div className="mb-4 relative" ref={ref}>
      <label className="block text-[13px] font-semibold text-[#344054] dark:text-gray-300 mb-1.5">
        {label}
      </label>
      {sublabel && (
        <p className="text-[11.5px] text-[#667085] dark:text-gray-400 mb-2 leading-4">
          {sublabel}
        </p>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`w-full h-12 border border-[#D0D5DD] dark:border-[#333] rounded-xl px-4 text-sm text-left flex items-center justify-between bg-white dark:bg-[#1a1c23] ${disabled ? "opacity-50 grayscale cursor-not-allowed" : "focus:border-[#2CA6FF] focus:ring-4 focus:ring-[#2CA6FF]/10"} transition-all shadow-sm hover:border-[#2CA6FF]/50`}
      >
        <span
          className={
            selected ? "text-[#101828] dark:text-white font-medium" : "text-[#98A2B3]"
          }
        >
          {selected ? (selected.label ?? selected) : placeholder}
        </span>
        <ChevronDown 
          size={18} 
          className={`text-gray-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} 
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-[#1c1f26] border border-[#D0D5DD] dark:border-[#333] rounded-xl shadow-xl z-[60] max-h-60 overflow-y-auto overflow-x-hidden backdrop-blur-xl"
          >
            <div className="p-1.5">
              {options?.map((opt: any) => {
                const val = opt.value ?? opt;
                const lbl = opt.label ?? opt;
                const isSelected = val === value;
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      onChange(val);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 text-sm text-left rounded-lg transition-all ${
                      isSelected 
                        ? "bg-[#2CA6FF]/10 dark:bg-[#2CA6FF]/20 font-bold text-[#2CA6FF]" 
                        : "text-[#344054] dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    }`}
                  >
                    <span className="flex-1">{lbl}</span>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-[#2CA6FF] flex items-center justify-center">
                        <Check size={12} className="text-white" strokeWidth={4} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
function MultiSelect({ label, value, onChange, options }: any) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  const toggle = (opt: string) =>
    onChange(
      (value as string[]).includes(opt)
        ? (value as string[]).filter((v: string) => v !== opt)
        : [...(value as string[]), opt],
    );
  return (
    <div className="mb-4 relative" ref={ref}>
      <label className="block text-[13px] font-semibold text-[#344054] dark:text-gray-300 mb-1.5">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full min-h-12 border border-[#D0D5DD] dark:border-[#333] rounded-xl px-4 py-2.5 text-sm text-left flex flex-wrap items-center gap-2 bg-white dark:bg-[#1a1c23] transition-all shadow-sm hover:border-[#2CA6FF]/50"
      >
        {(value as string[]).length === 0 ? (
          <span className="text-[#98A2B3]">Select fields</span>
        ) : (
          (value as string[]).map((v: string) => (
            <span
              key={v}
              className="inline-flex items-center gap-1.5 bg-[#EEF6FB] dark:bg-[#2CA6FF]/10 text-[#2CA6FF] text-[11px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider shadow-sm"
            >
              {v}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(v);
                }}
                className="hover:bg-[#2CA6FF] hover:text-white rounded-full p-0.5 transition-colors"
              >
                <X size={10} strokeWidth={4} />
              </button>
            </span>
          ))
        )}
        <ChevronDown size={18} className={`text-gray-400 ml-auto shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-[#1c1f26] border border-[#D0D5DD] dark:border-[#333] rounded-2xl shadow-2xl z-[60] max-h-60 overflow-y-auto backdrop-blur-xl"
          >
            <div className="p-1.5">
              {options.map((opt: string) => {
                const isSelected = (value as string[]).includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggle(opt)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm text-left rounded-lg transition-all ${
                      isSelected 
                        ? "bg-[#2CA6FF]/10 dark:bg-[#2CA6FF]/20 font-bold text-[#2CA6FF]" 
                        : "text-[#344054] dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${isSelected ? 'bg-[#2CA6FF] border-[#2CA6FF]' : 'border-gray-300 dark:border-gray-600'}`}>
                      {isSelected && <Check size={10} color="white" strokeWidth={5} />}
                    </div>
                    {opt}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
function PasswordInput({ label, value, onChange, placeholder }: any) {
  const [show, setShow] = useState(false);
  return (
    <div className="mb-4">
      <label className="block text-[13px] font-semibold text-[#344054] dark:text-gray-300 mb-1.5">
        {label}
      </label>
      <div className="flex items-center border border-[#D0D5DD] dark:border-[#333] rounded-xl bg-white dark:bg-[#1a1c23] pr-3 focus-within:border-[#2CA6FF] focus-within:ring-4 focus-within:ring-[#2CA6FF]/10 transition-all shadow-sm group hover:border-[#2CA6FF]/50">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 h-12 px-4 text-sm text-[#101828] dark:text-white bg-transparent outline-none placeholder:text-[#98A2B3]"
        />
        <button 
          type="button" 
          onClick={() => setShow((s) => !s)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          {show ? (
            <EyeOff size={20} className="text-gray-400 group-focus-within:text-[#2CA6FF]" />
          ) : (
            <Eye size={20} className="text-gray-400 group-focus-within:text-[#2CA6FF]" />
          )}
        </button>
      </div>
    </div>
  );
}
function PasswordRules({ password }: { password: string }) {
  return (
    <div className="mb-3 space-y-1">
      {passwordRules.map((rule) => {
        const ok = rule.test(password);
        return (
          <div
            key={rule.label}
            className={`flex items-center gap-1.5 text-[11px] ${ok ? "text-[#027A48]" : "text-[#667085]"}`}
          >
            <Check
              size={11}
              className={ok ? "text-[#027A48]" : "text-transparent"}
            />
            {rule.label}
          </div>
        );
      })}
    </div>
  );
} // ─── Main Component ───────────────────────────────────────────────────────────
export default function RegularRegistrationForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userId, prefills, email: initialEmail } = (location.state as any) || {};
  const [step, setStep] = useState<1 | 2>(1);
  /* Step 1 */ const [title, setTitle] = useState("");
  const [surname, setSurname] = useState(prefills?.surname || "");
  const [firstName, setFirstName] = useState(prefills?.firstName || "");
  const [middleName, setMiddleName] = useState(prefills?.middleName || "");
  const [workerSelection, setWorkerSelection] = useState("");
  const [activeRole, setActiveRole] = useState<"UnitLeader" | "Member">(
    "Member",
  );
  const [unitLead, setUnitLead] = useState("");
  const [unitMember, setUnitMember] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneStatus, setPhoneStatus] = useState<
    "unknown" | "checking" | "free" | "exists"
  >("unknown");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [churchId, setChurchId] = useState("");
  const [churches, setChurches] = useState<
    Array<{
      _id: string;
      name: string;
      ministries?: Array<{ _id: string; name: string }>;
    }>
  >([]);
  const [unitOptions, setUnitOptions] = useState<
    { label: string; value: string }[]
  >([]);
  /* Step 2 */ const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [lga, setLga] = useState("");
  const [countriesOptions, setCountriesOptions] = useState<
    Array<{ label: string; value: string }>
  >([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [stateOptions, setStateOptions] = useState<
    Array<{ label: string; value: string }>
  >([]);
  const [lgaOptions, setLgaOptions] = useState<
    Array<{ label: string; value: string }>
  >([]);
  const [loadingStates, setLoadingStates] = useState({
    state: false,
    lga: false,
  });
  const [landmark, setLandmark] = useState("");
  const [dobDay, setDobDay] = useState("");
  const [dobMonth, setDobMonth] = useState("");
  const [dobYear, setDobYear] = useState("");
  const [occupation, setOccupation] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState("");
  const [workFields, setWorkFields] = useState<string[]>([]);
  const [specificFields, setSpecificFields] = useState("");
  const [currSpecificInput, setCurrSpecificInput] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [agree, setAgree] = useState(false);
  const [localAvatarFile, setLocalAvatarFile] = useState<File | null>(null);
  const [localAvatarPreview, setLocalAvatarPreview] = useState<string | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const allRulesOk = passwordRules.every((r) => r.test(password));
  const canNext = Boolean(
    title &&
    surname &&
    firstName &&
    middleName &&
    churchId &&
    workerSelection &&
    activeRole &&
    (activeRole === "UnitLeader" ? unitLead && unitMember : unitMember) &&
    gender &&
    phoneStatus === "free" &&
    allRulesOk &&
    password === confirm,
  );
  /* Build worker (ministry) options from selected church */ const workerOptions =
    useMemo(() => {
      if (!churchId) return [];
      const ch = churches.find((c) => c._id === churchId);
      return (ch?.ministries || [])
        .map((m) => ({ label: m.name, value: m.name }))
        .sort((a, b) => a.label.localeCompare(b.label));
    }, [churchId, churches]);
  /* DOB options */ const days = useMemo(
    () =>
      Array.from({ length: 31 }, (_, i) => {
        const v = String(i + 1).padStart(2, "0");
        return { label: v, value: v };
      }),
    [],
  );
  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const v = String(i + 1).padStart(2, "0");
        return { label: v, value: v };
      }),
    [],
  );
  const years = useMemo(() => {
    const arr: { label: string; value: string }[] = [];
    for (let y = new Date().getFullYear(); y >= 1930; y--)
      arr.push({ label: String(y), value: String(y) });
    return arr;
  }, []);
  const churchOptions = useMemo(
    () => churches.map((c) => ({ label: c.name, value: c._id })),
    [churches],
  );
  /* Fetch churches */ useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get(`${BASE_URl}/api/churches`);
        const list = res.data?.churches || res.data?.data || [];
        if (!cancelled && Array.isArray(list)) {
          setChurches(list);
          const preferred = prefills?.church?._id || prefills?.church;
          if (preferred && list.some((c: any) => c._id === preferred))
            setChurchId(String(preferred));
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  /* Fetch units when church/ministry changes */ useEffect(() => {
    if (!churchId) return;
    (async () => {
      try {
        const params = workerSelection
          ? `?ministryName=${encodeURIComponent(workerSelection)}`
          : "";
        const res = await axios.get(
          `${BASE_URl}/api/units/by-church/${churchId}${params}`,
        );
        if (res.data?.ok && Array.isArray(res.data.units))
          setUnitOptions(
            res.data.units.map((u: any) => ({
              label: u.name,
              value: u._id || u.name,
            })),
          );
      } catch {}
    })();
  }, [churchId, workerSelection]);
  /* Fetch countries (Nigeria pinned first) */ useEffect(() => {
    (async () => {
      setLoadingCountries(true);
      try {
        const countries = await fetchCountries();
        const mapped = countries.map((c) => ({
          label: c.label,
          value: c.value,
        }));
        const niIdx = mapped.findIndex((c) =>
          c.label.toLowerCase().includes("nigeria"),
        );
        if (niIdx > 0) {
          const [ni] = mapped.splice(niIdx, 1);
          mapped.unshift(ni);
        }
        setCountriesOptions(mapped);
      } catch {
        toast.error("Failed to load countries");
      } finally {
        setLoadingCountries(false);
      }
    })();
  }, []);
  /* Cascade: country → states */ useEffect(() => {
    if (!country) {
      setStateOptions([]);
      setState("");
      setLga("");
      return;
    }
    setState("");
    setLga("");
    (async () => {
      setLoadingStates((p) => ({ ...p, state: true }));
      try {
        setStateOptions(await fetchLocationSuggestions("state", "", country));
      } catch {
        setStateOptions([]);
      } finally {
        setLoadingStates((p) => ({ ...p, state: false }));
      }
    })();
  }, [country]);
  /* Cascade: state → LGAs */ useEffect(() => {
    if (!country || !state) {
      setLgaOptions([]);
      setLga("");
      return;
    }
    setLga("");
    (async () => {
      setLoadingStates((p) => ({ ...p, lga: true }));
      try {
        setLgaOptions(
          await fetchLocationSuggestions("lga", "", country, state),
        );
      } catch {
        setLgaOptions([]);
      } finally {
        setLoadingStates((p) => ({ ...p, lga: false }));
      }
    })();
  }, [country, state]);
  const handleCheckPhone = async () => {
    if (!phone) {
      setPhoneStatus("unknown");
      return;
    }
    setPhoneStatus("checking");
    try {
      const res = await checkPhone(phone);
      setPhoneStatus(res.exists ? "exists" : "free");
    } catch {
      setPhoneStatus("unknown");
    }
  };
  const handlePickAvatar = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setLocalAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (ev) =>
        setLocalAvatarPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    };
    input.click();
  };
  const addSpecificField = () => {
    const curr = currSpecificInput.trim();
    if (!curr) return;
    const list = specificFields
      ? specificFields
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    if (!list.includes(curr)) setSpecificFields([...list, curr].join(","));
    setCurrSpecificInput("");
  };
  const removeSpecificField = (idx: number) => {
    const list = specificFields.split(",").filter(Boolean);
    list.splice(idx, 1);
    setSpecificFields(list.join(","));
  };
  const submit = async () => {
    setError("");
    if (submitting) return;
    if (
      !country ||
      !state ||
      !lga ||
      !landmark ||
      !dobDay ||
      !dobMonth ||
      !dobYear ||
      !occupation ||
      !employmentStatus ||
      workFields.length === 0 ||
      !specificFields ||
      !maritalStatus ||
      !localAvatarFile
    ) {
      setError("Please fill all required fields and add a profile photo.");
      return;
    }
    if (!agree) {
      setError("Please agree to the terms and conditions.");
      return;
    }
    setSubmitting(true);
    try {
      const dobIso = `${dobYear}-${dobMonth}-${dobDay}`;
      const payload = {
        userId,
        firstName,
        surname,
        middleName,
        activeRole,
        password,
        phone,
        unitsLed: activeRole === "UnitLeader" && unitLead ? [unitLead] : [],
        unitsMember: unitMember ? [unitMember] : [],
        gender,
        dob: dobIso,
        occupation,
        employmentStatus,
        maritalStatus,
        churchId: churchId || undefined,
        specificFields,
        workFields,
      };
      const res = await completeRegularRegistration(payload);
      if (res.ok) {
        /* Upload avatar */ if (localAvatarFile) {
          try {
            const formData = new FormData();
            formData.append("file", localAvatarFile);
            formData.append("userId", userId);
            const uploadRes = await fetch(`${BASE_URl}/api/upload/profile`, {
              method: "POST",
              body: formData,
            });
            const uploadData = await uploadRes.json();
            if (uploadData?.ok && uploadData.url) {
              const raw = await AsyncStorage.getItem("user");
              if (raw) {
                const cached = JSON.parse(raw);
                cached.profile = cached.profile || {};
                cached.profile.avatar = uploadData.url;
                await AsyncStorage.setItem("user", JSON.stringify(cached));
              }
            }
          } catch {}
        }
        if (res.approved === true) navigate("/login", { replace: true });
        else
          navigate("/awaiting-approval", { state: { userId }, replace: true });
      } else {
        setError(res.message || "Registration failed");
      }
    } catch (e: any) {
      setError(
        e?.response?.data?.message || e.message || "Registration failed",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50 dark:bg-[#080a0c]">
        <div className="text-center p-8 bg-white dark:bg-[#0f1218] rounded-3xl shadow-xl max-w-sm w-full border border-gray-100 dark:border-gray-800">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="text-[#2CA6FF]" size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Registration Expired</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">We couldn't find your registration session. Please start again from the welcome screen.</p>
          <button
            onClick={() => navigate("/welcome", { replace: true })}
            className="w-full py-3 bg-[#2CA6FF] text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all active:scale-[0.98]"
          >
            Start Over
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full bg-gray-50 dark:bg-[#080a0c] flex flex-col items-center justify-start overflow-y-auto">
      <div className="w-full sm:max-w-md bg-white dark:bg-[#0f1218] min-h-[100dvh] sm:min-h-0 sm:my-10 sm:rounded-[2.5rem] sm:shadow-[0_20px_60px_rgba(0,0,0,0.12)] overflow-hidden relative flex flex-col border border-gray-100 dark:border-gray-800">
        
        {/* Header - Reduced height and modernized */}
        <div className="sticky top-0 z-50 bg-[#2CA6FF] px-6 py-4 flex items-center gap-4 shadow-[0_4px_20px_rgba(44,166,255,0.2)]">
          <button
            onClick={() => (step === 1 ? navigate(-1) : setStep(1))}
            className="p-2 hover:bg-white/10 rounded-full transition-colors active:scale-90"
          >
            <ChevronLeft size={24} color="white" strokeWidth={3} />
          </button>
          <div className="flex-1">
            <h1 className="text-[17px] font-bold text-white leading-tight">
              {step === 1 ? "Personal Details" : "Final Steps"}
            </h1>
            <p className="text-[11px] text-white/80 font-medium tracking-tight">
              Step {step} of 2
            </p>
          </div>
        </div>

        {/* Progress bar - Clean and subtle */}
        <div className="flex gap-1.5 px-6 pt-6 mb-2">
          {[1, 2].map((s) => (
            <div
              key={s}
              className="flex-1 h-1.5 rounded-full transition-all duration-500 ease-out"
              style={{ 
                backgroundColor: step >= s ? PRIMARY : "#F2F4F7",
                opacity: step >= s ? 1 : 0.4
              }}
            />
          ))}
        </div>

        <div className="px-6 pb-24 flex-1">
          {" "}
          {/* ═══════════════ STEP 1 ═══════════════ */}{" "}
          {step === 1 && (
            <div>
              {" "}
              <Select
                label="Title"
                value={title}
                onChange={setTitle}
                options={TITLE_OPTIONS}
                placeholder="Select title"
              />{" "}
              <LabelInput
                label="Surname"
                value={surname}
                onChange={setSurname}
                placeholder="Surname"
              />{" "}
              <LabelInput
                label="First Name"
                value={firstName}
                onChange={setFirstName}
                placeholder="First Name"
              />{" "}
              <LabelInput
                label="Middle Name"
                value={middleName}
                onChange={setMiddleName}
                placeholder="Middle Name"
              />{" "}
              <Select
                label="Church"
                value={churchId}
                onChange={setChurchId}
                options={churchOptions}
                placeholder="Select church"
              />{" "}
              <Select
                label="Select Where You Serve As A Worker"
                sublabel="Select only one option for now. You can always add another later from your profile."
                value={workerSelection}
                onChange={setWorkerSelection}
                options={workerOptions}
                placeholder={
                  !churchId ? "Select a church first" : "Select ministry"
                }
                disabled={!churchId || workerOptions.length === 0}
              />{" "}
              <Select
                label="Active Role"
                value={activeRole}
                onChange={(v: any) => setActiveRole(v)}
                options={ROLE_OPTIONS}
                placeholder="Select active role"
              />{" "}
              {activeRole === "UnitLeader" && (
                <Select
                  label="Unit You Lead"
                  value={unitLead}
                  onChange={setUnitLead}
                  options={unitOptions}
                  placeholder="Select the unit you lead"
                />
              )}{" "}
              {(activeRole === "UnitLeader" || activeRole === "Member") && (
                <Select
                  label="Unit Where You Belong"
                  sublabel="You may eventually belong to more than one unit. For now, select only one."
                  value={unitMember}
                  onChange={setUnitMember}
                  options={unitOptions}
                  placeholder="Select a unit"
                />
              )}{" "}
              <Select
                label="Gender"
                value={gender}
                onChange={setGender}
                options={GENDER_OPTIONS}
                placeholder="Select your gender"
              />{" "}
              {/* Phone */}{" "}
              <div className="mb-3.5">
                {" "}
                <label className="block text-[12px] font-semibold text-[#344054] dark:text-gray-300 mb-1">
                  Phone Number
                </label>{" "}
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setPhoneStatus("unknown");
                  }}
                  onBlur={handleCheckPhone}
                  placeholder="+234..."
                  className="w-full h-11 border border-[#D0D5DD] dark:border-[#444] rounded-lg px-3.5 text-sm text-[#101828] dark:text-white bg-white dark:bg-[#1e1e1e] outline-none focus:border-[#2CA6FF] transition-all placeholder:text-[#98A2B3]"
                />{" "}
                {phoneStatus === "checking" && (
                  <p className="text-[11px] text-[#667085] mt-1">
                    Checking availability…
                  </p>
                )}{" "}
                {phoneStatus === "exists" && (
                  <p className="text-[11px] text-[#D92D20] mt-1">
                    Phone already registered.
                  </p>
                )}{" "}
                {phoneStatus === "free" && (
                  <p className="text-[11px] text-[#027A48] mt-1">
                    ✓ Phone available.
                  </p>
                )}{" "}
              </div>{" "}
              <PasswordInput
                label="Password"
                value={password}
                onChange={setPassword}
                placeholder="Must be at least 6 characters"
              />{" "}
              <PasswordRules password={password} />{" "}
              <PasswordInput
                label="Confirm Password"
                value={confirm}
                onChange={setConfirm}
                placeholder="Re-enter password"
              />{" "}
              {password && confirm && password !== confirm && (
                <p className="text-[11px] text-[#D92D20] mb-3">
                  Passwords do not match.
                </p>
              )}{" "}
              <motion.button
                disabled={!canNext}
                onClick={() => setStep(2)}
                whileTap={{ scale: 0.97 }}
                className="w-full h-12 rounded-lg font-semibold text-[15px] text-white mt-1 disabled:opacity-40 shadow-md"
                style={{ backgroundColor: PRIMARY }}
              >
                {" "}
                Next{" "}
              </motion.button>{" "}
            </div>
          )}{" "}
          {/* ═══════════════ STEP 2 ═══════════════ */}{" "}
          {step === 2 && (
            <div>
              {" "}
              <h2 className="text-sm font-bold text-[#344054] dark:text-gray-200 mb-4">
                Residential Address
              </h2>{" "}
              <Select
                label="Country"
                value={country}
                onChange={setCountry}
                options={countriesOptions}
                placeholder={
                  loadingCountries
                    ? "Loading countries…"
                    : "Select your country"
                }
                disabled={loadingCountries}
              />{" "}
              <Select
                label="State / Region"
                value={state}
                onChange={setState}
                options={stateOptions}
                placeholder={
                  loadingStates.state ? "Loading states…" : "Select your state"
                }
                disabled={loadingStates.state || !country}
              />{" "}
              <Select
                label="L.G.A"
                value={lga}
                onChange={setLga}
                options={lgaOptions}
                placeholder={
                  loadingStates.lga ? "Loading L.G.A…" : "Select L.G.A"
                }
                disabled={loadingStates.lga || !state}
              />{" "}
              <LabelInput
                label="Nearest Landmark / Bus Stop"
                value={landmark}
                onChange={setLandmark}
                placeholder="Enter landmark or bus stop"
              />{" "}
              {/* Date of Birth */}
              <label className="block text-[13px] font-semibold text-[#344054] dark:text-gray-300 mb-2 mt-1">
                Date of Birth <span className="text-[#D92D20] font-bold">*</span>
              </label>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <Select
                  label=""
                  value={dobDay}
                  onChange={setDobDay}
                  options={days}
                  placeholder="Day"
                />
                <Select
                  label=""
                  value={dobMonth}
                  onChange={setDobMonth}
                  options={months}
                  placeholder="Month"
                />
                <Select
                  label=""
                  value={dobYear}
                  onChange={setDobYear}
                  options={years}
                  placeholder="Year"
                />
              </div>
              <LabelInput
                label="Occupation"
                value={occupation}
                onChange={setOccupation}
                placeholder="Occupation"
              />{" "}
              <Select
                label="Employment Status"
                value={employmentStatus}
                onChange={setEmploymentStatus}
                options={EMPLOYMENT_OPTIONS}
                placeholder="Employment status"
              />{" "}
              <MultiSelect
                label="Field(s) that best describe your work or business?"
                value={workFields}
                onChange={setWorkFields}
                options={WORK_FIELD_OPTIONS}
              />{" "}
              {/* Specific fields chip input */}
              <div className="mb-4">
                <label className="block text-[13px] font-semibold text-[#344054] dark:text-gray-300 mb-1.5">
                  Specific field(s) <span className="text-[#D92D20] font-bold">*</span>
                </label>
                <div className="border border-[#D0D5DD] dark:border-[#333] rounded-xl px-4 py-2.5 min-h-12 flex flex-wrap items-center gap-2 bg-white dark:bg-[#1a1c23] shadow-sm hover:border-[#2CA6FF]/50 transition-all">
                  {specificFields
                    .split(",")
                    .filter(Boolean)
                    .map((f, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 bg-[#EEF6FB] dark:bg-[#2CA6FF]/10 text-[#2CA6FF] text-[11px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider shadow-sm"
                      >
                        {f.trim()}
                        <button
                          type="button"
                          onClick={() => removeSpecificField(idx)}
                          className="hover:bg-[#2CA6FF] hover:text-white rounded-full p-0.5 transition-colors"
                        >
                          <X size={10} strokeWidth={4} />
                        </button>
                      </span>
                    ))}
                  <input
                    type="text"
                    value={currSpecificInput}
                    onChange={(e) => setCurrSpecificInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSpecificField();
                      }
                    }}
                    placeholder={specificFields ? "" : "Type & press Enter"}
                    className="flex-1 min-w-[120px] h-7 text-sm bg-transparent outline-none text-[#101828] dark:text-white placeholder:text-[#98A2B3]"
                  />
                  <button 
                    type="button" 
                    onClick={addSpecificField}
                    className="p-1 hover:bg-[#2CA6FF]/10 rounded-full transition-colors"
                  >
                    <Plus size={22} className="text-[#2CA6FF]" strokeWidth={3} />
                  </button>
                </div>
              </div>
              <Select
                label="Marital Status"
                value={maritalStatus}
                onChange={setMaritalStatus}
                options={MARITAL_OPTIONS}
                placeholder="Marital status"
              />{" "}
              {/* Profile photo */}
              <label className="block text-[13px] font-semibold text-[#344054] dark:text-gray-300 mb-3 mt-2">
                Add Profile Photo <span className="text-[#D92D20] font-bold">*</span>
              </label>
              <div className="flex items-center gap-5 mb-6 p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                {localAvatarPreview ? (
                  <div className="relative">
                    <img
                      src={localAvatarPreview}
                      alt="avatar"
                      className="w-20 h-20 rounded-full object-cover border-4 border-white dark:border-[#1a1c23] shadow-lg"
                    />
                    <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#2CA6FF] rounded-full flex items-center justify-center border-2 border-white dark:border-[#1a1c23]">
                      <Check size={14} color="white" strokeWidth={4} />
                    </div>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-white dark:bg-[#1a1c23] shadow-inner flex items-center justify-center border-2 border-dashed border-[#2CA6FF]/40">
                    <Camera size={32} className="text-[#2CA6FF]/50" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-[12px] text-gray-500 dark:text-gray-400 mb-2">
                    JPG, PNG or GIF (Max. 5MB)
                  </p>
                  <button
                    type="button"
                    onClick={handlePickAvatar}
                    className="px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-[#2CA6FF] text-[#2CA6FF] text-[13px] font-bold hover:bg-[#2CA6FF] hover:text-white transition-all shadow-sm active:scale-95"
                  >
                    {localAvatarPreview ? "Change Photo" : "Upload Photo"}
                  </button>
                </div>
              </div>
              {/* Terms */}
              <div className="flex items-start gap-3 mb-8 p-4 bg-blue-50/30 dark:bg-blue-900/10 rounded-2xl border border-blue-100/50 dark:border-blue-900/20">
                <button
                  type="button"
                  onClick={() => setAgree((a) => !a)}
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                    agree 
                      ? "bg-[#2CA6FF] border-[#2CA6FF] shadow-[0_4px_10px_rgba(44,166,255,0.4)]" 
                      : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                  }`}
                >
                  {agree && <Check size={14} color="white" strokeWidth={4} />}
                </button>
                <p className="text-[12px] text-[#344054] dark:text-gray-400 leading-relaxed font-medium">
                  I agree to the{" "}
                  <span className="text-[#2CA6FF] font-bold underline cursor-pointer hover:text-[#1a88d6]">
                    Terms & Conditions
                  </span>{" "}
                  and{" "}
                  <span className="text-[#2CA6FF] font-bold underline cursor-pointer hover:text-[#1a88d6]">
                    Privacy Policy
                  </span>{" "}
                  of Streams of Joy Ministries.
                </p>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 px-5 py-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 flex items-center gap-3"
                >
                  <X className="text-red-500 shrink-0" size={20} />
                  <p className="text-[13px] text-red-600 dark:text-red-400 font-semibold">{error}</p>
                </motion.div>
              )}

              <motion.button
                onClick={submit}
                disabled={submitting}
                whileTap={{ scale: 0.98 }}
                className="w-full h-14 rounded-2xl font-bold text-[16px] text-white disabled:opacity-50 shadow-[0_10px_25px_rgba(44,166,255,0.4)] transition-all hover:shadow-[0_15px_30px_rgba(44,166,255,0.5)] flex items-center justify-center gap-3 mb-4"
                style={{ backgroundColor: PRIMARY }}
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Complete Registration</span>
                )}
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
