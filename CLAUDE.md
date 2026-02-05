# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a World App Mini App built with Next.js 15. Mini apps are native-like applications that run within the World App ecosystem, using wallet-based authentication via MiniKit.

## Documentation

`llms-full.txt` contains comprehensive World Mini App documentation in [llmstxt.org](https://llmstxt.org) standard format. Reference this file for MiniKit APIs, World ID integration, and mini app development patterns.

## Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run lint     # ESLint
npm run start    # Start production server
```

For local development with World App testing:
1. Run `ngrok http 3000` to create a public tunnel
2. Set `AUTH_URL` in `.env.local` to your ngrok URL
3. Update the app URL in developer.worldcoin.org

## Architecture

### Authentication Flow
- Uses `@worldcoin/minikit-js` wallet auth with `next-auth` (v5 beta) for session management
- Auth configuration: `src/auth/index.ts` - Credentials provider verifying SIWE messages
- Middleware (`middleware.ts`) exports auth for route protection
- Wallet helpers split between client (`src/auth/wallet/client-helpers.ts`) and server (`src/auth/wallet/server-helpers.ts`)

### Provider Stack (src/providers/index.tsx)
Wraps app in this order:
1. `ErudaProvider` - In-browser console for debugging (disable in production)
2. `MiniKitProvider` - Required for all MiniKit functionality
3. `SessionProvider` - next-auth session context

### Route Structure
- `/` - Public landing/login page
- `/(protected)/*` - Authenticated routes with bottom navigation
- `/api/auth/[...nextauth]` - Auth API routes
- `/api/verify-proof` - World ID proof verification
- `/api/initiate-payment` - Payment initiation

### Key Components (src/components/)
- `AuthButton` - Wallet auth trigger
- `Pay` - Payment functionality
- `Verify` - World ID verification
- `Transaction` - Blockchain transaction handling
- `ViewPermissions` - Permission management

## Environment Variables

Required in `.env.local`:
- `AUTH_SECRET` - Generate with `npx auth secret`
- `AUTH_URL` - Your app URL (ngrok URL for dev, production URL for prod)
- `NEXT_PUBLIC_APP_ID` - From developer.worldcoin.org

## UI Framework

Uses `@worldcoin/mini-apps-ui-kit-react` for World App design system compliance. Import styles in root layout:
```typescript
import '@worldcoin/mini-apps-ui-kit-react/styles.css';
```
