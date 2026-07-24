/**
 * Centralised server-side auth helpers.
 *
 * Every helper returns a discriminated AuthResult so callers can short-circuit
 * with a single `if (!auth.ok) return auth.response` pattern.
 *
 * requireSession() – any authenticated user
 * requireSelf(playerId) – authenticated user whose player.id === playerId
 * requireAdmin() – authenticated user whose user.isAdmin === true
 */
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ------------------------------------------------------------------
// Shared types
// ------------------------------------------------------------------

export type SessionUser = { id: string; isAdmin: boolean };
export type SessionPlayer = { id: string; address: string | null; isBanned: boolean };

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
 * Returns 401 if no session or user deleted.
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
    select: { id: true, isAdmin: true },
  });

  if (!user) {
    // Session token valid but user was deleted from DB
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const player = await prisma.player.findUnique({
    where: { userId: session.user.id },
    select: { id: true, address: true, isBanned: true },
  });

  return { ok: true, user, player };
}

// ------------------------------------------------------------------
// requireSelf
// ------------------------------------------------------------------

/**
 * Verifies the authenticated player's ID matches `playerId`.
 *
 * Returns 401 if no session, 403 if the player ID does not match the
 * session's linked player.
 *
 * Use this for GET query-param routes where the playerId is available
 * before reading a request body.  For POST routes with the playerId in
 * the body, call requireSession() first and then call assertSelf() after
 * parsing the body so the body stream is not consumed twice.
 */
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

/**
 * Synchronous check used in POST routes after the body has already been
 * parsed.  Returns an AuthFail response object if the player IDs do not
 * match, or null if they do.
 *
 * Typical pattern:
 *   const auth = await requireSession();
 *   if (!auth.ok) return auth.response;
 *   const body = schema.parse(await req.json());
 *   const fail = assertSelf(auth, body.playerId);
 *   if (fail) return fail.response;
 */
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
// requireAdmin
// ------------------------------------------------------------------

/**
 * Verifies the authenticated user has isAdmin === true.
 *
 * Returns 401 if no session, 403 if authenticated but not an admin.
 */
export async function requireAdmin(): Promise<AuthResult> {
  const base = await requireSession();
  if (!base.ok) return base;

  if (!base.user.isAdmin) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return base;
}
