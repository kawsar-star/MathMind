import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { verifyMathAnswer, evaluateNumericExpression } from './mathEngine.ts';

export const MODEL_ID = 'gemini-4-hydrogen';

export interface ApiResult {
  status: number;
  body: unknown;
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function sanitizeStr(input: unknown, maxLen = 2000): string {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, maxLen);
}

function parseModelJson<T = any>(rawText: string | undefined): T {
  const trimmed = (rawText ?? '{}')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  return JSON.parse(trimmed || '{}') as T;
}

function formatAiError(err: unknown): ApiResult {
  const msg = err instanceof Error ? err.message : String(err);
  console.error('[MATHMIND AI Server Error]:', msg);
  if (msg.includes('PERMISSION_DENIED') || msg.includes('API_KEY_INVALID') || msg.includes('403')) {
    return {
      status: 403,
      body: {
        error: 'Gemini API key permission error. Please verify your GEMINI_API_KEY in environment settings.',
      },
    };
  }
  if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429')) {
    return {
      status: 429,
      body: {
        error: 'Gemini API quota temporarily reached. Please wait a moment and try again.',
      },
    };
  }
  return {
    status: 500,
    body: {
      error: `AI service failed: ${msg}`,
    },
  };
}

export async function handleApiRequest(
  method: string,
  routePath: string,
  rawBody: any
): Promise<ApiResult> {
  const upperMethod = method.toUpperCase();
  const cleanPath = routePath.split('?')[0].replace(/\/+$/, '') || '/';
  const reqBody = rawBody && typeof rawBody === 'object' ? rawBody : {};

  // 1. Health & deterministic math verification
  if (upperMethod === 'GET' && cleanPath === '/api/health') {
    return {
      status: 200,
      body: {
        status: 'ok',
        service: 'MATHMIND AI Backend',
        aiConfigured: Boolean(getGeminiClient()),
        model: MODEL_ID,
      },
    };
  }

  if (upperMethod === 'POST' && cleanPath === '/api/verify-math') {
    const submitted = sanitizeStr(reqBody?.submitted, 300);
    const expected = sanitizeStr(reqBody?.expected, 300);
    if (!submitted || !expected) {
      return {
        status: 400,
        body: { error: 'Both submitted and expected expressions are required.' },
      };
    }
    return {
      status: 200,
      body: verifyMathAnswer(submitted, expected),
    };
  }

  // 2. AI Mathematical Error Diagnostician & Intelligence Analyzer
  if (upperMethod === 'POST' && cleanPath === '/api/ai/diagnose') {
    const ai = getGeminiClient();
    if (!ai) {
      return {
        status: 503,
        body: {
          error:
            'GEMINI_API_KEY is not configured in environment secrets. Curated & deterministic features continue working normally.',
        },
      };
    }

    try {
      const studentAge = Number(reqBody?.age) || 12;
      const grade = sanitizeStr(reqBody?.grade, 40) || 'Grade 6';
      const curriculum = sanitizeStr(reqBody?.curriculum, 80) || 'NCTB Bangladesh';
      const language = reqBody?.language === 'bn' ? 'bn' : 'en';
      const domainScores = Array.isArray(reqBody?.domainScores) ? reqBody.domainScores.slice(0, 15) : [];
      const responses = Array.isArray(reqBody?.responses) ? reqBody.responses.slice(0, 100) : [];

      if (responses.length === 0) {
        return {
          status: 400,
          body: { error: 'Assessment responses are required for diagnosis.' },
        };
      }

      const incorrectResponses = responses.filter((r: any) => !r.isCorrect);
      const compactResponses = responses.map((r: any) => ({
        domain: r.domain,
        subskill: r.subskill,
        difficulty: r.difficulty,
        prompt: r.isCorrect
          ? sanitizeStr(r.prompt, 90)
          : sanitizeStr(r.prompt, 180),
        expected: r.correctAnswer,
        studentAnswer: r.studentAnswer,
        isCorrect: r.isCorrect,
        timeSec: r.timeSpentSec,
      }));
      const langInstruction =
        language === 'bn'
          ? 'Write user-facing summaries, explanations, and recommendations in natural, clear Bengali (Bangla Unicode) while keeping mathematical notation standard.'
          : 'Write in clear, encouraging academic English.';

      const prompt = `
Analyze this student's mathematics assessment data.
Student Context: Age ${studentAge}, Grade: ${grade}, Curriculum: ${curriculum}.
Total Questions Answered: ${responses.length}. Correct: ${responses.length - incorrectResponses.length}. Incorrect Responses: ${incorrectResponses.length}.
Domain Scores Summary: ${JSON.stringify(domainScores)}
Detailed Question Responses: ${JSON.stringify(compactResponses)}

Strict Rules:
- Never invent mistakes or misconceptions not supported by the student's actual responses above.
- If fewer than 3 incorrect responses exist in a domain, explicitly mark confidence as "low" and state that additional diagnostic questions are needed before concluding a deep misconception.
- Classify observed errors strictly from these 8 categories:
  1. Conceptual misconception
  2. Calculation mistake
  3. Misunderstanding of the question
  4. Incorrect mathematical operation
  5. Procedural error
  6. Logical reasoning error
  7. Missing prerequisite knowledge
  8. Careless error
- Do not present scores as standardized IQ or normed age percentiles; frame strictly as observed curriculum performance.
- ${langInstruction}
`;

      const response = await ai.models.generateContent({
        model: MODEL_ID,
        contents: prompt,
        config: {
          systemInstruction:
            'You are the MATHMIND AI Mathematical Error Diagnostician and Psychometric Analyst. Be rigorous, evidence-driven, mathematically exact, and constructive.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              executiveSummary: { type: Type.STRING },
              strongDomains: { type: Type.ARRAY, items: { type: Type.STRING } },
              weakDomains: { type: Type.ARRAY, items: { type: Type.STRING } },
              missingPrerequisites: { type: Type.ARRAY, items: { type: Type.STRING } },
              speedAccuracyObservation: { type: Type.STRING },
              consistencyAssessment: { type: Type.STRING },
              errorFindings: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: { type: Type.STRING },
                    domain: { type: Type.STRING },
                    subskill: { type: Type.STRING },
                    confidence: { type: Type.STRING },
                    evidence: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                  },
                },
              },
              recommendedObjectives: { type: Type.ARRAY, items: { type: Type.STRING } },
              suggestedDurationWeeks: { type: Type.INTEGER },
              nextAssessmentRecommendation: { type: Type.STRING },
            },
          },
        },
      });

      return { status: 200, body: parseModelJson(response.text) };
    } catch (err) {
      return formatAiError(err);
    }
  }

  // 3. AI Personalized Remedial Planner
  if (upperMethod === 'POST' && cleanPath === '/api/ai/remedial-plan') {
    const ai = getGeminiClient();
    if (!ai) {
      return {
        status: 503,
        body: { error: 'GEMINI_API_KEY is not configured in environment secrets.' },
      };
    }

    try {
      const age = Number(reqBody?.age) || 12;
      const grade = sanitizeStr(reqBody?.grade, 40) || 'Grade 6';
      const overallScore = Number(reqBody?.overallScore) || 60;
      const domainScores = Array.isArray(reqBody?.domainScores) ? reqBody.domainScores.slice(0, 15) : [];
      const weakDomains = Array.isArray(reqBody?.weakDomains) ? reqBody.weakDomains.slice(0, 12) : [];
      const language = reqBody?.language === 'bn' ? 'bn' : 'en';

      const prompt = `
Create a personalized sequential remedial learning path for a student:
Age: ${age}, Grade: ${grade}, Observed Assessment Score: ${overallScore}%.
Weak/Priority Domains: ${JSON.stringify(weakDomains)}
Domain Scores: ${JSON.stringify(domainScores)}
Language: ${language === 'bn' ? 'Bengali (Bangla Unicode)' : 'English'}.

Choose one overall intervention level:
- "Level A: Foundational Support" (for overall < 55% or major prerequisite gaps)
- "Level B: Conceptual Reinforcement" (for overall 55-79%)
- "Level C: Advanced Development" (for overall >= 80%)

Generate 5 sequential learning objectives ordered from prerequisite foundations to target mastery.
Each objective must include a matching interactive Math Lab tool id from:
["number-line", "fraction-lab", "algebra-balance", "geometry-board", "coordinate-plane", "probability-sim"]
`;

      const response = await ai.models.generateContent({
        model: MODEL_ID,
        contents: prompt,
        config: {
          systemInstruction:
            'You are the MATHMIND AI Personalized Remedial Planner. Design mastery-based sequential objectives.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              interventionLevel: { type: Type.STRING },
              rationale: { type: Type.STRING },
              objectives: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    order: { type: Type.INTEGER },
                    domain: { type: Type.STRING },
                    subskill: { type: Type.STRING },
                    title: { type: Type.STRING },
                    prerequisite: { type: Type.STRING },
                    level: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                    everydayExample: { type: Type.STRING },
                    workedExample: { type: Type.STRING },
                    recommendedLabTool: { type: Type.STRING },
                    targetMasteryPercent: { type: Type.INTEGER },
                    estimatedMinutes: { type: Type.INTEGER },
                  },
                },
              },
            },
          },
        },
      });

      return { status: 200, body: parseModelJson(response.text) };
    } catch (err) {
      return formatAiError(err);
    }
  }

  // 4. AI Math Tutor (3 modes: teach_me, give_hint, check_solution)
  if (upperMethod === 'POST' && cleanPath === '/api/ai/tutor') {
    const ai = getGeminiClient();
    if (!ai) {
      return {
        status: 503,
        body: { error: 'GEMINI_API_KEY is not configured in environment secrets.' },
      };
    }

    try {
      const mode = sanitizeStr(reqBody?.mode, 32) || 'teach_me';
      const message = sanitizeStr(reqBody?.message, 2000);
      const history = Array.isArray(reqBody?.history) ? reqBody.history.slice(-12) : [];
      const studentContext = reqBody?.context || {};
      const language = studentContext.language === 'bn' ? 'bn' : 'en';

      if (!message) {
        return { status: 400, body: { error: 'Message is required.' } };
      }

      const modeInstructions =
        mode === 'give_hint'
          ? 'MODE: GIVE ME A HINT. Never reveal the final answer directly. Give ONE helpful conceptual hint or guiding question and ask the student to try the next step.'
          : mode === 'check_solution'
          ? 'MODE: CHECK MY SOLUTION. Carefully verify every step of the student work. Praise correct logic, pinpoint the exact first step where an error occurs (if any), and ask them to fix that step.'
          : 'MODE: TEACH ME. Explain the concept simply using age-appropriate language, walk through step by step explaining WHY each step works, offer an alternative method when helpful, and end with a short check-for-understanding question.';

      const systemInstruction = `
You are the MATHMIND AI Mathematics Tutor — a warm, rigorous, Socratic teacher.
Student Profile: Age ${studentContext.age || 12}, Grade ${studentContext.grade || 'Grade 6'}, Competency ${studentContext.competency || 'Developing'}, Curriculum ${studentContext.curriculum || 'NCTB Bangladesh'}.
${modeInstructions}
Use clean Markdown and wrap math formulas in $...$ or $$...$$ LaTeX delimiters so KaTeX renders them cleanly.
${language === 'bn' ? 'Respond in clear Bengali (Bangla Unicode) with standard mathematical symbols.' : 'Respond in clear, encouraging English.'}
`;

      const contents = [
        ...history.map((h: any) => ({
          role: h.role === 'model' ? 'model' : 'user',
          parts: [{ text: sanitizeStr(h.text, 2000) }],
        })),
        { role: 'user', parts: [{ text: message }] },
      ];

      const response = await ai.models.generateContent({
        model: MODEL_ID,
        contents,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: { type: Type.STRING },
              followUpQuestion: { type: Type.STRING },
              alternativeMethod: { type: Type.STRING },
              similarPracticeProblem: { type: Type.STRING },
              detectedMistakeType: { type: Type.STRING },
            },
          },
        },
      });

      return { status: 200, body: parseModelJson(response.text) };
    } catch (err) {
      return formatAiError(err);
    }
  }

  // 5. Step-by-Step Math Solver (Text + Optional Base64 Image)
  if (upperMethod === 'POST' && cleanPath === '/api/ai/solve') {
    const ai = getGeminiClient();
    if (!ai) {
      return {
        status: 503,
        body: { error: 'GEMINI_API_KEY is not configured in environment secrets.' },
      };
    }

    try {
      const problemText = sanitizeStr(reqBody?.problem, 2000);
      const imageBase64 = sanitizeStr(reqBody?.imageBase64, 5_000_000);
      const imageMimeType = sanitizeStr(reqBody?.imageMimeType, 64) || 'image/png';
      const language = reqBody?.language === 'bn' ? 'bn' : 'en';
      const grade = sanitizeStr(reqBody?.grade, 40) || 'Grade 7';

      if (!problemText && !imageBase64) {
        return {
          status: 400,
          body: { error: 'Please provide a math problem or upload an image.' },
        };
      }

      const parts: any[] = [];
      if (imageBase64) {
        const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
        parts.push({
          inlineData: {
            mimeType: imageMimeType,
            data: cleanBase64,
          },
        });
      }
      parts.push({
        text: `Solve this mathematics problem step-by-step for a ${grade} student.
Problem: ${problemText || 'Read the math problem from the attached image.'}
${language === 'bn' ? 'Provide explanations in Bengali (Bangla Unicode) while keeping math notation in LaTeX ($...$).' : 'Provide clear explanations in English with LaTeX ($...$) notation.'}
Double check every arithmetic calculation.`,
      });

      const response = await ai.models.generateContent({
        model: MODEL_ID,
        contents: { parts },
        config: {
          systemInstruction:
            'You are the MATHMIND AI Step-by-Step Mathematical Solver. Verify all arithmetic and algebraic steps carefully before outputting.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              problemInterpretation: { type: Type.STRING },
              relevantFormulas: { type: Type.ARRAY, items: { type: Type.STRING } },
              steps: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    stepNumber: { type: Type.INTEGER },
                    title: { type: Type.STRING },
                    expression: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                  },
                },
              },
              finalAnswer: { type: Type.STRING },
              numericValue: { type: Type.STRING },
              alternativeMethod: { type: Type.STRING },
              similarPracticeProblem: { type: Type.STRING },
            },
          },
        },
      });

      const parsed = parseModelJson(response.text);

      let deterministicCheck: { evaluated: number | null; verified: boolean } | null = null;
      if (problemText && !/[a-zA-Z]{2,}/.test(problemText.replace(/sqrt|abs|pi/gi, ''))) {
        const evaluated = evaluateNumericExpression(problemText);
        if (evaluated !== null) {
          const check = verifyMathAnswer(parsed.numericValue || parsed.finalAnswer || '', String(evaluated));
          deterministicCheck = {
            evaluated,
            verified: check.isEquivalent,
          };
        }
      }

      return { status: 200, body: { ...parsed, deterministicCheck } };
    } catch (err) {
      return formatAiError(err);
    }
  }

  // 6. AI Quiz & Worksheet Generator
  if (upperMethod === 'POST' && cleanPath === '/api/ai/generate-practice') {
    const ai = getGeminiClient();
    if (!ai) {
      return {
        status: 503,
        body: { error: 'GEMINI_API_KEY is not configured in environment secrets.' },
      };
    }

    try {
      const domain = sanitizeStr(reqBody?.domain, 80) || 'Number Operations';
      const subskill = sanitizeStr(reqBody?.subskill, 100) || 'General Practice';
      const grade = sanitizeStr(reqBody?.grade, 40) || 'Grade 6';
      const ageBand = sanitizeStr(reqBody?.ageBand, 32) || '11-12 years';
      const difficulty = Math.min(5, Math.max(1, Number(reqBody?.difficulty) || 2));
      const rawTier = sanitizeStr(reqBody?.difficultyTier, 16).toLowerCase();
      const difficultyTier: 'easy' | 'medium' | 'hard' =
        rawTier === 'easy' || rawTier === 'medium' || rawTier === 'hard'
          ? rawTier
          : difficulty <= 1
          ? 'easy'
          : difficulty <= 3
          ? 'medium'
          : 'hard';
      const studyMedium =
        reqBody?.studyMedium === 'bangla_medium' ? 'bangla_medium' : 'english_version';
      const curriculum =
        sanitizeStr(reqBody?.curriculum, 80) ||
        (studyMedium === 'bangla_medium'
          ? 'NCTB Bangladesh (Bangla Medium)'
          : 'NCTB Bangladesh (English Version)');
      const count = Math.min(10, Math.max(1, Number(reqBody?.count) || 5));
      const mode = sanitizeStr(reqBody?.mode, 40) || 'practice';

      const gradeLower = grade.toLowerCase();
      let gradeBoundaryRule =
        'Match standard age-appropriate NCTB textbook expectations strictly for this grade.';
      if (gradeLower.includes('pre-primary') || gradeLower.includes('preprimary')) {
        gradeBoundaryRule = `STRICT PRE-PRIMARY NCTB SCOPE (Age 4–5):
- ONLY counting 1 to 20, comparing more/fewer, very simple addition/subtraction within 10, recognizing Circle/Triangle/Square/Rectangle, Big/Small/Heavy/Light comparisons, and simple AB visual/number patterns.
- NEVER include 2-digit addition, multiplication, division, fractions, decimals, negative numbers, or algebraic variables (x, y).`;
      } else if (/\bgrade\s*1\b/i.test(grade)) {
        gradeBoundaryRule = `STRICT GRADE 1 (প্রথম শ্রেণি) NCTB BANGLADESH SCOPE (Age 6–7):
- ONLY NCTB Class 1 Primary Mathematics topics: numbers 1–100, before/after/comparison, Tens & Ones (দশক ও একক), addition and subtraction within 50 (no multi-digit multiplication/division), 2D shapes (Circle, Triangle, Square, Rectangle), simple Bangladeshi Taka notes/coins (1, 2, 5, 10, 20 Taka), days of the week, reading o'clock time, skip counting by 2s/5s/10s, and short child-friendly everyday word problems.
- STRICTLY FORBIDDEN for Grade 1: fractions, decimals, percentages, ratios, negative integers, algebraic symbols (x, y, n), BODMAS, exponents, angles in degrees, or multiplication tables above 2s skipping.`;
      } else if (/\bgrade\s*[23]\b/i.test(grade)) {
        gradeBoundaryRule = `STRICT GRADE 2–3 NCTB BANGLADESH SCOPE:
- Focus on NCTB Class 2–3 arithmetic (3-digit/4-digit numbers, place value, multiplication tables 1–10, simple division, unit fractions like 1/2 and 1/4, Taka-Poysha, meter/cm, basic perimeter). Avoid negative numbers, algebra variables, and trigonometry.`;
      }

      const tierRubric =
        difficultyTier === 'easy'
          ? 'DIFFICULTY TIER: EASY (সহজ) — Direct, single-step foundational NCTB textbook questions using small friendly numbers.'
          : difficultyTier === 'medium'
          ? 'DIFFICULTY TIER: MEDIUM (মধ্যম) — Standard NCTB conceptual questions or 1-step story problems appropriate for this grade.'
          : 'DIFFICULTY TIER: HARD (কঠিন) — Challenging 2-step reasoning or reverse/missing-number puzzle STRICTLY WITHIN this grade syllabus (never pull higher-grade topics to fake difficulty).';

      const mediumInstruction =
        studyMedium === 'bangla_medium'
          ? 'MEDIUM: NCTB Bangla Medium (বাংলা মাধ্যম). Populate promptBn, optionsBn (4 Bengali options using Bengali numerals ০-৯ where numbers appear), correctAnswerBn (exact match to one of optionsBn), and explanationBn in warm, child-friendly Bengali. Also fill prompt, options, correctAnswer, and explanation in English.'
          : 'MEDIUM: NCTB English Version. Write prompt, options, correctAnswer, and explanation in clear, student-friendly English, and optionally include promptBn.';

      const prompt = `
Generate ${count} original mathematics questions for:
Curriculum: ${curriculum}
Domain: ${domain}
Subskill: ${subskill}
Grade: ${grade} (${ageBand})
${tierRubric}
Purpose: ${mode}
${gradeBoundaryRule}
${mediumInstruction}

Requirements:
- Each question must be mathematically sound with a single unambiguous correctAnswer.
- Provide 4 options for MCQ questions, and ensure correctAnswer EXACTLY matches one of the options (and when optionsBn is provided, correctAnswerBn EXACTLY matches one of optionsBn).
- Keep sentences short and playful for young children (Pre-Primary & Grades 1–2).
- Verify your math before returning.
`;

      const response = await ai.models.generateContent({
        model: MODEL_ID,
        contents: prompt,
        config: {
          systemInstruction:
            'You are the MATHMIND AI NCTB Curriculum Assessment Generator. Strictly honor age and grade boundaries (especially Pre-Primary and Grade 1 NCTB Bangladesh).',
          thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              learningObjective: { type: Type.STRING },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    domain: { type: Type.STRING },
                    subskill: { type: Type.STRING },
                    difficulty: { type: Type.INTEGER },
                    type: { type: Type.STRING },
                    prompt: { type: Type.STRING },
                    promptBn: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    optionsBn: { type: Type.ARRAY, items: { type: Type.STRING } },
                    correctAnswer: { type: Type.STRING },
                    correctAnswerBn: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                    explanationBn: { type: Type.STRING },
                    commonMisconception: { type: Type.STRING },
                    prerequisiteSkill: { type: Type.STRING },
                  },
                },
              },
            },
          },
        },
      });

      const parsed = parseModelJson(response.text);
      const mappedDiff = difficultyTier === 'easy' ? 1 : difficultyTier === 'medium' ? 3 : 4;
      const labeledQuestions = (parsed.questions || []).map((q: any, idx: number) => ({
        ...q,
        id: q.id || `ai_q_${Date.now()}_${idx}`,
        domain: q.domain || domain,
        difficulty: q.difficulty || mappedDiff,
        difficultyTier,
        source: 'ai_generated',
        validationStatus: 'pending_review',
        type: 'mcq',
      }));

      return {
        status: 200,
        body: {
          title: parsed.title || `${domain} — ${difficultyTier.toUpperCase()} (${grade})`,
          learningObjective: parsed.learningObjective || subskill,
          source: 'ai_generated',
          questions: labeledQuestions,
        },
      };
    } catch (err) {
      return formatAiError(err);
    }
  }

  // 7. AI Olympiad Coach & Problem Generator
  if (upperMethod === 'POST' && cleanPath === '/api/ai/olympiad-coach') {
    const ai = getGeminiClient();
    if (!ai) {
      return {
        status: 503,
        body: { error: 'GEMINI_API_KEY is not configured in environment secrets.' },
      };
    }

    try {
      const action = sanitizeStr(reqBody?.action, 40) || 'hint';
      const category = sanitizeStr(reqBody?.category, 80) || 'Number Theory';
      const difficulty = sanitizeStr(reqBody?.difficulty, 60) || 'Beginner Olympiad';
      const problemPrompt = sanitizeStr(reqBody?.problemPrompt, 2000);
      const expectedAnswer = sanitizeStr(reqBody?.expectedAnswer, 300);
      const studentAnswer = sanitizeStr(reqBody?.studentAnswer, 300);
      const reasoningText = sanitizeStr(reqBody?.reasoningText, 3000);
      const hintNumber = Math.min(3, Math.max(1, Number(reqBody?.hintNumber) || 1));
      const language = reqBody?.language === 'bn' ? 'bn' : 'en';

      if (action === 'generate_problem') {
        const genResp = await ai.models.generateContent({
          model: MODEL_ID,
          contents: `Create 1 original Mathematics Olympiad problem.
Category: ${category}
Difficulty Tier: ${difficulty}
Language: ${language === 'bn' ? 'Provide title and prompt in both English and Bengali' : 'English'}.
Include 3 progressive hints, a clear final answer, and full rigorous proof/solution.`,
          config: {
            systemInstruction:
              'You are an International Math Olympiad problem composer. Ensure the problem has a unique, verified answer.',
            thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                prompt: { type: Type.STRING },
                correctAnswer: { type: Type.STRING },
                hints: { type: Type.ARRAY, items: { type: Type.STRING } },
                solution: { type: Type.STRING },
                keyInsight: { type: Type.STRING },
              },
            },
          },
        });
        const problem = parseModelJson(genResp.text);
        return {
          status: 200,
          body: {
            ...problem,
            source: 'ai_generated',
            validationStatus: 'pending_review',
          },
        };
      }

      if (action === 'evaluate_reasoning') {
        const answerCheck = verifyMathAnswer(studentAnswer, expectedAnswer);
        const evalResp = await ai.models.generateContent({
          model: MODEL_ID,
          contents: `Evaluate this student's Math Olympiad solution and mathematical reasoning.
Problem: ${problemPrompt}
Verified Correct Answer: ${expectedAnswer}
Student Submitted Answer: ${studentAnswer} (Deterministic Answer Check: ${answerCheck.isEquivalent ? 'MATCHES' : 'DOES NOT MATCH'})
Student Written Reasoning: "${reasoningText || 'No written reasoning provided.'}"
${language === 'bn' ? 'Write feedback in Bengali (Bangla Unicode).' : 'Write feedback in clear English.'}

Score reasoningScore from 0 to 100 based on logical clarity, completeness, and proof structure (not just final answer). If no reasoning was provided, reasoningScore should reflect that only the answer was attempted (max 45 if correct, 10 if incorrect).`,
          config: {
            systemInstruction:
              'You are the MATHMIND AI Olympiad Coach. Reward rigorous mathematical thinking, clarity, and problem-solving strategy.',
            thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                reasoningScore: { type: Type.INTEGER },
                approachFeedback: { type: Type.STRING },
                strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
                alternativeElegantApproach: { type: Type.STRING },
              },
            },
          },
        });
        const evalData = parseModelJson(evalResp.text);
        return {
          status: 200,
          body: {
            ...evalData,
            isCorrect: answerCheck.isEquivalent,
          },
        };
      }

      const hintResp = await ai.models.generateContent({
        model: MODEL_ID,
        contents: `Provide Progressive Hint #${hintNumber} (out of 3) for this Olympiad problem.
Problem: ${problemPrompt}
Hint 1 should point to the relevant mathematical invariant or representation without solving.
Hint 2 should suggest an intermediate sub-goal or equation.
Hint 3 should outline the key bridge step while still letting the student compute the final answer.
NEVER state the final answer directly.
${language === 'bn' ? 'Write in Bengali (Bangla Unicode).' : 'Write in English.'}`,
        config: {
          systemInstruction: 'You are the MATHMIND AI Olympiad Coach. Guide without spoiling.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              hintText: { type: Type.STRING },
              guidingQuestion: { type: Type.STRING },
            },
          },
        },
      });
      return { status: 200, body: parseModelJson(hintResp.text) };
    } catch (err) {
      return formatAiError(err);
    }
  }

  // 8. AI Analytics & Teacher Teaching Assistant
  if (upperMethod === 'POST' && cleanPath === '/api/ai/teacher-insights') {
    const ai = getGeminiClient();
    if (!ai) {
      return {
        status: 503,
        body: { error: 'GEMINI_API_KEY is not configured in environment secrets.' },
      };
    }

    try {
      const cohortName = sanitizeStr(reqBody?.cohortName, 120) || 'Mathematics Cohort';
      const studentCount = Number(reqBody?.studentCount) || 0;
      const metrics = reqBody?.metrics || {};
      const isSampleData = Boolean(reqBody?.isSampleData);
      const language = reqBody?.language === 'bn' ? 'bn' : 'en';

      const prompt = `
Generate actionable teaching & intervention recommendations strictly from the provided cohort data.
Cohort: ${cohortName} (Sample size n = ${studentCount}${isSampleData ? ', labeled Sample Classroom Data' : ''}).
Metrics: ${JSON.stringify(metrics)}

Rules:
- Cite exact percentages/numbers from the metrics above.
- If n < 10, explicitly warn about small sample size and uncertainty.
- Do not fabricate student names or scores not present in metrics.
- Recommend: concepts to reteach, student grouping strategy, and specific Math Lab or worksheet activities.
${language === 'bn' ? 'Write in Bengali (Bangla Unicode).' : 'Write in crisp professional English.'}
`;

      const response = await ai.models.generateContent({
        model: MODEL_ID,
        contents: prompt,
        config: {
          systemInstruction:
            'You are the MATHMIND AI Teaching & Analytics Assistant. Base every statement strictly on observed cohort metrics.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              headlineInsight: { type: Type.STRING },
              sampleSizeNote: { type: Type.STRING },
              conceptsToReteach: { type: Type.ARRAY, items: { type: Type.STRING } },
              recommendedActivities: { type: Type.ARRAY, items: { type: Type.STRING } },
              groupingStrategy: { type: Type.STRING },
              enrichmentAdvice: { type: Type.STRING },
            },
          },
        },
      });

      return { status: 200, body: parseModelJson(response.text) };
    } catch (err) {
      return formatAiError(err);
    }
  }

  // 9. AI Context-Aware Mathematical Glossary
  if (upperMethod === 'POST' && cleanPath === '/api/ai/glossary') {
    const ai = getGeminiClient();
    if (!ai) {
      return {
        status: 503,
        body: { error: 'GEMINI_API_KEY is not configured in environment secrets.' },
      };
    }

    try {
      const term = sanitizeStr(reqBody?.term, 140);
      const context = sanitizeStr(reqBody?.context, 1200);
      const sourceLabel = sanitizeStr(reqBody?.sourceLabel, 120);
      const grade = sanitizeStr(reqBody?.grade, 40) || 'Grade 6';
      const studyMedium =
        reqBody?.studyMedium === 'bangla_medium' ? 'bangla_medium' : 'english_version';
      const language = reqBody?.language === 'bn' ? 'bn' : 'en';

      if (!term) {
        return {
          status: 400,
          body: { error: 'Please provide a mathematical term to explain.' },
        };
      }

      const contextBlock = context
        ? `Surrounding Context (${sourceLabel || 'Current Problem/Lesson'}):\n"""${context}"""`
        : 'Surrounding Context: General glossary lookup (no specific problem text attached).';

      const langRule =
        language === 'bn'
          ? 'Write all explanations, analogies, and labels in warm, clear Bengali (Bangla Unicode), keeping mathematical formulas in standard LaTeX ($...$). Put the English technical term in termAlt.'
          : 'Write all explanations, analogies, and labels in clear, student-friendly English, keeping mathematical formulas in standard LaTeX ($...$). Put the Bengali equivalent term in termAlt.';

      const prompt = `
Explain the mathematical term "${term}" for a student in ${grade} (${studyMedium === 'bangla_medium' ? 'NCTB Bangla Medium' : 'NCTB English Version'}).
${contextBlock}

Requirements:
- Tailor depth, vocabulary, and examples strictly to ${grade}.
- In "definition", give a crisp 2-sentence conceptual definition.
- In "contextConnection", explain directly how "${term}" applies to the Surrounding Context above (if a problem or lesson snippet was given), or when a ${grade} student typically uses it.
- In "formulaOrRule", provide the key mathematical formula, identity, or rule wrapped in $...$ LaTeX (or a short symbolic rule if no formula applies).
- In "everydayExample", give a concrete, relatable everyday life example.
- In "workedExample", show 1 brief numerical example with $...$ notation.
- In "commonMistake", warn about 1 common student misconception.
- In "relatedTerms", list 3 to 4 closely connected mathematical terms (in ${language === 'bn' ? 'Bengali' : 'English'}).
- ${langRule}
`;

      const response = await ai.models.generateContent({
        model: MODEL_ID,
        contents: prompt,
        config: {
          systemInstruction:
            'You are the MATHMIND AI Interactive Mathematical Glossary. Be mathematically accurate, crystal clear, age-appropriate, and strictly grounded in the provided term and context.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              term: { type: Type.STRING },
              termAlt: { type: Type.STRING },
              domain: { type: Type.STRING },
              levelTag: { type: Type.STRING },
              definition: { type: Type.STRING },
              contextConnection: { type: Type.STRING },
              formulaOrRule: { type: Type.STRING },
              everydayExample: { type: Type.STRING },
              workedExample: { type: Type.STRING },
              commonMistake: { type: Type.STRING },
              relatedTerms: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
          },
        },
      });

      return { status: 200, body: parseModelJson(response.text) };
    } catch (err) {
      return formatAiError(err);
    }
  }

  return {
    status: 404,
    body: { error: `API route not found: ${upperMethod} ${cleanPath}` },
  };
}
