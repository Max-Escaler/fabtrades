/** The two things every function here needs: a JSON response, and a secret check. */

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Whether the `Authorization` header carries the expected shared secret.
 *
 * Compared in constant time: the header is attacker-controlled and the comparison is
 * cheap, which is the whole precondition for a timing oracle. `Bearer` is tolerated
 * but not required, because RevenueCat sends the configured value verbatim.
 *
 * An empty `expected` never authorizes, so a deploy that forgot its secret fails
 * closed rather than open.
 */
export function isAuthorized(header: string | null, expected: string): boolean {
  if (!header || !expected) return false;
  const encoder = new TextEncoder();
  const provided = encoder.encode(header.replace(/^Bearer\s+/i, ''));
  const secret = encoder.encode(expected);
  if (provided.length !== secret.length) return false;
  let differences = 0;
  for (let i = 0; i < provided.length; i++) {
    differences |= provided[i] ^ secret[i];
  }
  return differences === 0;
}
