import React, { useCallback, useReducer, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ChevronDown, UploadCloud, X, Send, Image as ImageIcon } from 'lucide-react';
import { createSupportTicket } from '../../api/support';
import type { SupportCategory } from '../../api/support';
import toast from 'react-hot-toast';

const PRIMARY = '#349DC5';

interface State {
  email: string;
  phone: string;
  category: SupportCategory | '';
  description: string;
  screenshotBase64?: string;
  submitting: boolean;
  errors: Record<string, string>;
  success: boolean;
}

type Action = 
  | { type: 'field'; field: keyof State; value: any }
  | { type: 'error'; field: string; message: string }
  | { type: 'clearError'; field: string }
  | { type: 'setSubmitting'; value: boolean }
  | { type: 'setSuccess'; value: boolean }
  | { type: 'resetExceptEmail' }
  | { type: 'bulkErrors'; errors: Record<string, string> };

const initial: State = { email: '', phone: '', category: '', description: '', submitting: false, errors: {}, success: false };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'field':
      return { ...state, [action.field]: action.value };
    case 'error':
      return { ...state, errors: { ...state.errors, [action.field]: action.message } };
    case 'clearError':
      const { [action.field]: _, ...rest } = state.errors; return { ...state, errors: rest };
    case 'bulkErrors':
      return { ...state, errors: action.errors };
    case 'setSubmitting':
      return { ...state, submitting: action.value };
    case 'setSuccess':
      return { ...state, success: action.value };
    case 'resetExceptEmail':
      return { ...initial, email: state.email };
    default:
      return state;
  }
}

const categories: SupportCategory[] = ['Login Issues', 'Performance', 'Bug Report', 'Feature Request', 'Data Issue', 'Other'];

export default function SupportScreen() {
  const [state, dispatch] = useReducer(reducer, initial);
  const [showCategoryList, setShowCategoryList] = useState(false);

  const validate = useCallback(() => {
    const errs: Record<string, string> = {};
    if (!state.email.trim()) errs.email = 'Email required';
    else if (!/^\\S+@\\S+\\.\\S+$/.test(state.email.trim())) errs.email = 'Invalid email';
    if (!state.category) errs.category = 'Pick a category';
    if (!state.description.trim() || state.description.trim().length < 10) errs.description = 'Min 10 characters';
    dispatch({ type: 'bulkErrors', errors: errs });
    return Object.keys(errs).length === 0;
  }, [state.email, state.category, state.description]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      dispatch({ type: 'field', field: 'screenshotBase64', value: base64 });
    };
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    if (!validate()) return;
    dispatch({ type: 'setSubmitting', value: true });
    try {
      const payload = {
        email: state.email.trim(),
        phone: state.phone.trim() || undefined,
        category: state.category as SupportCategory,
        description: state.description.trim(),
        screenshotBase64: state.screenshotBase64
      };
      const res = await createSupportTicket(payload);
      if (!res.ok) {
        toast.error('Could not submit ticket');
      } else {
        dispatch({ type: 'setSuccess', value: true });
        dispatch({ type: 'resetExceptEmail' });
      }
    } catch (e: any) {
      toast.error('Could not submit ticket');
    } finally {
      dispatch({ type: 'setSubmitting', value: false });
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#111] pb-24">
      {/* Header */}
      <div className="bg-white dark:bg-[#1a1a1a] border-b border-gray-100 dark:border-white/5 pt-10 sticky top-0 z-20">
        <h1 className="text-xl font-black text-[#00204a] dark:text-white uppercase tracking-tight px-6 mb-4">Technical Support</h1>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <h2 className="text-xl font-bold text-[#00204a] dark:text-white mb-2">Technical Support & Assistance</h2>
        <p className="text-sm font-bold text-[#349DC5] mb-4">Need Help? We’re Here!</p>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-8">
          This support page helps you quickly resolve any technical issue or challenge you're experiencing. Technical support for this app is provided directly by{' '}
          <a href="https://skyrazordigital.com" target="_blank" rel="noopener noreferrer" className="font-black text-gray-800 dark:text-gray-200 hover:text-[#349DC5] transition-colors underline">
            Skyrazor Digital Limited
          </a>
          , the team behind the app's design, development, and ongoing technical management—ensuring seamless user experiences and efficient solutions. Please submit your issue below, and we'll get back to you promptly.
        </p>

        <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          
          {/* Email */}
          <div>
            <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-2">Email Address *</label>
            <input
              type="email"
              value={state.email}
              onChange={e => dispatch({ type: 'field', field: 'email', value: e.target.value })}
              onBlur={validate}
              placeholder="you@example.com"
              className={`w-full px-4 py-3.5 rounded-xl bg-gray-50 dark:bg-white/5 border text-sm font-medium text-[#0f172a] dark:text-white outline-none transition-colors ${state.errors.email ? 'border-red-400 bg-red-50 dark:bg-red-900/10' : 'border-gray-200 dark:border-white/10 focus:border-[#349DC5]'}`}
            />
            {state.errors.email && <p className="text-xs font-bold text-red-500 mt-1.5">{state.errors.email}</p>}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-2">Phone Number (Optional)</label>
            <input
              type="tel"
              value={state.phone}
              onChange={e => dispatch({ type: 'field', field: 'phone', value: e.target.value })}
              placeholder="+234..."
              className="w-full px-4 py-3.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:border-[#349DC5] text-sm font-medium text-[#0f172a] dark:text-white outline-none transition-colors"
            />
          </div>

          {/* Category */}
          <div className="relative">
            <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-2">Issue Category *</label>
            <button
              type="button"
              onClick={() => setShowCategoryList(!showCategoryList)}
              className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl bg-gray-50 dark:bg-white/5 border text-sm outline-none transition-colors ${state.errors.category ? 'border-red-400 bg-red-50 dark:bg-red-900/10' : 'border-gray-200 dark:border-white/10 hover:border-[#349DC5]'} ${state.category ? 'text-[#0f172a] dark:text-white font-medium' : 'text-gray-400'}`}
            >
              <span>{state.category || 'Select a category'}</span>
              <ChevronDown size={18} className="text-gray-400" />
            </button>
            {state.errors.category && <p className="text-xs font-bold text-red-500 mt-1.5">{state.errors.category}</p>}
            
            <AnimatePresence>
              {showCategoryList && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowCategoryList(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl z-20 overflow-hidden"
                  >
                    {categories.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => { dispatch({ type: 'field', field: 'category', value: cat }); setShowCategoryList(false); }}
                        className="w-full text-left px-4 py-3.5 text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 border-b border-gray-100 dark:border-white/5 last:border-0 transition-colors"
                      >
                        {cat}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-2">Description *</label>
            <textarea
              value={state.description}
              onChange={e => dispatch({ type: 'field', field: 'description', value: e.target.value })}
              onBlur={validate}
              placeholder="Describe the issue you are facing with as much detail as possible..."
              rows={6}
              className={`w-full px-4 py-3.5 rounded-xl bg-gray-50 dark:bg-white/5 border text-sm font-medium text-[#0f172a] dark:text-white outline-none transition-colors resize-y ${state.errors.description ? 'border-red-400 bg-red-50 dark:bg-red-900/10' : 'border-gray-200 dark:border-white/10 focus:border-[#349DC5]'}`}
            />
            {state.errors.description && <p className="text-xs font-bold text-red-500 mt-1.5">{state.errors.description}</p>}
          </div>

          {/* Screenshot */}
          <div>
            <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-2">Attach Screenshot (Optional)</label>
            {state.screenshotBase64 ? (
              <div className="relative rounded-xl overflow-hidden group">
                <img src={state.screenshotBase64} alt="Screenshot" className="w-full h-auto max-h-60 object-cover bg-gray-100" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
                  <label className="px-4 py-2 bg-white text-gray-900 rounded-lg text-xs font-bold cursor-pointer hover:scale-105 transition-transform">
                    Replace
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                  <button type="button" onClick={() => dispatch({ type: 'field', field: 'screenshotBase64', value: undefined })} className="px-4 py-2 bg-red-500 text-white rounded-lg text-xs font-bold hover:scale-105 transition-transform">
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <label className="w-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl bg-gray-50 dark:bg-[#1a1a1a] cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5 hover:border-[#349DC5] transition-colors">
                <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-3 text-[#349DC5]">
                  <ImageIcon size={24} />
                </div>
                <p className="text-sm font-bold text-gray-600 dark:text-gray-300">Tap to attach a screenshot (optional)</p>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            )}
          </div>

          <button
            type="submit"
            disabled={state.submitting}
            className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-white font-black uppercase tracking-wider transition-all ${state.submitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#349DC5] hover:bg-[#2a7a9a] active:scale-95 shadow-lg shadow-[#349DC5]/20'}`}
          >
            {state.submitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Send size={18} /> Submit Ticket
              </>
            )}
          </button>
        </form>

        {/* Footer Contact */}
        <div className="mt-16 text-center space-y-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            Managed by: <a href="https://skyrazordigital.com" target="_blank" rel="noopener noreferrer" className="text-[#349DC5] font-black underline hover:text-[#2a7a9a]">Skyrazor Digital Limited</a>
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 text-xs text-gray-500 dark:text-gray-400">
            <p>Phone: <a href="tel:+2348143483760" className="font-bold text-gray-800 dark:text-gray-200">+234 814 348 3760</a></p>
            <p>Email: <a href="mailto:hello@skyrazordigital.com" className="font-bold text-gray-800 dark:text-gray-200">hello@skyrazordigital.com</a></p>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-6 max-w-sm mx-auto leading-relaxed">
            By submitting you agree to our <a href="/legal/terms" className="text-[#349DC5] underline">Terms of Use</a> & <a href="/legal/privacy" className="text-[#349DC5] underline">Privacy Policy</a>.
          </p>
        </div>
      </div>

      {/* Success Modal */}
      <AnimatePresence>
        {state.success && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => dispatch({ type: 'setSuccess', value: false })} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white dark:bg-[#1e1e1e] w-full max-w-sm rounded-[32px] p-8 text-center shadow-2xl"
            >
              <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={40} className="text-emerald-500" />
              </div>
              <h3 className="text-2xl font-black text-[#00204a] dark:text-white uppercase tracking-tight mb-3">Success</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed mb-8">
                Your support request has been successfully submitted. A representative from Skyrazor Digital Limited will contact you shortly at your provided email or phone number. Thank you for your patience!
              </p>
              <button
                onClick={() => dispatch({ type: 'setSuccess', value: false })}
                className="w-full py-4 bg-emerald-500 text-white rounded-2xl text-sm font-black uppercase tracking-wider hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
              >
                Done
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
