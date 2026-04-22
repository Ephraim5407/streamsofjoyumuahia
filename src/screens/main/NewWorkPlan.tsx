import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  X,
  AlertCircle,
  Calendar,
  ChevronDown,
  ChevronUp,
  Tag,
} from "lucide-react";
import toast from "react-hot-toast";
import AsyncStorage from "../../utils/AsyncStorage";
import { loadLocalDrafts, upsertLocalDraft, removeLocalDraft, generateLocalDraftId, type LocalWorkPlanDraft } from "../../utils/localDrafts";
import apiClient from "../../api/client";
import { getUnitContext } from "../../utils/context";
import { cn } from "../../components/LayoutWrapper";

const UNIT_CONTEXT_RECOVERY =
  "We could not determine your unit. Open your unit dashboard once, or sign out and back in, then try again.";

async function resolveWorkPlanUnitContext(): Promise<{
  unitId: string | null;
  superAdminExempt: boolean;
}> {
  let superAdminExempt = false;
  try {
    const raw = await AsyncStorage.getItem("user");
    if (raw) {
      const u = JSON.parse(raw);
      superAdminExempt = u?.activeRole === "SuperAdmin";
    }
  } catch {
    /* ignore */
  }
  const unitId = await getUnitContext();
  return { unitId, superAdminExempt };
}

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------
interface ActivityDraft {
  id: string;
  title: string;
  description: string;
  resources: string; // raw input
  resourcesArr: string[];
}
interface PlanDraft {
  id: string;
  title: string;
  activities: ActivityDraft[];
}

const uuid = () => Math.random().toString(36).slice(2, 10);

// Removed hardcoded API_BASE to use standardized apiClient.

// ------------------------------------------------------------------
// Validation
// ------------------------------------------------------------------
function validateForm(
  title: string,
  generalGoal: string,
  startDate: string,
  endDate: string,
  plans: PlanDraft[]
): string[] {
  const errors: string[] = [];
  if (!title.trim()) errors.push("Work plan title is required");
  if (!generalGoal.trim()) errors.push("General goal is required");
  if (!startDate) errors.push("Starting date is required");
  if (!endDate) errors.push("Ending date is required");
  plans.forEach((pl, pIdx) => {
    const planLabel = `Plan ${pIdx + 1}`;
    if (!pl.title.trim()) errors.push(`${planLabel}: Title is required`);
    pl.activities.forEach((a, aIdx) => {
      const actLabel = `${planLabel} › Activity ${aIdx + 1}`;
      if (!a.title.trim()) errors.push(`${actLabel}: Title is required`);
      if (!a.description.trim())
        errors.push(`${actLabel}: Description is required`);
    });
  });
  return errors;
}

// ------------------------------------------------------------------
// Serialise for API
// ------------------------------------------------------------------
function serialize(
  title: string,
  generalGoal: string,
  startDate: string,
  endDate: string,
  plans: PlanDraft[],
  status?: string,
  unit?: string | null
) {
  return {
    title: title || "Untitled Work Plan",
    generalGoal,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    ...(status ? { status } : {}),
    ...(unit ? { unit } : {}),
    plans: plans.map((pl) => ({
      title: pl.title || "Untitled Plan",
      activities: pl.activities.map((a) => {
        let resArr: string[] = [];
        if (a.resourcesArr.length) {
          resArr = a.resourcesArr.filter(Boolean).map((r) => r.trim());
        } else if (a.resources) {
          resArr = a.resources
            .split(",")
            .map((r) => r.trim())
            .filter(Boolean);
        }
        return {
          title: a.title || "Activity",
          description: a.description,
          resources: resArr,
        };
      }),
    })),
  };
}

// ------------------------------------------------------------------
// Component
// ------------------------------------------------------------------
export default function NewWorkPlan() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const routeParams = useParams<{ id?: string }>();
  // Support both ?edit=ID (from list page) and /work-plans/:id/edit (direct route)
  const editingId = searchParams.get("edit") || routeParams.id || undefined;
  const isEditMode = !!editingId;
  const isLocalDraft = editingId?.startsWith("local_");

  // Form state
  const [title, setTitle] = useState("");
  const [generalGoal, setGeneralGoal] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [plans, setPlans] = useState<PlanDraft[]>([
    {
      id: uuid(),
      title: "",
      activities: [
        { id: uuid(), title: "", description: "", resources: "", resourcesArr: [] },
      ],
    },
  ]);
  const [planStatus, setPlanStatus] = useState<string | undefined>();
  const [rejectionReason, setRejectionReason] = useState<string | undefined>();

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [loadError, setLoadError] = useState<string | undefined>();
  const [expandedPlans, setExpandedPlans] = useState<Record<string, boolean>>({});

  // Validation modal
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showValidationModal, setShowValidationModal] = useState(false);

  // Resource input refs keyed by activity id
  const resourceInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // ------ Plan helpers ------
  const updatePlan = (id: string, patch: Partial<PlanDraft>) =>
    setPlans((p) => p.map((pl) => (pl.id === id ? { ...pl, ...patch } : pl)));

  const updateActivity = (
    planId: string,
    actId: string,
    patch: Partial<ActivityDraft>
  ) =>
    setPlans((p) =>
      p.map((pl) =>
        pl.id === planId
          ? {
              ...pl,
              activities: pl.activities.map((a) =>
                a.id === actId ? { ...a, ...patch } : a
              ),
            }
          : pl
      )
    );

  const addPlan = () =>
    setPlans((p) => [
      ...p,
      {
        id: uuid(),
        title: "",
        activities: [
          {
            id: uuid(),
            title: "",
            description: "",
            resources: "",
            resourcesArr: [],
          },
        ],
      },
    ]);

  const removePlan = (planId: string) =>
    setPlans((p) => {
      if (p.length === 1) return p;
      return p.filter((pl) => pl.id !== planId);
    });

  const addActivity = (planId: string) =>
    setPlans((p) =>
      p.map((pl) =>
        pl.id === planId
          ? {
              ...pl,
              activities: [
                ...pl.activities,
                {
                  id: uuid(),
                  title: "",
                  description: "",
                  resources: "",
                  resourcesArr: [],
                },
              ],
            }
          : pl
      )
    );

  const removeActivity = (planId: string, actId: string) =>
    setPlans((p) =>
      p.map((pl) => {
        if (pl.id !== planId) return pl;
        if (pl.activities.length === 1) return pl;
        return { ...pl, activities: pl.activities.filter((a) => a.id !== actId) };
      })
    );

  const addResourceChip = (planId: string, actId: string, value: string) => {
    const val = value.trim();
    if (!val) return;
    updateActivity(planId, actId, {
      resourcesArr: [],
      resources: "",
    });
    setPlans((p) =>
      p.map((pl) =>
        pl.id === planId
          ? {
              ...pl,
              activities: pl.activities.map((a) => {
                if (a.id !== actId) return a;
                const arr = [...a.resourcesArr];
                if (!arr.includes(val)) arr.push(val);
                return { ...a, resourcesArr: arr, resources: "" };
              }),
            }
          : pl
      )
    );
  };

  const removeResourceChip = (planId: string, actId: string, chip: string) =>
    setPlans((p) =>
      p.map((pl) =>
        pl.id === planId
          ? {
              ...pl,
              activities: pl.activities.map((a) =>
                a.id === actId
                  ? { ...a, resourcesArr: a.resourcesArr.filter((r) => r !== chip) }
                  : a
              ),
            }
          : pl
      )
    );

  // ------ Load existing ------
  const loadExisting = useCallback(async () => {
    if (!editingId) return;
    setLoadingExisting(true);
    setLoadError(undefined);
    try {
      // Handle local draft loading
      if (isLocalDraft) {
        const drafts = await loadLocalDrafts();
        const draft = drafts.find((d) => d.id === editingId);
        if (!draft) throw new Error("Draft not found");
        setTitle(draft.title || "");
        setGeneralGoal(draft.generalGoal || "");
        setStartDate(draft.startDate ? draft.startDate.slice(0, 10) : "");
        setEndDate(draft.endDate ? draft.endDate.slice(0, 10) : "");
        setPlanStatus("draft");
        if (draft.plans && Array.isArray(draft.plans) && draft.plans.length) {
          const loaded: PlanDraft[] = draft.plans.map((pl: any) => ({
            id: pl.id || uuid(),
            title: pl.title || "",
            activities: (pl.activities || []).map((a: any) => ({
              id: a.id || uuid(),
              title: a.title || "",
              description: a.description || "",
              resources: "",
              resourcesArr: a.resourcesArr || [],
            })),
          }));
          setPlans(loaded);
          const expanded: Record<string, boolean> = {};
          loaded.forEach((pl) => { expanded[pl.id] = true; });
          setExpandedPlans(expanded);
        }
        setLoadingExisting(false);
        return;
      }
      // Handle remote workplan loading
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("Auth token missing");
      const resp = await apiClient.get(`/api/workplans/${editingId}`);
      if (!resp.data?.ok) throw new Error(resp.data?.error || "Failed to load plan");
      const it = resp.data.item;
      setTitle(it.title || "");
      setGeneralGoal(it.generalGoal || "");
      setStartDate(it.startDate ? it.startDate.slice(0, 10) : "");
      setEndDate(it.endDate ? it.endDate.slice(0, 10) : "");
      setPlanStatus(it.status);
      setRejectionReason(it.rejectionReason || undefined);
      if (it.plans && Array.isArray(it.plans) && it.plans.length) {
        const loaded: PlanDraft[] = it.plans.map((pl: any) => ({
          id: uuid(),
          title: pl.title,
          activities: (pl.activities || []).map((a: any) => {
            const raw = a.resourcesArr ?? a.resources;
            let arr: string[] = [];
            if (Array.isArray(raw))
              arr = raw.map((r: any) => String(r).trim()).filter(Boolean);
            else if (typeof raw === "string")
              arr = raw
                .split(",")
                .map((r) => r.trim())
                .filter(Boolean);
            return {
              id: uuid(),
              title: a.title,
              description: a.description || "",
              resources: "",
              resourcesArr: arr,
              estimatedHours: "",
            };
          }),
        }));
        setPlans(loaded);
        // expand all by default
        const expanded: Record<string, boolean> = {};
        loaded.forEach((pl) => { expanded[pl.id] = true; });
        setExpandedPlans(expanded);
      }
    } catch (e: any) {
      setLoadError(e.message);
    } finally {
      setLoadingExisting(false);
    }
  }, [editingId, isLocalDraft]);

  useEffect(() => {
    loadExisting();
    // Expand first plan by default for new plans
    if (!editingId) {
      setExpandedPlans({ [plans[0].id]: true });
    }
  }, [loadExisting]);

  // ------ Submit (Save Changes / Resubmit) ------
  const submit = async () => {
    const errors = validateForm(title, generalGoal, startDate, endDate, plans);
    if (errors.length > 0) {
      setValidationErrors(errors);
      setShowValidationModal(true);
      return;
    }
    
    // Handle local draft saving
    if (isLocalDraft && editingId) {
      try {
        setSubmitting(true);
        const raw = await AsyncStorage.getItem("user");
        const user = raw ? JSON.parse(raw) : {};
        const draft: LocalWorkPlanDraft = {
          id: editingId,
          status: "draft",
          title,
          generalGoal,
          startDate: startDate || null,
          endDate: endDate || null,
          plans: plans as any,
          owner: user?._id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          local: true,
        };
        await upsertLocalDraft(draft);
        toast.success("Draft saved locally");
        navigate(-1);
      } catch (e: any) {
        toast.error(e.message);
      } finally {
        setSubmitting(false);
      }
      return;
    }
    
    if (editingId && planStatus && planStatus !== "draft") {
      // Save & resubmit rejected plan
      try {
        setSubmitting(true);
        const token = await AsyncStorage.getItem("token");
        if (!token) { toast.error("Missing auth token"); return; }
        const { unitId: activeUnitId, superAdminExempt } = await resolveWorkPlanUnitContext();
        if (!superAdminExempt && !activeUnitId) {
          toast.error(UNIT_CONTEXT_RECOVERY);
          return;
        }

        const body = serialize(
          title, 
          generalGoal, 
          startDate, 
          endDate, 
          plans,
          planStatus === "rejected" ? "pending" : undefined,
          activeUnitId
        );
        const resp = await apiClient.put(`/api/workplans/${editingId}`, body);
        if (!resp.data?.ok) { toast.error(resp.data?.error || "Failed"); return; }
        if (planStatus === "rejected") toast.success("Plan Resubmitted ✓ — back in pending review.");
        else toast.success("Work Plan updated");
        navigate(`/work-plans/${resp.data.item._id}`, { replace: true });
      } catch (e: any) { toast.error(e.message); }
      finally { setSubmitting(false); }
      return;
    }

    // Save/update remote draft
    if (editingId) {
      try {
        setSubmitting(true);
        const token = await AsyncStorage.getItem("token");
        if (!token) { toast.error("Missing auth token"); return; }
        const { unitId: activeUnitId, superAdminExempt } = await resolveWorkPlanUnitContext();
        if (!superAdminExempt && !activeUnitId) {
          toast.error(UNIT_CONTEXT_RECOVERY);
          return;
        }

        const body = serialize(title, generalGoal, startDate, endDate, plans, undefined, activeUnitId);
        const resp = await apiClient.put(`/api/workplans/${editingId}`, body);
        if (!resp.data?.ok) { toast.error(resp.data?.error || "Failed"); return; }
        toast.success("Draft saved");
        navigate(-1);
      } catch (e: any) { toast.error(e.message); }
      finally { setSubmitting(false); }
      return;
    }

    // New — create as draft via POST with status=draft
    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) { toast.error("Missing auth token"); return; }
      const { unitId: activeUnitId, superAdminExempt } = await resolveWorkPlanUnitContext();
      if (!superAdminExempt && !activeUnitId) {
        toast.error(UNIT_CONTEXT_RECOVERY);
        return;
      }

      const body = serialize(title, generalGoal, startDate, endDate, plans, "draft", activeUnitId);
      const resp = await apiClient.post("/api/workplans", body);
      if (!resp.data?.ok) { toast.error(resp.data?.error || "Failed"); return; }
      toast.success("Draft saved");
      navigate(-1);
    } catch (e: any) { toast.error(e.message); }
    finally { setSubmitting(false); }
  };


  // ------ Publish ------
  const publish = async () => {
    const errors = validateForm(title, generalGoal, startDate, endDate, plans);
    if (errors.length > 0) {
      setValidationErrors(errors);
      setShowValidationModal(true);
      return;
    }
    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) { toast.error("Missing auth token"); return; }
      const { unitId: activeUnitId, superAdminExempt } = await resolveWorkPlanUnitContext();
      if (!superAdminExempt && !activeUnitId) {
        toast.error(UNIT_CONTEXT_RECOVERY);
        return;
      }

      const body = serialize(title, generalGoal, startDate, endDate, plans, "pending", activeUnitId);
      let resp;
      
      // If publishing a local draft, first create as new then remove local draft
      if (isLocalDraft && editingId) {
        resp = await apiClient.post("/api/workplans", body);
        if (!resp.data?.ok) { toast.error(resp.data?.error || "Failed"); return; }
        await removeLocalDraft(editingId);
        toast.success("Work Plan published — pending review");
        navigate(`/work-plans/${resp.data.item._id}`, { replace: true });
        setSubmitting(false);
        return;
      }
      
      if (editingId) {
        resp = await apiClient.put(`/api/workplans/${editingId}`, body);
      } else {
        resp = await apiClient.post("/api/workplans", body);
      }
      if (!resp.data?.ok) { toast.error(resp.data?.error || "Failed"); return; }
      toast.success("Work Plan published — pending review");
      navigate(`/work-plans/${resp.data.item._id}`, { replace: true });
    } catch (e: any) { toast.error(e.message || "Connection failed"); }
    finally { setSubmitting(false); }
  };

  const isRejected = planStatus === "rejected";
  const isDraft = !planStatus || planStatus === "draft";
  const isNonDraftEdit = isEditMode && planStatus && planStatus !== "draft";

  return (
    <div className="min-h-screen bg-background dark:bg-dark-background pb-32">
      {/* Header */}
      <div className="bg-surface dark:bg-dark-surface border-b border-border dark:border-dark-border px-4 pt-10 pb-3 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-2xl bg-surface-alt dark:bg-dark-surface-alt flex items-center justify-center text-text-muted shrink-0"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-base font-black text-text-primary dark:text-dark-text-primary leading-tight">
            {isEditMode ? "Edit Work Plan" : "New Work Plan"}
          </h1>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-5 max-w-2xl mx-auto">
        {/* Load state */}
        {loadingExisting && (
          <p className="text-sm text-slate-400 font-medium animate-pulse">Loading...</p>
        )}
        {loadError && (
          <p className="text-sm text-red-500 font-bold">{loadError}</p>
        )}

        {/* Rejection banner */}
        {isRejected && rejectionReason && (
          <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl px-4 py-3">
            <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black text-red-500 uppercase tracking-widest mb-1">
                Plan was rejected — address the feedback below before resubmitting:
              </p>
              <p className="text-sm text-red-400 font-medium leading-relaxed">{rejectionReason}</p>
            </div>
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
            Title
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give this work plan a title"
            className="w-full h-[48px] px-4 rounded-xl bg-surface-alt dark:bg-dark-surface-alt border border-border dark:border-dark-border text-sm font-bold text-text-primary dark:text-dark-text-primary outline-none focus:border-primary/60 transition-colors"
          />
        </div>

        {/* Period */}
        <div>
          <label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
            Period
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-[48px] pl-9 pr-3 rounded-xl bg-surface-alt dark:bg-dark-surface-alt border border-border dark:border-dark-border text-xs font-bold text-text-primary dark:text-dark-text-primary outline-none focus:border-primary/60 transition-colors"
              />
            </div>
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-[48px] pl-9 pr-3 rounded-xl bg-surface-alt dark:bg-dark-surface-alt border border-border dark:border-dark-border text-xs font-bold text-text-primary dark:text-dark-text-primary outline-none focus:border-primary/60 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* General Goal */}
        <div>
          <label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
            General Goal
          </label>
          <textarea
            value={generalGoal}
            onChange={(e) => setGeneralGoal(e.target.value)}
            placeholder="Enter your general goal"
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-surface-alt dark:bg-dark-surface-alt border border-border dark:border-dark-border text-sm font-medium text-text-primary dark:text-dark-text-primary outline-none resize-none focus:border-primary/60 transition-colors"
          />
        </div>

        {/* Plans */}
        <div>
          <p className="text-sm font-black text-[#00204a] dark:text-white uppercase tracking-wider mb-3">
            Plans
          </p>
          <div className="space-y-3">
            {plans.map((pl, pIdx) => {
              const isExpanded = expandedPlans[pl.id] !== false;
              return (
                <div
                  key={pl.id}
                  className="border border-border dark:border-dark-border rounded-2xl overflow-hidden"
                >
                  {/* Plan header */}
                  <div className="flex items-center gap-2 px-4 py-3 bg-surface-alt dark:bg-dark-surface-alt">
                    <button
                      onClick={() =>
                        setExpandedPlans((e) => ({ ...e, [pl.id]: !isExpanded }))
                      }
                      className="flex items-center gap-2 flex-1 text-left"
                    >
                      <span className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest shrink-0">
                        Plan {pIdx + 1}
                      </span>
                      {isExpanded ? (
                        <ChevronUp size={14} className="text-gray-400 ml-auto" />
                      ) : (
                        <ChevronDown size={14} className="text-gray-400 ml-auto" />
                      )}
                    </button>
                    {plans.length > 1 && (
                      <button
                        onClick={() => removePlan(pl.id)}
                        className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-400 shrink-0"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="p-4 space-y-3">
                      <input
                        value={pl.title}
                        onChange={(e) => updatePlan(pl.id, { title: e.target.value })}
                        placeholder="Plan title / summary"
                        className="w-full h-[48px] px-4 rounded-xl bg-surface-alt dark:bg-dark-surface-alt border border-border dark:border-dark-border text-sm font-bold text-text-primary dark:text-dark-text-primary outline-none focus:border-primary/60 transition-colors"
                      />

                      {/* Activities */}
                      <p className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-2">Activities</p>
                      <div className="space-y-3">
                        {pl.activities.map((a, aIdx) => (
                          <div
                            key={a.id}
                            className="bg-surface-alt dark:bg-dark-surface-alt rounded-xl p-3 border border-border-light dark:border-dark-border-light space-y-3"
                          >
                            {/* Activity header */}
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                Activity {aIdx + 1}
                              </span>
                              {pl.activities.length > 1 && (
                                <button
                                  onClick={() => removeActivity(pl.id, a.id)}
                                  className="w-6 h-6 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-400"
                                >
                                  <X size={11} />
                                </button>
                              )}
                            </div>

                            <input
                              value={a.title}
                              onChange={(e) =>
                                updateActivity(pl.id, a.id, { title: e.target.value })
                              }
                              placeholder="Activity Title"
                              className="w-full h-[44px] px-3 rounded-lg bg-surface dark:bg-dark-surface border border-border dark:border-dark-border text-sm font-bold text-text-primary dark:text-dark-text-primary outline-none focus:border-primary/60 transition-colors"
                            />

                            <textarea
                              value={a.description}
                              onChange={(e) =>
                                updateActivity(pl.id, a.id, { description: e.target.value })
                              }
                              placeholder="Description"
                              rows={2}
                              className="w-full px-3 py-2.5 rounded-lg bg-surface dark:bg-dark-surface border border-border dark:border-dark-border text-sm font-medium text-text-primary dark:text-dark-text-primary outline-none resize-none focus:border-primary/60 transition-colors"
                            />

                            {/* Resources chips */}
                            <div>
                              <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
                                Resources
                              </p>
                              {a.resourcesArr.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-2">
                                  {a.resourcesArr.map((chip) => (
                                    <span
                                      key={chip}
                                      className="flex items-center gap-1.5 px-3 py-1 bg-[#e2f4fa] dark:bg-[#349DC5]/20 text-[#0f172a] dark:text-[#349DC5] rounded-full text-xs font-bold"
                                    >
                                      <Tag size={10} />
                                      {chip}
                                      <button
                                        onClick={() => removeResourceChip(pl.id, a.id, chip)}
                                        className="ml-0.5 opacity-60 hover:opacity-100"
                                      >
                                        <X size={10} />
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              )}
                              <input
                                ref={(el) => { resourceInputRefs.current[a.id] = el; }}
                                value={a.resources}
                                onChange={(e) =>
                                  updateActivity(pl.id, a.id, { resources: e.target.value })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    addResourceChip(pl.id, a.id, a.resources);
                                  }
                                }}
                                placeholder="Type a resource and press Enter"
                                className="w-full h-[44px] px-3 rounded-lg bg-surface dark:bg-dark-surface border border-border dark:border-dark-border text-sm text-text-primary dark:text-dark-text-primary outline-none focus:border-primary/60 transition-colors"
                              />
                            </div>

                          </div>
                        ))}
                      </div>

                      {/* Add Activity */}
                      <button
                        onClick={() => addActivity(pl.id)}
                        className="w-full h-[44px] rounded-xl border-2 border-dashed border-primary/40 flex items-center justify-center gap-2 text-xs font-black text-primary hover:border-primary hover:bg-primary/5 transition-colors"
                      >
                        <Plus size={14} /> Add Activity
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add Plan */}
          <button
            onClick={addPlan}
            className="mt-3 w-full h-[48px] rounded-xl border-2 border-dashed border-border dark:border-dark-border flex items-center justify-center gap-2 text-xs font-black text-text-muted hover:border-primary hover:text-primary transition-colors"
          >
            <Plus size={14} /> Add Another Plan
          </button>
        </div>
      </div>

      {/* Footer Action Buttons — Fixed */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-surface dark:bg-dark-surface border-t border-border dark:border-dark-border px-4 pb-safe pt-3 flex gap-3 max-w-2xl mx-auto">
        {/* New plan or editing draft: show Save Draft + Publish */}
        {(!isEditMode || isDraft) && !isNonDraftEdit && (
          <>
            <button
              disabled={submitting}
              onClick={submit}
              className="flex-1 h-[48px] rounded-2xl bg-surface-alt dark:bg-dark-surface-alt text-text-primary dark:text-dark-text-primary font-black text-xs uppercase tracking-wider disabled:opacity-50 active:scale-95 transition-all border border-border dark:border-dark-border"
            >
              {submitting ? "Saving..." : isEditMode ? "Save Changes" : "Save Draft"}
            </button>
            <button
              disabled={submitting}
              onClick={publish}
              className="flex-1 h-[48px] rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-primary/20 disabled:opacity-50 active:scale-95 transition-all"
            >
              {submitting ? "Publishing..." : "Publish"}
            </button>
          </>
        )}

        {/* Editing non-draft (pending/rejected): single action button */}
        {isNonDraftEdit && (
          <button
            disabled={submitting}
            onClick={submit}
            className={cn(
               "flex-1 h-[48px] rounded-2xl text-white font-black text-xs uppercase tracking-wider shadow-lg disabled:opacity-50 active:scale-95 transition-all",
               isRejected ? "bg-red-600" : "bg-primary"
            )}
          >
            {submitting
              ? isRejected ? "Resubmitting..." : "Saving..."
              : isRejected ? "Save & Resubmit" : "Save Changes"}
          </button>
        )}
      </div>

      {/* Validation Error Modal */}
      <AnimatePresence>
        {showValidationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowValidationModal(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-surface dark:bg-dark-surface rounded-3xl overflow-hidden shadow-2xl border border-border dark:border-dark-border"
            >
              {/* Header */}
              <div className="flex items-start gap-3 px-5 pt-6 pb-4 border-b border-gray-50 dark:border-white/5">
                <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                  <AlertCircle size={20} className="text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-[#0f172a] dark:text-white">Incomplete Form</p>
                  <p className="text-xs font-medium text-gray-400 mt-0.5">
                    Please fill in all required fields before submitting.
                  </p>
                </div>
                <button
                  onClick={() => setShowValidationModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Error list */}
              <div className="px-5 py-4 max-h-60 overflow-y-auto space-y-2">
                {validationErrors.map((err, i) => {
                  const isNested = err.includes("›");
                  return (
                    <div
                      key={i}
                      className={`flex items-start gap-2.5 ${isNested ? "pl-3" : ""}`}
                    >
                      <div
                        className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                          isNested ? "bg-amber-500" : "bg-red-500"
                        }`}
                      />
                      <p
                        className={`text-xs font-medium leading-relaxed ${
                          isNested
                            ? "text-amber-700 dark:text-amber-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {err}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Dismiss */}
              <div className="px-5 pb-6 pt-2">
                <button
                  onClick={() => setShowValidationModal(false)}
                  className="w-full py-3.5 bg-[#349DC5] text-white rounded-2xl font-black text-xs uppercase tracking-wider"
                >
                  Got it
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
