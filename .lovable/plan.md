

## Fix: Infinite render loop on published site

### What's happening

The "Something went wrong" screen is the router's error boundary catching React's `Maximum update depth exceeded` error. It's not related to publishing — the same bug exists in preview, but it's surfacing now because on the published site you're loading routes from a fresh session where auth needs to resolve.

### Root cause

In `src/components/AppShell.tsx`, the `ProtectedShell` component does:

```tsx
return <Navigate to="/login" search={{ redirect: location.href }} />;
```

`<Navigate>` from TanStack Router triggers a navigation **on every render**. Because the `search` object is rebuilt with a fresh `location.href` value each render, and `useLocation()` returns a new reference on each router update, the navigation re-fires → router updates → component re-renders → `<Navigate>` fires again → infinite loop. React kills it after the depth limit and shows the error screen.

Same pattern applies to the coach-only redirect (`<Navigate to="/" search={{ restricted: "1" } as never} />`).

A secondary contributor: `useAuth` calls `setLoading(false)` in `onAuthStateChange` even when there's no user, which can flip `loading` back and forth as Supabase emits `INITIAL_SESSION` and other events, keeping the redirect re-evaluating.

### The fix

**1. Replace `<Navigate>` with imperative `useNavigate` inside an effect** in `src/components/AppShell.tsx`. This is the standard TanStack Router pattern for auth gating — it runs once when conditions change, not on every render.

```tsx
useEffect(() => {
  if (loading) return;
  if (!user) {
    navigate({ to: "/login", search: { redirect: location.pathname }, replace: true });
  } else if (coachOnly && role !== "head_coach" && role !== "assistant_coach") {
    navigate({ to: "/", search: { restricted: "1" }, replace: true });
  }
}, [loading, user, role, coachOnly]);
```

While redirecting, render the same loading spinner so nothing flashes. Use `location.pathname` (stable string) instead of `location.href`.

**2. Harden `useAuth`** so `loading` only flips `true → false` once, and `onAuthStateChange` doesn't re-trigger the loading state after initial resolution. Track an `initialized` ref so subsequent auth events update `user`/`session` without touching `loading`.

**3. Apply the same effect-based redirect pattern** to `/login` and `/signup` (they currently use `useEffect` + `navigate` already, which is correct — just verify they pass `replace: true` so back-button doesn't bounce).

### Files to change

- `src/components/AppShell.tsx` — swap `<Navigate>` for `useEffect` + `useNavigate`
- `src/hooks/useAuth.tsx` — guard `setLoading` so it only fires on initial resolution

### Out of scope

No schema changes, no new routes, no UI changes. Pure bug fix. After this, your published site will load `/profile` (or wherever you land), let head-coach users see the join code, and let players use it on signup as designed.

