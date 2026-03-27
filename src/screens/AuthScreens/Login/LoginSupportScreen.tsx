import { useCallback, useReducer, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { Upload, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import {
  createSupportTicket,
  type SupportCategory,
} from "../../../api/support";
interface State {
  email: string;
  phone: string;
  category: SupportCategory | "";
  description: string;
  screenshotBase64?: string;
  submitting: boolean;
  errors: Record<string, string>;
  success: boolean;
}
type Action =
  | { type: "field"; field: keyof State; value: any }
  | { type: "error"; field: string; message: string }
  | { type: "clearError"; field: string }
  | { type: "setSubmitting"; value: boolean }
  | { type: "setSuccess"; value: boolean }
  | { type: "resetExceptEmail" }
  | { type: "bulkErrors"; errors: Record<string, string> };
const initial: State = {
  email: "",
  phone: "",
  category: "",
  description: "",
  submitting: false,
  errors: {},
  success: false,
};
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "field":
      return { ...state, [action.field]: action.value } as State;
    case "error":
      return {
        ...state,
        errors: { ...state.errors, [action.field]: action.message },
      };
    case "clearError": {
      const { [action.field]: _o, ...rest } = state.errors;
      return { ...state, errors: rest };
    }
    case "bulkErrors":
      return { ...state, errors: action.errors };
    case "setSubmitting":
      return { ...state, submitting: action.value };
    case "setSuccess":
      return { ...state, success: action.value };
    case "resetExceptEmail":
      return { ...initial, email: state.email };
    default:
      return state;
  }
}
const CATEGORIES: SupportCategory[] = [
  "Login Issues",
  "Performance",
  "Bug Report",
  "Feature Request",
  "Data Issue",
  "Other",
];
const ROLES = ["Guest", "Member", "UnitLeader", "SuperAdmin"] as const;
type PickedRole = (typeof ROLES)[number];
const PRIMARY = "#349DC5";
export default function LoginSupportScreen() {
  const [state, dispatch] = useReducer(reducer, initial);
  const [showCategoryList, setShowCategoryList] = useState(false);
  const [role, setRole] = useState<PickedRole>("Guest");
  const validate = useCallback(() => {
    const errs: Record<string, string> = {};
    if (!state.email.trim()) errs.email = "Email required";
    else if (!/^\S+@\S+\.\S+$/.test(state.email.trim()))
      errs.email = "Invalid email";
    if (!state.category) errs.category = "Pick a category";
    if (!state.description.trim() || state.description.trim().length < 10)
      errs.description = "Min 10 characters";
    dispatch({ type: "bulkErrors", errors: errs });
    return Object.keys(errs).length === 0;
  }, [state.email, state.category, state.description]);
  const pickImage = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        dispatch({
          type: "field",
          field: "screenshotBase64",
          value: ev.target?.result as string,
        });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };
  const submit = async () => {
    if (!validate()) return;
    dispatch({ type: "setSubmitting", value: true });
    try {
      const payload = {
        email: state.email.trim(),
        phone: state.phone.trim() || undefined,
        category: state.category as SupportCategory,
        description: `[Role: ${role}] ${state.description.trim()}`,
        screenshotBase64: state.screenshotBase64,
      };
      const res = await createSupportTicket(payload);
      if (!res.ok) {
        toast.error(res.message || "Could not submit ticket");
      } else {
        dispatch({ type: "setSuccess", value: true });
        dispatch({ type: "resetExceptEmail" });
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Submission failed");
    } finally {
      dispatch({ type: "setSubmitting", value: false });
    }
  };
  return (
    <div className="w-full overflow-y-auto px-5 pb-24 pt-8">
      <h2 className="text-xl font-bold text-[#111] dark:text-white mb-1">
        Technical Support &amp; Assistance
      </h2>
      <p className="text-sm font-semibold mb-3" style={{ color: PRIMARY }}>
        Need Help? We're Here!
      </p>
      <p className="text-sm text-[#4a4a4a] dark:text-gray-400 leading-5 mb-6">
        This support page helps you quickly resolve any technical issue or
        challenge you&apos;re experiencing. Technical support for this app is
        provided directly by
        <span className="font-bold text-[#111] dark:text-white">
          Skyrazor Digital Limited
        </span>
        . Please submit your issue below, and we&apos;ll get back to you
        promptly.
      </p>
      {/* Role picker */}
      <label className="block text-sm font-semibold text-[#111] dark:text-white mb-2 mt-3">
        I am a
      </label>
      <div className="flex flex-wrap gap-2 mb-5">
        {ROLES.map((r) => (
          <button
            key={r}
            onClick={() => setRole(r)}
            className="px-3 py-2 rounded-2xl text-xs font-semibold transition-all"
            style={{
              backgroundColor: role === r ? PRIMARY : "#eef6f9",
              color: role === r ? "#fff" : PRIMARY,
            }}
          >
            {r}
          </button>
        ))}
      </div>
      {/* Email */}
      <label className="block text-sm font-semibold text-[#111] dark:text-white mb-1.5 mt-3">
        Email Address
      </label>
      <input
        type="email"
        autoCapitalize="off"
        value={state.email}
        onChange={(e) =>
          dispatch({ type: "field", field: "email", value: e.target.value })
        }
        onBlur={() => validate()}
        placeholder="you@example.com"
        className={`w-full px-3.5 py-3 rounded-lg border text-sm bg-[#fafafa] dark:bg-[#1e1e1e] dark:text-white outline-none transition-colors ${state.errors.email ? "border-red-400 bg-red-50" : "border-[#d9d9d9] dark:border-[#333]"}`}
      />
      {state.errors.email && (
        <p className="text-xs text-red-500 mt-1">{state.errors.email}</p>
      )}
      {/* Phone */}
      <label className="block text-sm font-semibold text-[#111] dark:text-white mb-1.5 mt-4">
        Phone Number
        <span className="text-gray-400 font-normal">(Optional)</span>
      </label>
      <input
        type="tel"
        value={state.phone}
        onChange={(e) =>
          dispatch({ type: "field", field: "phone", value: e.target.value })
        }
        placeholder="+234..."
        className="w-full px-3.5 py-3 rounded-lg border border-[#d9d9d9] dark:border-[#333] text-sm bg-[#fafafa] dark:bg-[#1e1e1e] dark:text-white outline-none"
      />
      {/* Category */}
      <label className="block text-sm font-semibold text-[#111] dark:text-white mb-1.5 mt-4">
        Issue Category
      </label>
      <button
        onClick={() => setShowCategoryList((s) => !s)}
        className={`w-full flex items-center justify-between px-3.5 py-3 rounded-lg border text-sm bg-[#fafafa] dark:bg-[#1e1e1e] transition-colors ${state.errors.category ? "border-red-400" : "border-[#d9d9d9] dark:border-[#333]"}`}
      >
        <span
          className={
            state.category ? "text-[#111] dark:text-white" : "text-gray-400"
          }
        >
          {state.category || "Select a category"}
        </span>
        {showCategoryList ? (
          <ChevronUp size={16} className="text-gray-500" />
        ) : (
          <ChevronDown size={16} className="text-gray-500" />
        )}
      </button>
      {state.errors.category && (
        <p className="text-xs text-red-500 mt-1">{state.errors.category}</p>
      )}
      {showCategoryList && (
        <div className="border border-[#d9d9d9] dark:border-[#333] rounded-lg mt-1 bg-white dark:bg-[#1e1e1e] overflow-hidden shadow-md">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                dispatch({ type: "field", field: "category", value: cat });
                setShowCategoryList(false);
              }}
              className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-[#eee] dark:border-[#333] last:border-0 text-[#111] dark:text-white transition-colors"
            >
              {cat}
            </button>
          ))}
        </div>
      )}
      {/* Description */}
      <label className="block text-sm font-semibold text-[#111] dark:text-white mb-1.5 mt-4">
        Description
      </label>
      <textarea
        rows={6}
        value={state.description}
        onChange={(e) =>
          dispatch({
            type: "field",
            field: "description",
            value: e.target.value,
          })
        }
        onBlur={() => validate()}
        placeholder="Describe the issue you are facing with as much detail as possible."
        className={`w-full px-3.5 py-3 rounded-lg border text-sm bg-[#fafafa] dark:bg-[#1e1e1e] dark:text-white outline-none resize-none ${state.errors.description ? "border-red-400 bg-red-50" : "border-[#d9d9d9] dark:border-[#333]"}`}
      />
      {state.errors.description && (
        <p className="text-xs text-red-500 mt-1">{state.errors.description}</p>
      )}
      {/* Screenshot */}
      <label className="block text-sm font-semibold text-[#111] dark:text-white mb-1.5 mt-4">
        Attach Screenshot
        <span className="text-gray-400 font-normal">(Optional)</span>
      </label>
      {state.screenshotBase64 ? (
        <div className="mb-4">
          <img
            src={state.screenshotBase64}
            alt="screenshot"
            className="w-full h-44 object-cover rounded-lg bg-gray-100"
          />
          <div className="flex gap-3 mt-2">
            <button
              onClick={() =>
                dispatch({
                  type: "field",
                  field: "screenshotBase64",
                  value: undefined,
                })
              }
              className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm font-medium text-[#222] dark:text-white"
            >
              Remove
            </button>
            <button
              onClick={pickImage}
              className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm font-medium text-[#222] dark:text-white"
            >
              Replace
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={pickImage}
          className="w-full border border-dashed border-gray-400 rounded-lg p-6 mb-4 bg-[#f8f8f8] dark:bg-[#1e1e1e] flex flex-col items-center gap-2"
        >
          <Upload size={22} className="text-gray-400" />
          <span className="text-sm text-[#555] dark:text-gray-400">
            Tap to add a screenshot (optional)
          </span>
        </button>
      )}
      {/* Submit */}
      <motion.button
        disabled={state.submitting}
        onClick={submit}
        whileTap={{ scale: 0.97 }}
        className="w-full py-4 rounded-xl text-white font-semibold text-base disabled:opacity-60 shadow-md"
        style={{ backgroundColor: PRIMARY }}
      >
        {state.submitting ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Submitting...
          </div>
        ) : (
          "Submit Ticket"
        )}
      </motion.button>
      {/* Footer */}
      <div className="mt-8 flex flex-col items-center gap-1">
        <p className="text-[11px] font-semibold text-[#0d5c75]">
          Managed by:
          <span className="text-[#349DC5] underline font-bold">
            Skyrazor Digital Limited
          </span>
        </p>
        <p className="text-[11px] text-[#0d5c75]">
          Email:
          <span className="font-semibold">hello@skyrazordigital.com</span>
        </p>
        <p className="text-[11px] text-[#555] text-center leading-4 mt-1 w-11/12">
          For urgent issues, direct assistance, or other inquiries, feel free to
          contact us via email.
        </p>
      </div>
      {/* Success modal */}
      <AnimatePresence>
        {state.success && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.85 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.85 }}
              className="bg-white dark:bg-[#1e1e1e] rounded-3xl p-7 w-full max-w-sm shadow-md text-center"
            >
              <CheckCircle size={52} className="text-[#10B981] mx-auto mb-4" />
              <h3 className="text-base font-bold text-[#111] dark:text-white mb-3">
                Success
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Your support request has been successfully submitted. A
                representative from Skyrazor Digital Limited will contact you
                shortly at your provided email or phone number. Thank you for
                your patience!
              </p>
              <button
                onClick={() => dispatch({ type: "setSuccess", value: false })}
                className="mt-5 w-full py-3 rounded-xl font-bold text-white"
                style={{ backgroundColor: PRIMARY }}
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
