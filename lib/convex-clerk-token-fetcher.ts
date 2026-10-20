type ClerkGetToken = (options: { template?: string; skipCache?: boolean }) => Promise<string | null>;

// Match Convex's Clerk adapter for both supported configurations. Clerk owns
// token issuance/cache; the official Convex provider owns server confirmation.
export function clerkTokenFetcher(getToken: ClerkGetToken, usesSessionToken: boolean, retry: boolean) {
  return async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
    try {
      return await getToken({
        ...(usesSessionToken ? {} : { template: "convex" }),
        skipCache: forceRefreshToken || retry,
      });
    } catch {
      return null;
    }
  };
}
