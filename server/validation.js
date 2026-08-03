import { z } from 'zod'

import { inspectMarkdownDiagrams } from './content/diagram-policy.js'

export const roleSchema = z.enum(['admin', 'editor', 'learner'])
export const settingsSchema = z.object({
  theme: z.enum(['light', 'dark']),
  readingSize: z.enum(['compact', 'comfortable', 'large']),
  readingFont: z.enum(['serif', 'sans']).default('serif'),
  pageLayout: z.enum(['single', 'spread']),
  focusMode: z.boolean(),
  notesOpen: z.boolean(),
})

export const progressSchema = z.object({
  status: z.enum(['unread', 'learning', 'review', 'mastered']),
  favorite: z.boolean(),
  note: z.string().max(20_000),
  readCount: z.number().int().min(0),
  seconds: z.number().int().min(0),
  lastOpenedAt: z.string().datetime().optional(),
  dueAt: z.string().datetime().optional(),
  scrollTop: z.number().min(0).optional(),
  spreadIndex: z.number().int().min(0).optional(),
})

export const annotationSchema = z.object({
  id: z.string().min(1).max(160),
  questionId: z.string().min(1).max(160),
  quote: z.string().min(1).max(20_000),
  note: z.string().max(50_000),
  color: z.enum(['yellow', 'blue', 'green', 'rose']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const studyStateSchema = z.object({
  version: z.literal(1),
  progress: z.record(z.string(), progressSchema),
  annotations: z.array(annotationSchema).max(20_000),
  activity: z.record(z.string(), z.number().int().min(0)),
  settings: settingsSchema,
})

export const loginSchema = z.object({
  username: z.string().trim().min(2).max(64),
  // Login validates an existing credential; password strength belongs to
  // creation/change flows so legacy or locally reset credentials still work.
  password: z.string().min(1).max(256),
})

export const passwordSchema = z.object({
  currentPassword: z.string().min(1).max(256),
  newPassword: z.string().min(12).max(256),
})

export const userCreateSchema = z.object({
  username: z.string().trim().regex(/^[a-zA-Z0-9._-]{2,64}$/),
  displayName: z.string().trim().min(1).max(80),
  role: roleSchema,
  password: z.string().min(12).max(256).optional(),
})

export const userPatchSchema = z.object({
  displayName: z.string().trim().min(1).max(80).optional(),
  role: roleSchema.optional(),
  status: z.enum(['active', 'disabled']).optional(),
}).refine((value) => Object.keys(value).length > 0)

const invitationTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/)

export const invitationCreateSchema = z.object({
  expiresInHours: z.number().int().min(1).max(168).default(72),
}).strict()

export const invitationInspectSchema = z.object({
  token: invitationTokenSchema,
}).strict()

export const invitationAcceptSchema = z.object({
  token: invitationTokenSchema,
  username: z.string().trim().regex(/^[a-zA-Z0-9._-]{2,64}$/),
  displayName: z.string().trim().min(1).max(80),
  password: z.string().min(12).max(256),
}).strict()

export const bankCreateSchema = z.object({
  id: z.string().trim().regex(/^[a-z0-9][a-z0-9-]{1,63}$/),
  title: z.string().trim().min(1).max(120),
  shortTitle: z.string().trim().min(1).max(80),
  kicker: z.string().trim().min(1).max(80),
  category: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(500),
  baseTags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  tone: z.enum(['blue', 'amber', 'green', 'rose']).default('blue'),
  visibility: z.enum(['public', 'private']).default('public'),
})

export const bankPatchSchema = bankCreateSchema.omit({ id: true }).partial().extend({
  version: z.number().int().positive(),
})

const questionBodySchema = z.string().min(1).max(200_000).superRefine((body, context) => {
  for (const message of inspectMarkdownDiagrams(body).errors) {
    context.addIssue({ code: 'custom', message })
  }
})

export const questionCreateSchema = z.object({
  sectionTitle: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(300),
  body: questionBodySchema,
  tags: z.array(z.string().trim().min(1).max(40)).max(16).default([]),
  difficulty: z.enum(['basic', 'intermediate', 'advanced']).default('intermediate'),
  sources: z.array(z.object({
    title: z.string().trim().min(1).max(200),
    url: z.string().url().max(2_000),
  })).max(12).default([]),
})

export const questionPatchSchema = questionCreateSchema.partial().extend({
  version: z.number().int().positive(),
})

export function parseBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({ error: '请求数据不符合要求。', issues: result.error.issues })
    }
    req.validatedBody = result.data
    return next()
  }
}
