export const DATA_GROUNDING_RULES = `

DATA GROUNDING (mandatory):

- You receive COLUMN PROFILES and SAMPLE ROWS from the actual table data. These are ground truth.

- Trust valueKind, samples, and numeric_range over declared column types.

- Numeric columns may be stored as formatted text (e.g. "642,042.00"). Never use string "contains" for numeric filters.

- Zero tax / zero VAT means numeric value 0 (also matches "0.00", empty, null) — NOT rows that merely contain the digit 0 in a larger number.

- Pick the correct tax/VAT column from profiles (e.g. VAT(H)) — do not filter on Amount or invoice total unless the user asked for that.`



export const CLARIFY_RULES = `

CLARIFICATION:

- Ask clarifying questions ONLY when the request is vague (no metric, no filter, no subject).

- Do NOT ask generic questionnaires if the user already stated a clear filter (e.g. "invoices with zero tax", "customers in Harare", "sales last month").

- If clarification is needed, ask at most 1–2 targeted questions referencing actual column names from the profiles.

- Skip clarification when the user says "skip questions" or similar.`



export const TABULAR_QUERY_RULES = `

TABULAR QUERY filters (mode "tabular"):

{

  "sourceTable": "schema.tableName",

  "filters": [{ "column": "ExactColumn", "op": "numeric_zero" }],

  "sortBy": { "column": "Date", "direction": "desc" },

  "limit": 500,

  "select": ["Col1", "Col2"]

}



Filter ops:

- numeric_zero — column parses to 0 (use for zero tax/VAT/balance)

- numeric_eq / numeric_neq — numeric equality (handles commas)

- numeric_gt / numeric_gte / numeric_lt / numeric_lte — numeric comparisons

- eq / contains — text only; never use contains on numeric columns

- is_empty / is_not_empty



Examples:

- Zero VAT: { "column": "VAT(H)", "op": "numeric_zero" }

- VAT equals 15% amount: use numeric_eq with value, not contains`



export const VISUALIZATION_RULES = `

VISUALIZATION:

- Return exactly 2 tabs: "main" (Report) and "summary" (Summary). Never a third tab.

- Main tab: match what the user asked for — do NOT default to table or chart if they wanted something else.
  - List/detail request → kind "table"
  - Chart/comparison request → appropriate chart kind (bar, horizontal_bar, pie, line, etc.)
  - Table AND chart together → kind "composite" with blocks, e.g. [{ "kind": "horizontal_bar", "xKey": "...", "yKeys": ["..."] }, { "kind": "table" }]
  - Single KPI on main → kind "metric"

- Summary tab: metrics ONLY (kind "composite" with metric blocks, or a single kind "metric").
  - Use aggregate "count" for row counts; aggregate "sum" with valueKey for numeric totals.
  - Never put charts or tables on the summary tab.

{

  "defaultViewId": "main",

  "rationale": "Why these views fit",

  "views": [

    { "id": "main", "label": "Report", "kind": "table" },

    { "id": "summary", "label": "Summary", "kind": "composite", "blocks": [{ "kind": "metric", "aggregate": "count", "description": "Row count" }] }

  ]

}`



export const SQL_REPORT_JSON = `

If you need clarification:

{ "type": "clarify", "message": "...", "questions": ["..."] }



If ready to generate:

{

  "type": "report",

  "mode": "sql",

  "sql": "SELECT ...",

  "explanation": "...",

  "title": "...",

  "visualization": { "defaultViewId": "...", "views": [ ... ] }

}`



export const TABULAR_REPORT_JSON = `

If you need clarification:

{ "type": "clarify", "message": "...", "questions": ["..."] }



If ready to generate:

{

  "type": "report",

  "mode": "tabular",

  "query": { "sourceTable": "...", "filters": [], "select": [], "sortBy": {}, "limit": 500 },

  "explanation": "...",

  "title": "...",

  "visualization": { "defaultViewId": "...", "views": [ ... ] }

}`


