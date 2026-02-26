## Web Dashboard (`apps/docs`)

This is the primary (web-first) UI for the Student Activity Tracker.

## Run locally

```bash
npm run dev
```

Open `http://localhost:3000`.

## Environment variables

Create `apps/docs/.env.local`:

```bash
NEXT_PUBLIC_AUTH_SERVICE_URL=http://localhost:4000
NEXT_PUBLIC_PLANNER_SERVICE_URL=http://localhost:4001
NEXT_PUBLIC_HABIT_SERVICE_URL=http://localhost:4002
NEXT_PUBLIC_ANALYTICS_SERVICE_URL=http://localhost:4003
NEXT_PUBLIC_WHATSAPP_BOT_NUMBER=+15551234567
```

## Notes
- This app uses `@repo/store` for API calls + typed hooks.
- Auth is cookie-based (`credentials: 'include'`), with optional Bearer tokens for native/mobile.

## Links
- Architecture overview: `docs/ARCHITECTURE.md`
- Roadmap feature matrix: `docs/COMPARE_PHASES_STATUS.md`

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn/foundations/about-nextjs) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_source=github.com&utm_medium=referral&utm_campaign=turborepo-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
