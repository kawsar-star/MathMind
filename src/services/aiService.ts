import {
  AIDiagnosisReport,
  DifficultyTier,
  DomainScore,
  Language,
  QuestionResponseRecord,
  StudyMedium,
} from '../types/mathmind';

const API_BASE = ((import.meta as any).env?.VITE_API_BASE_URL || '').replace(/\/+$/, '');

export class AiBackendUnavailableError extends Error {
  constructor(message = 'Live AI endpoints are unavailable in static hosting mode.') {
    super(message);
    this.name = 'AiBackendUnavailableError';
  }
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AiBackendUnavailableError(
      'Live AI server could not be reached. Curated NCTB practice, guided lessons, and Math Labs remain available.'
    );
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new AiBackendUnavailableError(
      'Running in static Firebase Hosting mode (no backend AI server). Curated NCTB quizzes, worksheets, lessons, and Math Labs work normally.'
    );
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 404 || res.status === 405 || res.status === 503) {
      throw new AiBackendUnavailableError(
        data.error ||
          'Live AI service is currently unavailable. Curated NCTB features continue to work normally.'
      );
    }
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export async function requestAssessmentDiagnosis(params: {
  age: number;
  grade: string;
  curriculum: string;
  language: Language;
  domainScores: DomainScore[];
  responses: QuestionResponseRecord[];
}): Promise<AIDiagnosisReport> {
  return postJson<AIDiagnosisReport>('/api/ai/diagnose', params);
}

export async function requestRemedialPlan(params: {
  age: number;
  grade: string;
  overallScore: number;
  domainScores: DomainScore[];
  weakDomains: string[];
  language: Language;
}) {
  return postJson<{
    interventionLevel:
      | 'Level A: Foundational Support'
      | 'Level B: Conceptual Reinforcement'
      | 'Level C: Advanced Development';
    rationale: string;
    objectives: any[];
  }>('/api/ai/remedial-plan', params);
}

export async function requestTutorReply(params: {
  mode: 'teach_me' | 'give_hint' | 'check_solution';
  message: string;
  history: { role: 'user' | 'model'; text: string }[];
  context: {
    age?: number;
    grade?: string;
    competency?: string;
    curriculum?: string;
    language?: Language;
  };
}) {
  return postJson<{
    reply: string;
    followUpQuestion?: string;
    alternativeMethod?: string;
    similarPracticeProblem?: string;
    detectedMistakeType?: string;
  }>('/api/ai/tutor', params);
}

export async function requestStepByStepSolve(params: {
  problem: string;
  imageBase64?: string;
  imageMimeType?: string;
  grade: string;
  language: Language;
}) {
  return postJson<{
    problemInterpretation: string;
    relevantFormulas: string[];
    steps: { stepNumber: number; title: string; expression: string; explanation: string }[];
    finalAnswer: string;
    numericValue?: string;
    alternativeMethod?: string;
    similarPracticeProblem?: string;
    deterministicCheck?: { evaluated: number | null; verified: boolean } | null;
  }>('/api/ai/solve', params);
}

export async function requestAiPracticeGeneration(params: {
  domain: string;
  subskill: string;
  grade: string;
  ageBand: string;
  difficulty: number;
  difficultyTier?: DifficultyTier;
  studyMedium?: StudyMedium;
  curriculum?: string;
  count: number;
  mode: string;
  language: Language;
}) {
  return postJson<{
    title: string;
    learningObjective: string;
    source: 'ai_generated';
    questions: any[];
  }>('/api/ai/generate-practice', params);
}

export async function requestOlympiadCoach(params: {
  action: 'hint' | 'evaluate_reasoning' | 'generate_problem';
  category: string;
  difficulty: string;
  problemPrompt?: string;
  expectedAnswer?: string;
  studentAnswer?: string;
  reasoningText?: string;
  hintNumber?: number;
  language: Language;
}) {
  return postJson<any>('/api/ai/olympiad-coach', params);
}

export async function requestTeacherInsights(params: {
  cohortName: string;
  studentCount: number;
  metrics: Record<string, unknown>;
  isSampleData: boolean;
  language: Language;
}) {
  return postJson<{
    headlineInsight: string;
    sampleSizeNote: string;
    conceptsToReteach: string[];
    recommendedActivities: string[];
    groupingStrategy: string;
    enrichmentAdvice: string;
  }>('/api/ai/teacher-insights', params);
}

export interface GlossaryExplanation {
  term: string;
  termAlt: string;
  domain: string;
  levelTag: string;
  definition: string;
  contextConnection: string;
  formulaOrRule: string;
  everydayExample: string;
  workedExample: string;
  commonMistake: string;
  relatedTerms: string[];
}

export async function requestGlossaryExplanation(params: {
  term: string;
  context?: string;
  sourceLabel?: string;
  grade?: string;
  studyMedium?: StudyMedium;
  language: Language;
}): Promise<GlossaryExplanation> {
  return postJson<GlossaryExplanation>('/api/ai/glossary', params);
}
