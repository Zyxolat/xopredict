/**
 * Centralised server-side auth helpers.
 *
 * Every helper returns a discriminated AuthResult so callers can short-circuit
 * with a single `if (!auth.ok) return auth.response` pattern.
 *
 * requireSession() – any authenticated user
 * requireSelf(playerId) – authenticated user whose player.id === playerId
 * requireAdmin() – authenticated user whose user.role === 'ADMIN' or user.isAdmin === true
 * requireEmailVerified() – authenticated user whose email is verified
 */
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ------------------------------------------------------------------
// Shared types
// ------------------------------------------------------------------

export type SessionUser = {
  id: string;
  email: string | null;
  username: string | null;
  displayName: string | null;
  role: string;
  isAdmin: boolean;
  emailVerified: Date | null;
};

export type SessionPlayer = {
  id: string;
  address: string | null;
  isBanned: boolean;
};

export type AuthOk = {
  ok: true;
  user: SessionUser;
  player: SessionPlayer | null;
};

export type AuthFail = {
  ok: false;
  response: NextResponse;
};

export type AuthResult = AuthOk | AuthFail;

// ------------------------------------------------------------------
// requireSession
// ------------------------------------------------------------------

/**
 * Verifies there is a valid NextAuth JWT session and that the referenced
 * User record still exists in the database.
 *
 * Returns 401 if no session or user deleted/banned.
 */
export async function requireSession(): Promise<AuthResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      role: true,
      isAdmin: true,
      status: true,
      emailVerified: true,
      passwordChangedAt: true,
    },
  });

  if (!user || user.status === "BANNED" || user.status === "SUSPENDED") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: user?.status === "BANNED" ? "Account banned" : "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  // Reject JWTs issued before the user's last password change so that
  // password-change/reset actually invalidates previously issued sessions
  // (NextAuth's JWT strategy is stateless, so this stamp check is the real
  // invalidation mechanism — deleting Session rows has no effect on it).
  if (
    user.passwordChangedAt &&
    typeof session.iat === "number" &&
    session.iat * 1000 < user.passwordChangedAt.getTime()
  ) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Session expired due to a password change. Please sign in again." },
        { status: 401 }
      ),
    };
  }

  const player = await prisma.player.findUnique({
    where: { userId: session.user.id },
    select: { id: true, address: true, isBanned: true },
  });

  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      isAdmin: user.isAdmin || user.role === "ADMIN",
      emailVerified: user.emailVerified,
    },
    player,
  };
}

// ------------------------------------------------------------------
// requireEmailVerified
// ------------------------------------------------------------------

/**
 * Verifies the user has a verified email address.
 */
export async function requireEmailVerified(): Promise<AuthResult> {
  const base = await requireSession();
  if (!base.ok) return base;

  if (!base.user.emailVerified) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Email verification required" },
        { status: 403 }
      ),
    };
  }

  return base;
}

// ------------------------------------------------------------------
// requireSelf
// ------------------------------------------------------------------

export async function requireSelf(playerId: string): Promise<AuthResult> {
  const base = await requireSession();
  if (!base.ok) return base;

  if (!base.player) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Player profile not found for this account" },
        { status: 403 }
      ),
    };
  }

  if (base.player.id !== playerId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return base;
}

// ------------------------------------------------------------------
// assertSelf  (synchronous, for use after body parsing)
// ------------------------------------------------------------------

export function assertSelf(auth: AuthOk, playerId: string): AuthFail | null {
  if (!auth.player || auth.player.id !== playerId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return null;
}

// ------------------------------------------------------------------
// assertOwnsAddress
// ------------------------------------------------------------------

/**
 * Verifies the given wallet address matches the authenticated user's own
 * player address (synchronous, for use after body parsing — mirrors
 * assertSelf's playerId comparison but for on-chain addresses).
 */
export function assertOwnsAddress(auth: AuthOk, address: string): AuthFail | null {
  if (!auth.player?.address || auth.player.address.toLowerCase() !== address.toLowerCase()) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "This wallet address is not linked to your account" },
        { status: 403 }
      ),
    };
  }

  return null;
}

// ------------------------------------------------------------------
// requireAdmin
// ------------------------------------------------------------------

/**
 * Verifies the authenticated user has role === 'ADMIN' or isAdmin === true.
 *
 * Returns 401 if no session, 403 if authenticated but not an admin.
 */
export async function requireAdmin(): Promise<AuthResult> {
  const base = await requireSession();
  if (!base.ok) return base;

  if (!base.user.isAdmin && base.user.role !== "ADMIN") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return base;
}
