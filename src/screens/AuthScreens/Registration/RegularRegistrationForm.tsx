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
import AsyncStorage from "@react-native-async-storage/async-storage"; // ─── Config ──────────────────────────────────────────────────────────────────
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
    <div className="mb-3.5">
      <label className="block text-[12px] font-semibold text-[#344054] dark:text-gray-300 mb-1">
        {label}
      </label>
      {sublabel && (
        <p className="text-[11px] text-[#667085] mb-1 leading-4">{sublabel}</p>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className="w-full h-11 border border-[#D0D5DD] dark:border-[#444] rounded-lg px-3.5 text-sm text-[#101828] dark:text-white bg-white dark:bg-[#1e1e1e] outline-none focus:border-[#2CA6FF] focus:ring-2 focus:ring-[#2CA6FF]/20 transition-all placeholder:text-[#98A2B3]"
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
    <div className="mb-3.5 relative" ref={ref}>
      <label className="block text-[12px] font-semibold text-[#344054] dark:text-gray-300 mb-1">
        {label}
      </label>
      {sublabel && (
        <p className="text-[11px] text-[#667085] mb-1 leading-4">{sublabel}</p>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`w-full h-11 border border-[#D0D5DD] dark:border-[#444] rounded-lg px-3.5 text-sm text-left flex items-center justify-between bg-white dark:bg-[#1e1e1e] ${disabled ? "opacity-50" : "focus:border-[#2CA6FF]"} transition-colors`}
      >
        <span
          className={
            selected ? "text-[#101828] dark:text-white" : "text-[#98A2B3]"
          }
        >
          {selected ? (selected.label ?? selected) : placeholder}
        </span>
        <ChevronDown size={16} className="text-gray-400 shrink-0" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-[#1e1e1e] border border-[#D0D5DD] dark:border-[#444] rounded-xl shadow z-50 max-h-52 overflow-y-auto"
          >
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
                  className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-[#EEF6FB] dark:hover:bg-gray-800 transition-colors ${isSelected ? "bg-[#EEF6FB] dark:bg-gray-800 font-semibold text-[#2CA6FF]" : "text-[#101828] dark:text-gray-200"}`}
                >
                  {lbl}
                  {isSelected && (
                    <Check size={14} className="ml-auto text-[#2CA6FF]" />
                  )}
                </button>
              );
            })}
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
    <div className="mb-3.5 relative" ref={ref}>
      <label className="block text-[12px] font-semibold text-[#344054] dark:text-gray-300 mb-1">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full min-h-11 border border-[#D0D5DD] dark:border-[#444] rounded-lg px-3.5 py-2 text-sm text-left flex flex-wrap items-center gap-1.5 bg-white dark:bg-[#1e1e1e]"
      >
        {(value as string[]).length === 0 ? (
          <span className="text-[#98A2B3]">Select fields</span>
        ) : (
          (value as string[]).map((v: string) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 bg-[#EEF6FB] text-[#0A6375] text-xs px-2 py-0.5 rounded-full font-semibold"
            >
              {v}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(v);
                }}
              >
                <X size={10} />
              </button>
            </span>
          ))
        )}
        <ChevronDown size={14} className="text-gray-400 ml-auto shrink-0" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-[#1e1e1e] border border-[#D0D5DD] dark:border-[#444] rounded-xl shadow z-50 max-h-52 overflow-y-auto"
          >
            {options.map((opt: string) => (
              <button
                key={opt}
                type="button"
                onClick={() => toggle(opt)}
                className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-[#EEF6FB] dark:hover:bg-gray-800 transition-colors ${(value as string[]).includes(opt) ? "bg-[#EEF6FB] dark:bg-gray-800 font-semibold text-[#2CA6FF]" : "text-[#101828] dark:text-gray-200"}`}
              >
                {opt}
                {(value as string[]).includes(opt) && (
                  <Check size={14} className="ml-auto text-[#2CA6FF]" />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
function PasswordInput({ label, value, onChange, placeholder }: any) {
  const [show, setShow] = useState(false);
  return (
    <div className="mb-3.5">
      <label className="block text-[12px] font-semibold text-[#344054] dark:text-gray-300 mb-1">
        {label}
      </label>
      <div className="flex items-center border border-[#D0D5DD] dark:border-[#444] rounded-lg bg-white dark:bg-[#1e1e1e] pr-3 focus-within:border-[#2CA6FF] transition-colors">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 h-11 px-3.5 text-sm text-[#101828] dark:text-white bg-transparent outline-none placeholder:text-[#98A2B3]"
        />
        <button type="button" onClick={() => setShow((s) => !s)}>
          {show ? (
            <EyeOff size={18} className="text-gray-400" />
          ) : (
            <Eye size={18} className="text-gray-400" />
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
  const { userId, prefills } = (location.state as any) || {};
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
  return (
    <div className="min-h-screen w-full bg-gray-50 dark:bg-black/95 flex flex-col items-center justify-start overflow-y-auto sm:py-10">
      <div className="w-full sm:max-w-md bg-white dark:bg-[#0f1218] min-h-screen sm:min-h-0 sm:rounded-2xl sm:shadow-2xl overflow-hidden relative pb-16">
        {" "}
        {/* Header */}{" "}
        <div className="sticky top-0 z-20 bg-[#2CA6FF] px-5 pt-10 sm:pt-5 pb-4 flex items-center gap-3">
          {" "}
          <button
            onClick={() => (step === 1 ? navigate(-1) : setStep(1))}
            className="p-1"
          >
            {" "}
            <ChevronLeft size={24} color="white" />{" "}
          </button>{" "}
          <h1 className="text-[16px] font-semibold text-white flex-1">
            Please complete your registration.
          </h1>{" "}
        </div>{" "}
        {/* Progress segments */}{" "}
        <div className="flex gap-2.5 px-5 pt-4 mb-5">
          {" "}
          {[1, 2].map((s) => (
            <div
              key={s}
              className="flex-1 h-1 rounded-full transition-all duration-300"
              style={{ backgroundColor: step >= s ? PRIMARY : "#E4E7EC" }}
            />
          ))}{" "}
        </div>{" "}
        <div className="px-5 pb-24">
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
              {/* Date of Birth */}{" "}
              <label className="block text-[12px] font-semibold text-[#344054] dark:text-gray-300 mb-1.5">
                Date of Birth <span className="text-[#D92D20]">*</span>
              </label>{" "}
              <div className="grid grid-cols-3 gap-2 mb-3.5">
                {" "}
                <Select
                  label=""
                  value={dobDay}
                  onChange={setDobDay}
                  options={days}
                  placeholder="Day"
                />{" "}
                <Select
                  label=""
                  value={dobMonth}
                  onChange={setDobMonth}
                  options={months}
                  placeholder="Month"
                />{" "}
                <Select
                  label=""
                  value={dobYear}
                  onChange={setDobYear}
                  options={years}
                  placeholder="Year"
                />{" "}
              </div>{" "}
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
              {/* Specific fields chip input */}{" "}
              <div className="mb-3.5">
                {" "}
                <label className="block text-[12px] font-semibold text-[#344054] dark:text-gray-300 mb-1">
                  Specific field(s) <span className="text-[#D92D20]">*</span>
                </label>{" "}
                <div className="border border-[#D0D5DD] dark:border-[#444] rounded-lg px-3 py-2 min-h-11 flex flex-wrap items-center gap-1.5 bg-white dark:bg-[#1e1e1e]">
                  {" "}
                  {specificFields
                    .split(",")
                    .filter(Boolean)
                    .map((f, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 bg-[#EEF6FB] text-[#0A6375] text-xs px-2 py-0.5 rounded-full font-semibold"
                      >
                        {" "}
                        {f.trim()}{" "}
                        <button
                          type="button"
                          onClick={() => removeSpecificField(idx)}
                        >
                          <X size={10} />
                        </button>{" "}
                      </span>
                    ))}{" "}
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
                  />{" "}
                  <button type="button" onClick={addSpecificField}>
                    <Plus size={20} className="text-[#2CA6FF]" />
                  </button>{" "}
                </div>{" "}
              </div>{" "}
              <Select
                label="Marital Status"
                value={maritalStatus}
                onChange={setMaritalStatus}
                options={MARITAL_OPTIONS}
                placeholder="Marital status"
              />{" "}
              {/* Profile photo */}{" "}
              <label className="block text-[12px] font-semibold text-[#344054] dark:text-gray-300 mb-2 mt-1">
                Add Profile Photo <span className="text-[#D92D20]">*</span>
              </label>{" "}
              <div className="flex items-center gap-4 mb-4">
                {" "}
                {localAvatarPreview ? (
                  <img
                    src={localAvatarPreview}
                    alt="avatar"
                    className="w-20 h-20 rounded-full object-cover border-2 border-[#2CA6FF]"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-[#EEF6FB] border-2 border-dashed border-[#2CA6FF] flex items-center justify-center">
                    {" "}
                    <Camera size={28} className="text-[#2CA6FF]" />{" "}
                  </div>
                )}{" "}
                <button
                  type="button"
                  onClick={handlePickAvatar}
                  className="px-4 py-2 rounded-lg border border-[#2CA6FF] text-[#2CA6FF] text-sm font-semibold hover:bg-[#EEF6FB] transition-colors"
                >
                  {" "}
                  {localAvatarPreview ? "Change Photo" : "Upload Photo"}{" "}
                </button>{" "}
              </div>{" "}
              {/* Terms */}{" "}
              <div className="flex items-start gap-2.5 mb-5">
                {" "}
                <button
                  type="button"
                  onClick={() => setAgree((a) => !a)}
                  className={`w-[18px] h-[18px] rounded border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${agree ? "bg-[#2CA6FF] border-[#2CA6FF]" : "border-[#D0D5DD] dark:border-[#444]"}`}
                >
                  {" "}
                  {agree && (
                    <Check size={11} color="white" strokeWidth={3} />
                  )}{" "}
                </button>{" "}
                <p className="text-[11.5px] text-[#344054] dark:text-gray-400 leading-4">
                  {" "}
                  I agree to the{" "}
                  <span className="text-[#2CA6FF] font-semibold cursor-pointer">
                    Terms & Conditions
                  </span>{" "}
                  and{" "}
                  <span className="text-[#2CA6FF] font-semibold cursor-pointer">
                    Privacy Policy
                  </span>{" "}
                  of Streams of Joy International Ministries.{" "}
                </p>{" "}
              </div>{" "}
              {error && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 text-sm text-red-600">
                  {error}
                </div>
              )}{" "}
              <motion.button
                onClick={submit}
                disabled={submitting}
                whileTap={{ scale: 0.97 }}
                className="w-full h-12 rounded-lg font-semibold text-[15px] text-white disabled:opacity-60 shadow-md"
                style={{ backgroundColor: PRIMARY }}
              >
                {" "}
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    {" "}
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{" "}
                    Submitting…{" "}
                  </span>
                ) : (
                  "Complete Registration"
                )}{" "}
              </motion.button>{" "}
            </div>
          )}{" "}
        </div>{" "}
      </div>
    </div>
  );
}
