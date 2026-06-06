export const DEFAULT_CLARIFY_QUESTIONS = [
  "Which table or metric should this report focus on?",
  "How should results be grouped or sorted?",
]

export function formatClarifyResponse(message: string, questions: string[]): string {
  const list = questions.map((q, i) => `${i + 1}. ${q}`).join("\n")
  return `${message}\n\n${list}`
}

const SKIP_PATTERNS =
  /\b(skip\s+(the\s+)?questions?|skip\s+clarification|no\s+questions?|just\s+(create|build|make|generate)|proceed\s+without|don'?t\s+ask)\b/i

const SPECIFIC_INTENT_PATTERNS =
  /\b(zero|no\s+vat|without\s+tax|tax\s*=\s*0|vat\s*\(\s*h\s*\)\s*=\s*0|where\b.+\b(is|are|=)\s*(zero|0)|invoices?\s+with|customers?\s+with|orders?\s+with|show\s+(me\s+)?(all\s+)?(the\s+)?\w+\s+where)\b/i

export function userSkippedQuestions(message: string): boolean {
  return SKIP_PATTERNS.test(message.trim())
}

export function hasSpecificReportIntent(message: string): boolean {
  return SPECIFIC_INTENT_PATTERNS.test(message.trim())
}

export function conversationHadClarification(
  history: Array<{ role: string; content: string }>
): boolean {
  return history.some(
    (h) =>
      h.role === "assistant" &&
      (/\d+\.\s/.test(h.content) || /clarif/i.test(h.content)) &&
      h.content.includes("?")
  )
}

export function requiresClarification(
  history: Array<{ role: string; content: string }>,
  message: string
): boolean {
  if (userSkippedQuestions(message)) return false
  if (hasSpecificReportIntent(message)) return false
  if (conversationHadClarification(history)) return false
  return history.length === 0
}
