import { useEffect, useMemo, useState } from "react";
import { CheckCircle, Loader, MessageSquareText } from "lucide-react";
import { getErrorMessage } from "../../services/api";
import { getPublicFormContext, submitPublicFeedback } from "../../services/publicFeedback";
import type { PublicFormContextDto } from "../../types/publicFeedback";

export function PublicFeedbackPage({ token }: { token: string }) {
  const [form, setForm] = useState<PublicFormContextDto | null>(null);
  const [content, setContent] = useState("");
  const [userSegment, setUserSegment] = useState("");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submissionKey = useMemo(() => crypto.randomUUID(), []);

  useEffect(() => {
    getPublicFormContext(token)
      .then(setForm)
      .catch((reason) => setError(getErrorMessage(reason, "This feedback form is unavailable.")))
      .finally(() => setLoading(false));
  }, [token]);

  const submit = async () => {
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitPublicFeedback(token, {
        content: content.trim(),
        user_segment: userSegment.trim() || null,
        context: context.trim() || null,
        feedback_date: new Date().toISOString(),
        submission_key: submissionKey,
      });
      setSubmitted(true);
    } catch (reason) {
      setError(getErrorMessage(reason, "Unable to submit feedback."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <main className="min-h-screen grid place-items-center" style={{ background: "#F8FAFC" }}><Loader className="animate-spin" /></main>;
  }

  return (
    <main className="min-h-screen px-4 py-10" style={{ background: "#F8FAFC", fontFamily: "var(--font-sans)" }}>
      <div className="mx-auto max-w-xl rounded-2xl border bg-white shadow-sm" style={{ borderColor: "#E2E8F0" }}>
        {error && !form ? (
          <div className="p-8 text-center"><p className="font-semibold text-red-700">Form unavailable</p><p className="mt-2 text-sm text-slate-500">{error}</p></div>
        ) : submitted ? (
          <div className="flex flex-col items-center p-12 text-center">
            <CheckCircle size={44} className="text-emerald-600" />
            <h1 className="mt-4 text-xl font-semibold">Thank you for your feedback</h1>
            <p className="mt-2 text-sm text-slate-500">Your response has been securely submitted.</p>
          </div>
        ) : form ? (
          <>
            <header className="border-b p-6" style={{ borderColor: "#E2E8F0" }}>
              <div className="mb-3 flex items-center gap-3"><span className="rounded-xl bg-blue-900 p-2 text-white"><MessageSquareText size={20} /></span><div><p className="text-sm text-slate-500">{form.product_name || form.project_name}</p><h1 className="text-xl font-semibold text-slate-900">{form.title}</h1></div></div>
              {form.description && <p className="text-sm leading-6 text-slate-600">{form.description}</p>}
            </header>
            <div className="space-y-5 p-6">
              <label className="block text-sm font-medium text-slate-700">Your feedback *<textarea value={content} onChange={(event) => setContent(event.target.value)} rows={5} maxLength={10000} className="mt-2 w-full resize-none rounded-lg border p-3 font-normal outline-none focus:border-blue-800" placeholder="Tell us what happened and what you expected..." /></label>
              {form.allowed_metadata_options.includes("user_segment") && <label className="block text-sm font-medium text-slate-700">Your role or user segment<input value={userSegment} onChange={(event) => setUserSegment(event.target.value)} maxLength={255} className="mt-2 w-full rounded-lg border p-3 font-normal outline-none focus:border-blue-800" placeholder="e.g. Student, administrator" /></label>}
              {form.allowed_metadata_options.includes("context") && <label className="block text-sm font-medium text-slate-700">Where did this happen?<input value={context} onChange={(event) => setContext(event.target.value)} maxLength={5000} className="mt-2 w-full rounded-lg border p-3 font-normal outline-none focus:border-blue-800" placeholder="Page, feature, or workflow" /></label>}
              {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
              <button onClick={() => void submit()} disabled={!content.trim() || submitting} className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-900 py-3 text-sm font-semibold text-white disabled:opacity-50">{submitting && <Loader size={15} className="animate-spin" />}{submitting ? "Submitting..." : "Submit feedback"}</button>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
