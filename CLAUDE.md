# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Installation & Setup:**
```bash
npm install
cp .env.example .env  # Then fill in Supabase credentials
```

**Development:**
```bash
npm run dev          # Start development server (http://localhost:5173)
npm run build        # Build for production
npm run preview      # Preview production build locally
npm run lint         # Run oxlint for code quality
```

**Testing:**
- No formal test framework configured yet
- Manual testing via browser recommended
- Test Supabase functions using the SQL editor in Supabase dashboard

## Project Structure

```
/
├── src/                 # Source code
│   ├── pages/           # Route-based pages (React Router v7)
│   │   ├── Dashboard.tsx      # Main dashboard with video stats
│   │   ├── Videos.tsx         # Video list and management
│   │   ├── BolReviewUpload.tsx # Special upload flow for Bol.com
│   │   ├── Login.tsx          # Authentication pages
│   │   ├── Register.tsx
│   │   ├── Settings.tsx
│   │   ├── Campaigns.tsx
│   │   ├── RandomPicker.tsx
│   │   ├── Reuploads.tsx
│   │   └── UploadCalendar.tsx
│   ├── components/      # Shared reusable components
│   │   └── Layout.tsx     # Main app layout with navigation
│   ├── hooks/           # Custom React hooks
│   │   ├── useAuth.tsx    # Supabase authentication wrapper
│   │   └── useBookmarks.ts # Bookmark management
│   ├── lib/             # Utilities and services
│   │   ├── supabase.ts    # Supabase client initialization
│   │   └── campaigns.ts   # Campaign-related logic
│   ├── App.tsx          # Root app component
│   └── main.tsx         # Entry point
├── supabase/            # Supabase configuration
│   ├── campaign-tables.sql  # Schema for campaigns feature
│   └── functions/         # Edge functions
│       └── api/
│           └── generate-description.ts  # AI description generator
├── public/              # Static assets
├── dist/                # Built output (gitignored)
├── migrations.sql       # Complete database schema
�└── *.sql                # Individual migration scripts
```

## Key Architectural Decisions

**State Management:**
- React hooks primarily for local state
- Supabase for persistent data (real-time capabilities not fully utilized yet)
- Authentication state managed via `useAuth` hook

**Data Layer:**
- Supabase PostgreSQL database with Row Level Security (RLS)
- Tables: `videos`, `video_platforms`, plus campaign-related tables
- All data access goes through Supabase JS client (`@supabase/supabase-js`)
- RLS policies ensure users can only access their own data

**Routing:**
- React Router v7 with file-based convention in `pages/` directory
- Protected routes implemented via wrapper components (check auth in each page)

**Styling:**
- MUI (Material UI) v5 with iOS/macOS theme customization
- Emotion for styling (via MUI's default styling solution)
- Responsive design using MUI's breakpoint system

**Deployment:**
- Cloudflare Pages with automatic builds from GitHub
- Build command: `npm run build` (runs TypeScript compilation then Vite build)
- Output directory: `dist`
- Environment variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

## Common Development Patterns

**Adding New Pages:**
1. Create component in `src/pages/` (e.g., `NewFeature.tsx`)
2. Add route implicitly through file naming (React Router v7 convention)
3. Ensure authentication checks if needed (follow pattern in existing pages)
4. Add navigation link in `Layout.tsx` if should appear in menu

**Database Operations:**
1. Use the Supabase client from `src/lib/supabase.ts`
2. Follow RLS policies - all queries should include user_id filtering
3. For mutations, use `insert`, `update`, `upsert`, `delete` methods
4. Handle loading/error states with React state or query libraries

**Authentication:**
- Check session via `useAuth()` hook in `src/hooks/useAuth.tsx`
- Access user data: `const { user, session } = useAuth()`
- Protect routes by redirecting if `!session` (see Login/Register pages)
- Sign out via `signOut()` function from the hook

**Form Handling:**
- Controlled components with React state
- Form validation typically done manually or with HTML5 validation
- Submission handled via async functions calling Supabase

## Environment Variables

Required in `.env` (never commit actual values):
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous API key

These are exposed to the client-side code via Vite's environment variable prefixing.

## Files to Reference

- **Database Schema:** `migrations.sql` (complete schema) or individual `*.sql` files
- **Supabase Functions:** `supabase/functions/api/generate-description.ts`
- **Authentication Logic:** `src/hooks/useAuth.tsx`
- **Routing:** Implicit via `src/pages/` structure and `src/main.tsx`
- **Styling Theme:** Customized through MUI theme in `src/main.tsx` or individual components

## Deployment Notes

1. Push to GitHub triggers Cloudflare Pages build
2. Build output goes to `dist/` directory
3. Ensure environment variables are set in Cloudflare Pages dashboard
4. Common build issues: TypeScript errors, missing environment variables
5. Rollback: Redeploy previous successful build from Cloudflare dashboard
