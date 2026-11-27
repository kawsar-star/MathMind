export type UserRole = 'student' | 'teacher' | 'parent' | 'school_admin' | 'super_admin';

export type Language = 'en' | 'bn';
export type StudyMedium = 'bangla_medium' | 'english_version';
export type DifficultyTier = 'easy' | 'medium' | 'hard';
export type ThemeMode = 'dark' | 'light';

export type CompetencyCategory = 'Beginner' | 'Developing' | 'Proficient' | 'Advanced' | 'Expert';

export type QuestionFormat =
  | 'mcq'
  | 'multi_select'
  | 'numerical'
  | 'fill_blank'
  | 'true_false'
  | 'word_problem'
  | 'reasoning';

export type ErrorCategory =
  | 'Conceptual misconception'
  | 'Calculation mistake'
  | 'Misunderstanding of the question'
  | 'Incorrect mathematical operation'
  | 'Procedural error'
  | 'Logical reasoning error'
  | 'Missing prerequisite knowledge'
  | 'Careless error';

export interface MathDomainDefinition {
  id: string;
  name: string;
  nameBn: string;
  shortName: string;
  description: string;
  subskills: string[];
  prerequisites: string[];
  minGradeLevel?: number;
  minAge?: number;
}

export interface AgeOrganizedDomain extends MathDomainDefinition {
  displayName: string;
  displayNameBn: string;
  displayDescription: string;
  displayDescriptionBn: string;
  recommendedForAge: boolean;
}

export interface MathQuestion {
  id: string;
  domain: string;
  subskill: string;
  ageBand: string;
  grade: string;
  minGradeLevel?: number;
  maxGradeLevel?: number;
  curriculum: string;
  learningObjective: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  difficultyTier?: DifficultyTier;
  type: QuestionFormat;
  prompt: string;
  promptBn?: string;
  options?: string[];
  optionsBn?: string[];
  correctAnswer: string;
  correctAnswerBn?: string;
  explanation: string;
  explanationBn?: string;
  commonMisconception?: string;
  prerequisiteSkill?: string;
  estimatedSeconds?: number;
  source: 'curated' | 'ai_generated' | 'teacher_authored';
  validationStatus: 'approved' | 'pending_review' | 'rejected';
  visualSvg?:
    | 'fraction_bar'
    | 'angle_triangle'
    | 'number_line'
    | 'coordinate_point'
    | 'pattern_blocks'
    | 'counting_dots'
    | 'shape_cards';
  visualData?: Record<string, number | string>;
  createdBy?: string;
}

export interface QuestionResponseRecord {
  questionId: string;
  domain: string;
  subskill: string;
  difficulty: number;
  prompt: string;
  correctAnswer: string;
  studentAnswer: string;
  isCorrect: boolean;
  timeSpentSec: number;
  reasoningNote?: string;
}

export interface DomainScore {
  domain: string;
  score: number;
  accuracyPercent: number;
  questionsAttempted: number;
  averageDifficulty: number;
  averageTimeSec: number;
  competencyCategory: CompetencyCategory;
  weakSubskills: string[];
  strongSubskills: string[];
}

export interface ErrorFinding {
  category: ErrorCategory | string;
  domain: string;
  subskill: string;
  confidence: 'low' | 'medium' | 'high' | string;
  evidence: string;
  explanation: string;
}

export interface AIDiagnosisReport {
  executiveSummary: string;
  strongDomains: string[];
  weakDomains: string[];
  missingPrerequisites: string[];
  speedAccuracyObservation: string;
  consistencyAssessment: string;
  errorFindings: ErrorFinding[];
  recommendedObjectives: string[];
  suggestedDurationWeeks: number;
  nextAssessmentRecommendation: string;
}

export interface AssessmentRecord {
  id: string;
  userId: string;
  studentName: string;
  ageBand: string;
  grade: string;
  curriculum: string;
  mode: 'comprehensive' | 'domain_focused' | 'diagnostic_recheck';
  status: 'in_progress' | 'paused' | 'completed';
  overallScore: number;
  competencyCategory: CompetencyCategory;
  accuracyPercent: number;
  totalQuestions: number;
  averageTimeSec?: number;
  domainScores: DomainScore[];
  responses: QuestionResponseRecord[];
  aiDiagnosis?: AIDiagnosisReport;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface RemedialObjective {
  id: string;
  order: number;
  domain: string;
  subskill: string;
  title: string;
  prerequisite: string;
  level: string;
  explanation: string;
  everydayExample: string;
  workedExample: string;
  recommendedLabTool: string;
  targetMasteryPercent: number;
  estimatedMinutes: number;
  status: 'completed' | 'current' | 'upcoming' | 'reteach';
  checkScore?: number;
}

export interface RemedialPlan {
  id: string;
  userId: string;
  assessmentId: string;
  interventionLevel:
    | 'Level A: Foundational Support'
    | 'Level B: Conceptual Reinforcement'
    | 'Level C: Advanced Development';
  overallProgress: number;
  objectives: RemedialObjective[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface UserAccount {
  uid: string;
  displayName: string;
  role: UserRole;
  preferredLanguage: Language;
  studyMedium?: StudyMedium;
  theme: ThemeMode;
  schoolId?: string;
  onboardingCompleted: boolean;
  xp: number;
  streak: number;
  longestStreak?: number;
  lastActiveDate?: string;
  streakDates?: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface StudentProfile {
  id: string;
  userId: string;
  studentCode: string;
  name: string;
  dob: string;
  age: number;
  ageBand: string;
  grade: string;
  schoolName?: string;
  schoolId?: string;
  curriculum: string;
  preferredLanguage: Language;
  studyMedium?: StudyMedium;
  priorExperience?: string;
  parentUid?: string;
  assignedTeacherId?: string;
  overallScore?: number;
  competencyCategory?: CompetencyCategory;
  xp?: number;
  streak?: number;
  longestStreak?: number;
  lastActiveDate?: string;
  weeklyGoalMinutes?: number;
  completedMinutes?: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ClassRoom {
  id: string;
  teacherId: string;
  teacherName: string;
  name: string;
  grade: string;
  curriculum: string;
  schoolId?: string;
  studentCount: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface QuizAttempt {
  id: string;
  userId: string;
  domain: string;
  subskill?: string;
  mode: 'daily' | 'topic' | 'adaptive' | 'revision' | 'challenge' | 'timed' | 'remedial_check';
  score: number;
  totalQuestions: number;
  accuracyPercent: number;
  xpEarned: number;
  createdAt?: unknown;
}

export interface OlympiadProblem {
  id: string;
  title: string;
  titleBn?: string;
  category:
    | 'Number Theory'
    | 'Algebra'
    | 'Geometry'
    | 'Combinatorics'
    | 'Logical Reasoning'
    | 'Mathematical Puzzles'
    | 'Pattern and Sequence'
    | 'Probability'
    | 'Creative Problem Solving';
  difficulty:
    | 'Explorer'
    | 'Beginner Olympiad'
    | 'Intermediate Olympiad'
    | 'Advanced Olympiad'
    | 'National Challenge'
    | 'International Challenge';
  minGradeLevel?: number;
  maxGradeLevel?: number;
  minAge?: number;
  maxAge?: number;
  gradeBand?: string;
  gradeBandBn?: string;
  ageBand?: string;
  ageBandBn?: string;
  prompt: string;
  promptBn?: string;
  correctAnswer: string;
  correctAnswerBn?: string;
  hints: string[];
  hintsBn?: string[];
  solution: string;
  solutionBn?: string;
  keyInsight: string;
  keyInsightBn?: string;
  source: 'official_style' | 'ai_generated';
  isQuestionOfTheDay?: boolean;
}

export interface OlympiadAttempt {
  id: string;
  userId: string;
  problemId: string;
  category: string;
  difficulty: string;
  submittedAnswer: string;
  reasoningText?: string;
  isCorrect: boolean;
  hintsUsed: number;
  timeSpentSec: number;
  reasoningScore: number;
  xpEarned: number;
  createdAt?: unknown;
}

export interface GuidedLesson {
  id: string;
  domain: string;
  subskill: string;
  grade: string;
  title: string;
  titleBn: string;
  learningObjective: string;
  learningObjectiveBn?: string;
  prerequisiteKnowledge: string;
  prerequisiteKnowledgeBn?: string;
  conceptIntro: string;
  conceptIntroBn?: string;
  visualExplanation: string;
  visualExplanationBn?: string;
  labToolId: string;
  workedExample: {
    problem: string;
    problemBn?: string;
    steps: string[];
    stepsBn?: string[];
    answer: string;
    answerBn?: string;
  };
  guidedPractice: {
    prompt: string;
    promptBn?: string;
    hint: string;
    hintBn?: string;
    answer: string;
    answerBn?: string;
  };
  independentPractice: {
    prompt: string;
    promptBn?: string;
    answer: string;
    answerBn?: string;
  }[];
  knowledgeCheck: {
    prompt: string;
    promptBn?: string;
    options: string[];
    optionsBn?: string[];
    correctAnswer: string;
    correctAnswerBn?: string;
    explanation: string;
    explanationBn?: string;
  };
  summary: string;
  summaryBn?: string;
}

export interface WorksheetDoc {
  id: string;
  ownerId: string;
  title: string;
  domain: string;
  grade: string;
  difficulty: number;
  worksheetType: 'practice' | 'remedial' | 'revision' | 'advanced' | 'olympiad';
  questions: {
    id: string;
    prompt: string;
    options?: string[];
    correctAnswer: string;
    explanation: string;
  }[];
  createdAt?: unknown;
}

export interface TutorMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  followUpQuestion?: string;
  alternativeMethod?: string;
  similarPracticeProblem?: string;
  timestamp: string;
}

export interface TutorSession {
  id: string;
  userId: string;
  mode: 'teach_me' | 'give_hint' | 'check_solution';
  topic: string;
  messages: TutorMessage[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  category: 'assessment' | 'remedial' | 'milestone' | 'parent_update' | 'teacher_alert' | 'streak';
  read: boolean;
  createdAt?: unknown;
}

export interface CurriculumConfig {
  id: string;
  name: string;
  country?: string;
  status: 'active' | 'draft';
  verifiedByAdmin: boolean;
  notes?: string;
  updatedBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SystemSettings {
  reTeachThreshold: number;
  guidedThreshold: number;
  masteryThreshold: number;
  aiDailyLimitPerStudent: number;
  ageBands: string[];
  updatedBy: string;
  updatedAt?: unknown;
}

export interface AuditLog {
  id: string;
  actorUid: string;
  action: string;
  targetType: string;
  targetId?: string;
  details: string;
  createdAt?: unknown;
}
