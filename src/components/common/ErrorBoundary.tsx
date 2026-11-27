import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || 'An unexpected error occurred.' };
  }

  componentDidCatch(error: Error) {
    console.error('MATHMIND AI Boundary caught:', error);
  }

  render() {
    if (this.state.hasError) {
      let isBn = false;
      try {
        isBn =
          typeof window !== 'undefined' &&
          window.localStorage.getItem('mathmind_lang') === 'bn';
      } catch {
        isBn = false;
      }

      let friendly = this.state.message;
      let hint: string | null = null;
      if (friendly.startsWith('{') && friendly.includes('operationType')) {
        try {
          const parsed = JSON.parse(friendly);
          friendly = isBn
            ? `ডেটাবেস ত্রুটি (${parsed.operationType} · ${parsed.path || 'record'}): ${parsed.error}`
            : `Database access error during ${parsed.operationType} on ${parsed.path || 'record'}: ${parsed.error}`;
          const lower = String(parsed.error || '').toLowerCase();
          if (lower.includes('permission') || lower.includes('insufficient')) {
            hint = isBn
              ? 'নিজস্ব Firebase প্রজেক্ট সংযুক্ত করলে অনুগ্রহ করে firestore.rules ডিপ্লয় করুন।'
              : 'If you connected your own Firebase project, make sure firestore.rules is deployed (npx firebase deploy --only firestore:rules).';
          } else if (lower.includes('not found') || lower.includes('database')) {
            hint = isBn
              ? 'নিজস্ব Firebase প্রজেক্ট হলে Cloud Firestore চালু করুন এবং VITE_FIREBASE_DATABASE_ID খালি রাখুন।'
              : 'If using your own Firebase project, enable Cloud Firestore and leave VITE_FIREBASE_DATABASE_ID empty for the (default) database.';
          } else if (lower.includes('index')) {
            hint = isBn
              ? 'Firestore কুয়েরি ইনডেক্স আপডেট হচ্ছে; অনুগ্রহ করে কিছুক্ষণ পর আবার রিলোড করুন।'
              : 'A Firestore query index is updating; please reload in a moment.';
          }
        } catch {
          // keep original
        }
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#070B14] p-6">
          <div className="max-w-lg w-full rounded-2xl border border-rose-500/30 glass-panel-3d p-6 shadow-sm">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-3">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h2 className="text-lg font-semibold">
                {isBn ? 'অ্যাপ্লিকেশন ত্রুটি' : 'Application Error'}
              </h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-3 break-words">{friendly}</p>
            {hint && (
              <p className="text-xs text-amber-600 dark:text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-5">
                {hint}
              </p>
            )}
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl glass-btn-3d text-white text-sm font-medium transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              {isBn ? 'পুনরায় লোড করুন' : 'Reload Application'}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
