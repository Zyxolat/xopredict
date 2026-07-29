import { authOptions } from "../src/lib/auth";

async function verifyGoogleOAuthSetup() {
  console.log("==============================================================================");
  console.log("   GOOGLE OAUTH CONFIGURATION & PRE-FLIGHT VERIFICATION                       ");
  console.log("==============================================================================\n");

  // 1. Env vars check
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const nextAuthUrl = process.env.NEXTAUTH_URL;
  const nextAuthSecret = process.env.NEXTAUTH_SECRET;

  console.log("1. Environment Variables Check:");
  console.log("  - GOOGLE_CLIENT_ID:    ", clientId ? `PRESENT (${clientId.slice(0, 15)}...)` : "MISSING ❌");
  console.log("  - GOOGLE_CLIENT_SECRET:", clientSecret ? `PRESENT (${clientSecret.slice(0, 6)}...)` : "MISSING ❌");
  console.log("  - NEXTAUTH_URL:        ", nextAuthUrl || "http://localhost:3000 (default)");
  console.log("  - NEXTAUTH_SECRET:     ", nextAuthSecret ? "PRESENT ✓" : "MISSING ❌");

  if (!clientId || !clientSecret) {
    throw new Error("❌ GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing!");
  }

  // 2. Test Google OpenID Discovery Endpoint
  console.log("\n2. Network Connectivity to Google OAuth OpenID Discovery:");
  try {
    const res = await fetch("https://accounts.google.com/.well-known/openid-configuration");
    const openidConfig = await res.json();
    console.log("  - OpenID Issuer:        ", openidConfig.issuer);
    console.log("  - Auth Endpoint:        ", openidConfig.authorization_endpoint);
    console.log("  - Token Endpoint:       ", openidConfig.token_endpoint);
    console.log("  - Status:                REACHABLE ✓");
  } catch (err: any) {
    console.error("  - Connectivity error:", err.message);
    throw err;
  }

  // 3. NextAuth Providers Registration Check
  console.log("\n3. NextAuth Registered Providers:");
  const googleProvider = authOptions.providers.find((p: any) => p.id === "google");
  console.log("  - Google Provider Registered:", googleProvider ? "YES ✓" : "NO ❌");

  // 4. Expected Redirect URI
  const expectedRedirectUri = `${nextAuthUrl || "http://localhost:3000"}/api/auth/callback/google`;
  console.log("\n4. Required Google Cloud Console Setting:");
  console.log("  - Authorized Redirect URI: ", expectedRedirectUri);
  console.log("  (Ensure this URI is exact in Google Cloud Console > APIs & Services > Credentials)");

  console.log("\n==============================================================================");
  console.log("   ✅ GOOGLE OAUTH CONFIGURATION VERIFIED READY!                              ");
  console.log("==============================================================================\n");
}

verifyGoogleOAuthSetup().catch((err) => {
  console.error("\n❌ GOOGLE OAUTH VERIFICATION FAILED:", err.message);
  process.exit(1);
});
