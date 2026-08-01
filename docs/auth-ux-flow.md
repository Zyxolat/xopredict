# Authentication UX Navigation Flow

## Flow Specification
1. **Anonymous Visitor:** Visits `/` → Sees Public Landing Page (Hero, Stats, Arena/Leaderboard Previews, FAQ, Footer) with permanent `LOGIN` and `SIGN UP` header buttons.
2. **Registration:** Clicks `SIGN UP` → Navigates to `/register` → Submits registration details.
3. **Email OTP Verification:** Receives 6-digit OTP code → Enters code to verify email address.
4. **Login:** Redirects to `/login` → Enters credentials → Authenticates session.
5. **Dashboard Transition:** Navigates to `/` → Session detected → Renders `AuthenticatedDashboard`.
6. **Wallet Connection:** Navigates to `/settings/wallets` → Links EVM wallet → Signed nonce verified → Linked successfully.
7. **User Controls:** Top-right header updates to render Profile Avatar, Username, Wallet Status, Notification Bell, and User Dropdown menu.
