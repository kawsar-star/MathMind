import React, { useState } from 'react';
import { Check, Shield, Sliders, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { DEFAULT_AGE_BANDS } from '../../data/domainsAndCurriculum';
import {
  getDomainLabel,
  getRoleLabel,
  getValidationStatusLabel,
  toBnNum,
} from '../../i18n/translations';
import {
  adminUpdateUserRole,
  saveCurriculumConfig,
  saveSystemSettings,
  updateQuestionStatus,
  writeAuditLog,
} from '../../services/firestoreService';
import { UserRole } from '../../types/mathmind';
import { getLocalizedQuestion } from '../../utils/mathUtils';
import { MathRenderer } from '../common/MathRenderer';
import { useToast } from '../common/ToastContext';

interface AdminPortalProps {
  mode: 'school_admin' | 'super_admin';
  initialTab?: 'overview' | 'users' | 'curriculum' | 'settings' | 'review' | 'audit';
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ mode, initialTab = 'overview' }) => {
  const {
    firebaseUser,
    allUsers,
    curricula,
    systemSettings,
    customQuestions,
    auditLogs,
    classes,
    language,
    studyMedium,
  } = useAuth();
  const { showToast } = useToast();

  const [tab, setTab] = useState<'overview' | 'users' | 'curriculum' | 'settings' | 'review' | 'audit'>(initialTab);

  // Threshold form state
  const [reTeach, setReTeach] = useState(systemSettings.reTeachThreshold);
  const [guided, setGuided] = useState(systemSettings.guidedThreshold);
  const [mastery, setMastery] = useState(systemSettings.masteryThreshold);
  const [aiLimit, setAiLimit] = useState(systemSettings.aiDailyLimitPerStudent);
  const [ageBandsText, setAgeBandsText] = useState((systemSettings.ageBands || DEFAULT_AGE_BANDS).join(', '));

  // Curriculum upload/config state
  const [currName, setCurrName] = useState('NCTB Bangladesh — Verified Mathematics');
  const [currCountry, setCurrCountry] = useState('Bangladesh');
  const [currNotes, setCurrNotes] = useState('Administrator-verified curriculum mapping.');

  const pendingQuestions = customQuestions.filter((q) => q.validationStatus === 'pending_review');

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    try {
      const bands = ageBandsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      await saveSystemSettings(firebaseUser.uid, {
        reTeachThreshold: Number(reTeach),
        guidedThreshold: Number(guided),
        masteryThreshold: Number(mastery),
        aiDailyLimitPerStudent: Number(aiLimit),
        ageBands: bands,
      });
      await writeAuditLog(
        firebaseUser.uid,
        'UPDATE_SYSTEM_SETTINGS',
        'systemSettings',
        `Updated mastery threshold to ${mastery}% and AI daily limit to ${aiLimit}`,
        'global'
      );
      showToast(
        language === 'bn'
          ? 'সিস্টেম মূল্যায়ন ও এআই মানদণ্ড সংরক্ষণ করা হয়েছে।'
          : 'System assessment & AI thresholds saved.',
        'success'
      );
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : language === 'bn'
          ? 'সিস্টেম সেটিংস সংরক্ষণ করা যায়নি।'
          : 'Failed to save system settings.';
      showToast(msg, 'error');
    }
  };

  const handleAddCurriculum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !currName.trim()) return;
    try {
      await saveCurriculumConfig(firebaseUser.uid, {
        name: currName.trim(),
        country: currCountry.trim(),
        status: 'active',
        verifiedByAdmin: true,
        notes: currNotes.trim(),
      });
      showToast(
        language === 'bn'
          ? 'যাচাইকৃত পাঠ্যক্রম সংরক্ষণ করা হয়েছে।'
          : 'Verified curriculum record saved.',
        'success'
      );
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : language === 'bn'
          ? 'পাঠ্যক্রম সংরক্ষণ করা যায়নি।'
          : 'Failed to save curriculum.';
      showToast(msg, 'error');
    }
  };

  const handleRoleChange = async (uid: string, role: UserRole) => {
    if (!firebaseUser) return;
    try {
      await adminUpdateUserRole(uid, role);
      await writeAuditLog(firebaseUser.uid, 'UPDATE_USER_ROLE', 'user', `Changed role to ${role}`, uid);
      showToast(
        language === 'bn'
          ? `ব্যবহারকারীর ভূমিকা "${getRoleLabel(role, 'bn')}" করা হয়েছে।`
          : `User role updated to ${role}.`,
        'success'
      );
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : language === 'bn'
          ? 'ভূমিকা পরিবর্তন করা যায়নি।'
          : 'Failed to update role.';
      showToast(msg, 'error');
    }
  };

  const handleModerateQuestion = async (qId: string, status: 'approved' | 'rejected') => {
    if (!firebaseUser) return;
    try {
      await updateQuestionStatus(qId, status);
      await writeAuditLog(firebaseUser.uid, 'MODERATE_QUESTION', 'question', `Set status ${status}`, qId);
      showToast(
        language === 'bn'
          ? `প্রশ্নটি "${getValidationStatusLabel(status, 'bn')}" করা হয়েছে।`
          : `Question marked ${status}.`,
        'success'
      );
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : language === 'bn'
          ? 'প্রশ্ন পর্যালোচনা ব্যর্থ হয়েছে।'
          : 'Moderation failed.';
      showToast(msg, 'error');
    }
  };

  const isBn = language === 'bn';

  return (
    <div className="space-y-6">
      <div className="p-5 sm:p-6 rounded-2xl border student-hero-gradient flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 mb-1">
            {mode === 'super_admin'
              ? isBn
                ? 'সুপার অ্যাডমিন কন্ট্রোল প্যানেল'
                : 'Super Administrator Control Plane'
              : isBn
              ? 'স্কুল অ্যাডমিন বিশ্লেষণ ও পরিচালনা'
              : 'School Administrator Analytics & Governance'}
          </p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display">
            {isBn ? 'প্ল্যাটফর্ম পরিচালনা, পাঠ্যক্রম ও নিরাপত্তা' : 'Platform Governance, Curriculum & Security'}
          </h1>
        </div>

        <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-white/75 dark:bg-slate-900/75 border border-cyan-500/25">
          {[
            { id: 'overview', label: isBn ? 'সারসংক্ষেপ' : 'Overview' },
            { id: 'users', label: isBn ? 'ব্যবহারকারী ও ভূমিকা' : 'Users & Roles' },
            { id: 'curriculum', label: isBn ? 'পাঠ্যক্রম' : 'Curricula' },
            { id: 'settings', label: isBn ? 'মানদণ্ড ও এআই' : 'Thresholds & AI' },
            {
              id: 'review',
              label: isBn
                ? `পর্যালোচনা (${toBnNum(pendingQuestions.length, 'bn')})`
                : `Review (${pendingQuestions.length})`,
            },
            { id: 'audit', label: isBn ? 'অডিট লগ' : 'Audit Logs' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                tab === t.id
                  ? 'bg-gradient-to-r from-cyan-500 to-violet-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl border border-sky-500/25 bg-gradient-to-br from-sky-500/10 to-cyan-500/5 glass-panel-3d">
            <div className="text-xs text-slate-600 dark:text-slate-300">{isBn ? 'নিবন্ধিত ব্যবহারকারী' : 'Registered Users'}</div>
            <div className="text-3xl font-bold font-mono tabular-nums text-sky-600 dark:text-sky-400 mt-1">
              {toBnNum(allUsers.length, language)}
            </div>
          </div>
          <div className="p-5 rounded-xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 glass-panel-3d">
            <div className="text-xs text-slate-600 dark:text-slate-300">{isBn ? 'সক্রিয় শ্রেণি' : 'Active Classes'}</div>
            <div className="text-3xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
              {toBnNum(classes.length, language)}
            </div>
          </div>
          <div className="p-5 rounded-xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 to-orange-500/5 glass-panel-3d">
            <div className="text-xs text-slate-600 dark:text-slate-300">{isBn ? 'অপেক্ষমান প্রশ্ন' : 'Pending Question Reviews'}</div>
            <div className="text-3xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400 mt-1">
              {toBnNum(pendingQuestions.length, language)}
            </div>
          </div>
          <div className="p-5 rounded-xl border border-violet-500/25 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/5 glass-panel-3d">
            <div className="text-xs text-slate-600 dark:text-slate-300">{isBn ? 'অডিট ইভেন্ট' : 'Recorded Audit Events'}</div>
            <div className="text-3xl font-bold font-mono tabular-nums text-violet-600 dark:text-violet-400 mt-1">
              {toBnNum(auditLogs.length, language)}
            </div>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="rounded-2xl border glass-panel-3d overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500">
                <tr>
                  <th className="py-3 px-4">{isBn ? 'নাম' : 'Display Name'}</th>
                  <th className="py-3 px-4">UID</th>
                  <th className="py-3 px-4">XP</th>
                  <th className="py-3 px-4">{isBn ? 'ভূমিকা নির্ধারণ' : 'Role Assignment'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {allUsers.map((u) => (
                  <tr key={u.uid}>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">{u.displayName}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{u.uid.slice(0, 12)}...</td>
                    <td className="py-3 px-4 font-mono tabular-nums">{toBnNum(u.xp, language)}</td>
                    <td className="py-3 px-4">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.uid, e.target.value as UserRole)}
                        className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
                      >
                        {(['student', 'teacher', 'parent', 'school_admin', 'super_admin'] as UserRole[]).map((role) => (
                          <option key={role} value={role}>
                            {getRoleLabel(role, language)}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'curriculum' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleAddCurriculum}
            className="lg:col-span-5 p-6 rounded-2xl border glass-panel-3d space-y-4 h-fit"
          >
            <h3 className="text-sm font-semibold">
              {isBn ? 'যাচাইকৃত পাঠ্যক্রম যোগ করুন' : 'Add Verified Curriculum Mapping'}
            </h3>
            <p className="text-xs text-slate-500">
              {isBn
                ? 'শুধুমাত্র অ্যাডমিন কর্তৃক যাচাইকৃত পাঠ্যক্রমগুলো আনুষ্ঠানিক ফলাফলে ব্যবহৃত হয়।'
                : 'Only administrator-uploaded and verified curriculum outcomes are treated as official curriculum mappings.'}
            </p>
            <input
              type="text"
              required
              value={currName}
              onChange={(e) => setCurrName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
            />
            <input
              type="text"
              value={currCountry}
              onChange={(e) => setCurrCountry(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
            />
            <textarea
              rows={3}
              value={currNotes}
              onChange={(e) => setCurrNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
            />
            <button type="submit" className="w-full py-2.5 rounded-xl glass-btn-3d text-white text-xs font-semibold">
              {isBn ? 'পাঠ্যক্রম সংরক্ষণ করুন' : 'Save Verified Curriculum'}
            </button>
          </form>
          <div className="lg:col-span-7 space-y-3">
            {curricula.map((c) => (
              <div key={c.id} className="p-4 rounded-xl border glass-panel-3d">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">{c.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {c.country} · {c.verifiedByAdmin ? (isBn ? 'অ্যাডমিন যাচাইকৃত' : 'Verified by Admin') : isBn ? 'অযাচাইকৃত' : 'Unverified'} ·{' '}
                  {getValidationStatusLabel(c.status, language)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <form
          onSubmit={handleSaveSettings}
          className="max-w-2xl p-6 rounded-2xl border glass-panel-3d space-y-4"
        >
          <h3 className="text-base font-bold flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-500" />
            {isBn ? 'দক্ষতা মানদণ্ড ও এআই ব্যবহারের সীমা' : 'Configurable Mastery Thresholds & AI Usage Limits'}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">{isBn ? 'পুনঃশিক্ষা (<%)' : 'Re-Teach (<%)'}</label>
              <input type="number" value={reTeach} onChange={(e) => setReTeach(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">{isBn ? 'গাইডেড (<%)' : 'Guided (<%)'}</label>
              <input type="number" value={guided} onChange={(e) => setGuided(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">{isBn ? 'দক্ষতা (≥%)' : 'Mastery (≥%)'}</label>
              <input type="number" value={mastery} onChange={(e) => setMastery(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">{isBn ? 'দৈনিক এআই সীমা' : 'AI Limit / Day'}</label>
              <input type="number" value={aiLimit} onChange={(e) => setAiLimit(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">
              {isBn ? 'বয়স সীমা (কমা দিয়ে পৃথক)' : 'Age Bands (comma separated)'}
            </label>
            <input type="text" value={ageBandsText} onChange={(e) => setAgeBandsText(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs" />
          </div>
          <button type="submit" className="px-5 py-2.5 rounded-xl glass-btn-3d text-white text-xs font-semibold">
            {isBn ? 'কনফিগারেশন সংরক্ষণ করুন' : 'Save Global Configuration'}
          </button>
        </form>
      )}

      {tab === 'review' && (
        <div className="space-y-3">
          {pendingQuestions.length === 0 ? (
            <div className="p-8 rounded-2xl border glass-panel-3d text-center text-sm text-slate-500">
              {isBn ? 'পর্যালোচনার জন্য কোনো অপেক্ষমান প্রশ্ন নেই।' : 'No AI-generated or teacher-authored questions pending content review.'}
            </div>
          ) : (
            pendingQuestions.map((q) => {
              const loc = getLocalizedQuestion(q, language, studyMedium);
              const sourceLabel = isBn
                ? q.source === 'ai_generated'
                  ? 'এআই-তৈরি'
                  : q.source === 'teacher_authored'
                  ? 'শিক্ষক-প্রণীত'
                  : 'পাঠ্যক্রম'
                : q.source;
              return (
              <div key={q.id} className="p-4 rounded-xl border glass-panel-3d flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1 max-w-2xl">
                  <div className="text-xs text-slate-500">
                    {getDomainLabel(q.domain, language)} · {q.subskill} · {sourceLabel}
                  </div>
                  <div className="text-sm font-medium text-slate-900 dark:text-white">
                    <MathRenderer content={loc.prompt} />
                  </div>
                  <div className="text-xs font-mono text-emerald-500">
                    {language === 'bn' ? 'উত্তর: ' : 'Answer: '}
                    {loc.correctAnswer}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleModerateQuestion(q.id, 'approved')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {isBn ? 'অনুমোদন' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleModerateQuestion(q.id, 'rejected')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold"
                  >
                    <X className="w-3.5 h-3.5" />
                    {isBn ? 'বাতিল' : 'Reject'}
                  </button>
                </div>
              </div>
              );
            })
          )}
        </div>
      )}

      {tab === 'audit' && (
        <div className="rounded-2xl border glass-panel-3d overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-500" />
            <h3 className="text-sm font-semibold">
              {isBn ? 'নিরাপত্তা ও একাডেমিক অডিট লগ' : 'Immutable Security & Academic Audit Log'}
            </h3>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3.5 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-mono font-semibold text-cyan-500 mr-2">{log.action}</span>
                  <span className="text-slate-700 dark:text-slate-300">{log.details}</span>
                </div>
                <span className="font-mono text-slate-500">
                  {isBn ? 'ব্যবহারকারী:' : 'Actor:'} {log.actorUid.slice(0, 10)}...
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
