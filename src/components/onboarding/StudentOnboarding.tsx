import React, { useEffect, useState } from 'react';
import { GraduationCap, UserCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { DEFAULT_CURRICULA, GRADE_OPTIONS } from '../../data/domainsAndCurriculum';
import {
  formatNum,
  getAgeBandLabel,
  getCurriculumLabel,
  getGradeLabel,
} from '../../i18n/translations';
import { upsertStudentProfile, writeAuditLog } from '../../services/firestoreService';
import { StudyMedium } from '../../types/mathmind';
import { calculateAgeFromDob, mapAgeToBand } from '../../utils/mathUtils';
import { useToast } from '../common/ToastContext';

interface OnboardingProps {
  onComplete?: () => void;
  isEditing?: boolean;
}

export const StudentOnboarding: React.FC<OnboardingProps> = ({ onComplete, isEditing = false }) => {
  const {
    firebaseUser,
    userAccount,
    studentProfile,
    language,
    setLanguage,
    studyMedium,
    setStudyMedium,
  } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState(studentProfile?.name || firebaseUser?.displayName || '');
  const [studentCode, setStudentCode] = useState(
    studentProfile?.studentCode || `MM-${Math.floor(100000 + Math.random() * 900000)}`
  );
  const [dob, setDob] = useState(studentProfile?.dob || '2019-05-15');
  const [grade, setGrade] = useState(studentProfile?.grade || 'Grade 1');
  const [schoolName, setSchoolName] = useState(studentProfile?.schoolName || '');
  const [medium, setMedium] = useState<StudyMedium>(
    studentProfile?.studyMedium || studyMedium || 'bangla_medium'
  );
  const [curriculum, setCurriculum] = useState(
    studentProfile?.curriculum ||
      (medium === 'bangla_medium'
        ? 'NCTB Bangladesh (Bangla Medium)'
        : 'NCTB Bangladesh (English Version)')
  );
  const [prefLang, setPrefLang] = useState<'en' | 'bn'>(
    studentProfile?.preferredLanguage || (medium === 'bangla_medium' ? 'bn' : language)
  );
  const [priorExperience, setPriorExperience] = useState(
    studentProfile?.priorExperience ||
      ((studentProfile?.preferredLanguage || (medium === 'bangla_medium' ? 'bn' : language)) === 'bn'
        ? 'প্রাথমিক সংখ্যা, জ্যামিতিক আকৃতি ও দৈনন্দিন গণিত শিখছি।'
        : 'Learning foundational numbers, shapes, and everyday math.')
  );
  const [guardianConsent, setGuardianConsent] = useState(true);
  const [saving, setSaving] = useState(false);

  const computedAge = calculateAgeFromDob(dob);
  const computedBand = mapAgeToBand(computedAge);

  useEffect(() => {
    if (studentProfile) {
      setName(studentProfile.name);
      setStudentCode(studentProfile.studentCode);
      setDob(studentProfile.dob);
      setGrade(studentProfile.grade);
      setSchoolName(studentProfile.schoolName || '');
      setCurriculum(studentProfile.curriculum);
      setPrefLang(studentProfile.preferredLanguage);
      setMedium(
        studentProfile.studyMedium ||
          (studentProfile.preferredLanguage === 'bn' ? 'bangla_medium' : 'english_version')
      );
      setPriorExperience(studentProfile.priorExperience || '');
    }
  }, [studentProfile]);

  const handleSelectMedium = (next: StudyMedium) => {
    setMedium(next);
    setPrefLang(next === 'bangla_medium' ? 'bn' : 'en');
    if (curriculum.startsWith('NCTB Bangladesh')) {
      setCurriculum(
        next === 'bangla_medium'
          ? 'NCTB Bangladesh (Bangla Medium)'
          : 'NCTB Bangladesh (English Version)'
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    if (!name.trim() || !studentCode.trim() || !dob) {
      showToast(
        prefLang === 'bn'
          ? 'অনুগ্রহ করে প্রোফাইলের সব প্রয়োজনীয় ঘর পূরণ করুন।'
          : 'Please complete all required profile fields.',
        'error'
      );
      return;
    }
    if (!guardianConsent) {
      showToast(
        prefLang === 'bn'
          ? 'শেখার তথ্য সংরক্ষণের জন্য শিক্ষার্থী বা অভিভাবকের সম্মতি নিশ্চিত করুন।'
          : 'Please confirm student/guardian consent to store learning records.',
        'error'
      );
      return;
    }

    setSaving(true);
    try {
      await upsertStudentProfile(
        firebaseUser.uid,
        {
          studentCode: studentCode.trim().replace(/[^a-zA-Z0-9_-]/g, '-'),
          name: name.trim().slice(0, 120),
          dob,
          age: computedAge,
          ageBand: computedBand,
          grade,
          schoolName: schoolName.trim().slice(0, 160),
          curriculum,
          preferredLanguage: prefLang,
          studyMedium: medium,
          priorExperience: priorExperience.trim().slice(0, 500),
          overallScore: studentProfile?.overallScore ?? 0,
          competencyCategory: studentProfile?.competencyCategory ?? 'Beginner',
          xp: studentProfile?.xp ?? userAccount?.xp ?? 0,
          streak: studentProfile?.streak ?? userAccount?.streak ?? 0,
          longestStreak: studentProfile?.longestStreak ?? userAccount?.longestStreak ?? 0,
          ...(studentProfile?.lastActiveDate
            ? { lastActiveDate: studentProfile.lastActiveDate }
            : userAccount?.lastActiveDate
            ? { lastActiveDate: userAccount.lastActiveDate }
            : {}),
          weeklyGoalMinutes: studentProfile?.weeklyGoalMinutes ?? 120,
          completedMinutes: studentProfile?.completedMinutes ?? 0,
        },
        !studentProfile
      );
      setStudyMedium(medium);
      setLanguage(prefLang);
      await writeAuditLog(
        firebaseUser.uid,
        studentProfile ? 'UPDATE_STUDENT_PROFILE' : 'COMPLETE_ONBOARDING',
        'studentProfile',
        `Saved profile for ${grade} (${computedBand}), medium ${medium}, curriculum ${curriculum}`,
        firebaseUser.uid
      );
      showToast(
        prefLang === 'bn'
          ? 'শিক্ষার্থীর একাডেমিক প্রোফাইল সফলভাবে সংরক্ষিত হয়েছে।'
          : 'Student academic profile saved to Firestore.',
        'success'
      );
      onComplete?.();
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : prefLang === 'bn'
          ? 'প্রোফাইল সংরক্ষণ করা যায়নি।'
          : 'Failed to save profile.';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="rounded-2xl border glass-panel-3d p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4 pb-6 mb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <p className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 mb-1">
              {isEditing
                ? prefLang === 'bn'
                  ? 'শিক্ষার্থীর প্রোফাইল সেটিংস'
                  : 'Academic Profile Settings'
                : prefLang === 'bn'
                ? 'ধাপ ১ · শিক্ষার্থীর প্রাথমিক তথ্য'
                : 'Step 1 · Student Academic Onboarding'}
            </p>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-display">
              {prefLang === 'bn'
                ? 'শিক্ষার্থীর গণিত প্রোফাইল সেটআপ'
                : 'Personalize Your Mathematical Journey'}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {prefLang === 'bn'
                ? isEditing
                  ? 'বয়স, শ্রেণি এবং বাংলা মাধ্যম বা ইংলিশ ভার্সন অনুযায়ী প্রশ্ন ও ডোমেইন সাজানো হবে।'
                  : 'বয়স ও শ্রেণি সংরক্ষণ করার পরই আপনার বয়স অনুযায়ী ১০০টি MCQ-এর ১০০ নম্বরের স্মার্ট দক্ষতা যাচাই টেস্ট শুরু হবে।'
                : isEditing
                ? 'Age, grade, and study medium customize your math domains, NCTB difficulty tiers, and practice sets.'
                : 'Right after saving your age and class, you will take a smart 100-MCQ (100-mark) diagnostic test to uncover your skill level, weak areas, and tailored practice guide.'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-indigo-500 flex items-center justify-center shadow-md shrink-0">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Bangla Medium & English Version Switch Panel */}
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/8 via-cyan-500/8 to-indigo-500/8">
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-2">
              {prefLang === 'bn'
                ? 'শিক্ষার মাধ্যম নির্বাচন করুন (Medium Switch Panel)'
                : 'Study Medium & Version Switch Panel'}
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleSelectMedium('bangla_medium')}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  medium === 'bangla_medium'
                    ? 'border-emerald-500 bg-white dark:bg-slate-800 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/50'
                }`}
              >
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">বাংলা মাধ্যম</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {prefLang === 'bn'
                    ? 'এনসিটিবি (NCTB) বাংলা প্রশ্ন, ব্যাখ্যা ও নির্দেশনা'
                    : 'NCTB Bangla questions, hints & guidance'}
                </p>
              </button>
              <button
                type="button"
                onClick={() => handleSelectMedium('english_version')}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  medium === 'english_version'
                    ? 'border-cyan-500 bg-white dark:bg-slate-800 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/50'
                }`}
              >
                <p className="text-sm font-bold text-cyan-700 dark:text-cyan-300">English Version</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {prefLang === 'bn'
                    ? 'এনসিটিবি ইংলিশ ভার্সন ও আন্তর্জাতিক পাঠ্যক্রম'
                    : 'NCTB English Version / International Track'}
                </p>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {prefLang === 'bn' ? 'শিক্ষার্থীর পুরো নাম' : 'Student Full Name'}
              </label>
              <input
                type="text"
                required
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/70 text-sm focus:outline-none focus:border-cyan-500"
                placeholder={prefLang === 'bn' ? 'যেমন: নাফিসা চৌধুরী' : 'e.g., Nafisa Chowdhury'}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {prefLang === 'bn' ? 'শিক্ষার্থী আইডি (Student ID)' : 'Unique Student ID'}
              </label>
              <input
                type="text"
                required
                maxLength={40}
                value={studentCode}
                onChange={(e) => setStudentCode(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/70 text-sm font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {prefLang === 'bn' ? 'জন্ম তারিখ' : 'Date of Birth'}
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/70 text-sm font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {prefLang === 'bn' ? 'বয়স ও বয়স-স্তর' : 'Calculated Age & Band'}
              </label>
              <div className="px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/40 text-sm font-mono tabular-nums flex items-center justify-between">
                <span>
                  {formatNum(computedAge, prefLang)} {prefLang === 'bn' ? 'বছর' : 'yrs'}
                </span>
                <span className="text-cyan-600 dark:text-cyan-400 text-xs">
                  {getAgeBandLabel(computedBand, prefLang)}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {prefLang === 'bn' ? 'বর্তমান শ্রেণি (Class)' : 'Current Grade / Class'}
              </label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/70 text-sm focus:outline-none focus:border-cyan-500"
              >
                {GRADE_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {getGradeLabel(g, prefLang)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {prefLang === 'bn' ? 'বিদ্যালয়ের নাম' : 'School / Institution'}
              </label>
              <input
                type="text"
                maxLength={160}
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder={prefLang === 'bn' ? 'যেমন: ঢাকা কলেজিয়েট স্কুল' : 'e.g., Dhaka Collegiate School'}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/70 text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {prefLang === 'bn' ? 'পাঠ্যক্রম (Curriculum)' : 'Mathematics Curriculum'}
              </label>
              <select
                value={curriculum}
                onChange={(e) => setCurriculum(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/70 text-sm focus:outline-none focus:border-cyan-500"
              >
                {DEFAULT_CURRICULA.map((c) => (
                  <option key={c} value={c}>
                    {getCurriculumLabel(c, prefLang)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              {prefLang === 'bn'
                ? 'পূর্ববর্তী গণিত অভিজ্ঞতা (ঐচ্ছিক)'
                : 'Prior Mathematics Learning Experience'}
            </label>
            <input
              type="text"
              maxLength={500}
              value={priorExperience}
              onChange={(e) => setPriorExperience(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/70 text-sm focus:outline-none focus:border-cyan-500"
            />
          </div>

          <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 cursor-pointer">
            <input
              type="checkbox"
              checked={guardianConsent}
              onChange={(e) => setGuardianConsent(e.target.checked)}
              className="mt-0.5 rounded border-slate-400 text-cyan-600 focus:ring-cyan-500"
            />
            <span className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {prefLang === 'bn'
                ? 'আমি শিক্ষার্থী/অভিভাবক হিসেবে গণিত মূল্যায়নের ফলাফল ও শেখার অগ্রগতি নিরাপদভাবে সংরক্ষণের সম্মতি প্রদান করছি।'
                : 'I confirm guardian/learner consent to securely store mathematics assessment results and personalized learning paths under MATHMIND AI child data protection rules.'}
            </span>
          </label>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-sky-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white text-sm font-semibold glass-btn-3d transition-colors disabled:opacity-60"
            >
              <UserCheck className="w-4 h-4" />
              {saving
                ? prefLang === 'bn'
                  ? 'সংরক্ষণ হচ্ছে...'
                  : 'Saving Profile...'
                : !isEditing
                ? prefLang === 'bn'
                  ? 'সেভ করে ১০০ নম্বরের টেস্ট শুরু করুন'
                  : 'Save & Start 100-Mark Test'
                : prefLang === 'bn'
                ? 'প্রোফাইল সংরক্ষণ করুন'
                : 'Save Academic Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
