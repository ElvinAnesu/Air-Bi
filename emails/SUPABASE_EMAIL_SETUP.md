# AirBI auth email setup (Supabase + Resend SMTP)

Billing emails and renewal cron are **disabled for now**. This guide covers **sign-up confirmation** and **password reset** only.

## 1. Paste email templates

**Supabase Dashboard → Authentication → Email Templates**

| Template | File |
|----------|------|
| Confirm signup | `emails/supabase/confirmation.html` |
| Reset password | `emails/supabase/recovery.html` |

## 2. URL configuration

**Authentication → URL Configuration**

- **Site URL:** `https://www.airbi.online` (production) or `http://localhost:3000` (local)
- **Redirect URLs:**
  - `https://www.airbi.online/auth/reset-password`
  - `https://www.airbi.online/login`
  - `http://localhost:3000/auth/reset-password`
  - `http://localhost:3000/login`

## 3. Enable email confirmation

**Authentication → Providers → Email** → turn **Confirm email** **ON**.

## 4. Resend SMTP in Supabase

**Project Settings → Authentication → SMTP** — use your Resend SMTP settings; sender `team@airbi.online`.

## 5. Local env

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Plus your existing Supabase keys. No `RESEND_API_KEY` or `CRON_SECRET` needed in the Next.js app for auth-only.

## 6. App auth routes (already in codebase)

- Sign up → may require email confirmation before sign-in
- Forgot password → login page → `/api/auth/forgot-password`
- Reset password → `/auth/reset-password` → `/api/auth/reset-password`
