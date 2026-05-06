I checked the app code and the password reset route already exists at `/reset-password`, and the forgot-password form is already sending reset emails with `redirectTo: ${window.location.origin}/reset-password`. That means the app side is mostly in place. The likely fix is the authentication redirect allow-list in Lovable Cloud.

Plan to fix it:

1. Update Lovable Cloud auth redirect settings
   - Set the main Site URL to the published app URL:
     - `https://diamond-intel.lovable.app`
   - Add these allowed redirect URL patterns:
     - `https://diamond-intel.lovable.app/**`
     - `https://id-preview--29d04973-92d3-4d40-ab94-46026a489337.lovable.app/**`
     - `https://preview--diamond-intel.lovable.app/**`
     - `http://localhost:*/**`

2. Re-test with a fresh reset email
   - Old reset emails may still point to the wrong fallback URL.
   - Send a brand-new password reset email after saving the settings.
   - Click the new email link and confirm it opens `/reset-password` inside Diamond Intel.

3. Harden the app reset flow if needed
   - Keep `/reset-password` public so users are not redirected away before they set a new password.
   - Improve the reset page so it handles both hash-based recovery links and query-code recovery links reliably.
   - Prevent the normal auth redirect flow from immediately sending recovery users to `/home` before they finish choosing a new password.

How you can update the setting manually:

Desktop:
- Open Cloud from the top toolbar.
- Go to Users.
- Click the Auth settings gear.
- Open General settings / Advanced redirect settings.
- Update Site URL and Redirect URLs using the values above.

Mobile:
- Tap the `...` menu in Chat mode.
- Open Cloud.
- Go to Users.
- Open Auth settings.
- Update the same Site URL and Redirect URLs.

After that, request a new reset email. If it still lands on the wrong page, I’ll make the reset-flow hardening changes in the app code next.