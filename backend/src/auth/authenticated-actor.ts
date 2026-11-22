/**
 * The caller as established by authentication, never as sent by the browser.
 *
 * No authentication layer is enforced by this API yet, so no controller can
 * currently produce a real actor and callers receive `undefined`. Fields that
 * record "who did it" (e.g. a reconciliation) therefore store null until
 * authentication exists; the request body is never trusted for identity.
 */
export interface AuthenticatedActor {
  userId: number;
}
