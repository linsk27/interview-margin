import { z } from 'zod'

import { appPath } from './api'

const scoreLevelSchema = z.enum(['none', 'weak', 'partial', 'solid', 'strong'])

const scoreDimensionSchema = <
  Key extends 'correctness' | 'reasoning' | 'coverage' | 'application' | 'communication',
  Label extends string,
  MaxScore extends number,
>(key: Key, label: Label, maxScore: MaxScore) => z.object({
  key: z.literal(key),
  label: z.literal(label),
  level: scoreLevelSchema,
  levelLabel: z.enum(['未体现', '较弱', '部分命中', '较完整', '表现扎实']),
  score: z.number().int().min(0).max(maxScore),
  maxScore: z.literal(maxScore),
}).strict()

const scoreResponseSchema = z.object({
  version: z.literal(1),
  score: z.number().int().min(0).max(100),
  band: z.string().min(1).max(80),
  summary: z.string().min(1).max(180),
  dimensions: z.tuple([
    scoreDimensionSchema('correctness', '技术正确性', 30),
    scoreDimensionSchema('reasoning', '原理与因果', 25),
    scoreDimensionSchema('coverage', '关键点覆盖', 20),
    scoreDimensionSchema('application', '场景、边界与取舍', 15),
    scoreDimensionSchema('communication', '表达与结构', 10),
  ]),
  strengths: z.array(z.string().min(1).max(120)).max(2),
  gaps: z.array(z.string().min(1).max(160)).max(3),
  nextStep: z.string().min(1).max(180),
  criticalIssues: z.array(z.object({
    type: z.enum([
      'OFF_TOPIC',
      'CORE_CONCEPT_REVERSED',
      'FABRICATED_MECHANISM',
      'UNSAFE_ADVICE',
      'NONVIABLE_SOLUTION',
      'CONTRADICTION',
    ]),
    evidence: z.string().min(1).max(200),
    explanation: z.string().min(1).max(300),
  })).max(3),
  confidence: z.enum(['low', 'medium', 'high']),
  disclaimer: z.string().min(1).max(160),
})

export type InterviewScoreResult = z.infer<typeof scoreResponseSchema>

export class InterviewScoreError extends Error {
  code?: string
  retryable: boolean

  constructor(message: string, options: { code?: string, retryable?: boolean } = {}) {
    super(message)
    this.name = 'InterviewScoreError'
    this.code = options.code
    this.retryable = options.retryable ?? true
  }
}

interface ScoreAnswerInput {
  questionId: string
  answer: string
  signal?: AbortSignal
}

export async function scoreInterviewAnswer({ questionId, answer, signal }: ScoreAnswerInput) {
  let response: Response
  try {
    response = await fetch(appPath('/api/ai-score'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      signal,
      body: JSON.stringify({ questionId, answer }),
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new InterviewScoreError('网络连接失败，请检查网络后重试。', {
      code: 'NETWORK_ERROR',
      retryable: true,
    })
  }

  const payload = await response.json().catch(() => ({})) as Record<string, unknown>
  if (!response.ok) {
    throw new InterviewScoreError(
      typeof payload.error === 'string' ? payload.error : 'AI 面试官暂时无法评分，请稍后重试。',
      {
        code: typeof payload.code === 'string' ? payload.code : undefined,
        retryable: typeof payload.retryable === 'boolean'
          ? payload.retryable
          : response.status === 429 || response.status >= 500,
      },
    )
  }

  const parsed = scoreResponseSchema.safeParse(payload)
  if (!parsed.success) {
    throw new InterviewScoreError('AI 评分结果格式异常，请重试。', {
      code: 'AI_SCORE_INVALID_RESPONSE',
      retryable: true,
    })
  }
  return parsed.data
}
