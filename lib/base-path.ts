export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** Absolute in-app path including the base path, for places Next doesn't prefix (redirects, share links). */
export const withBasePath = (path: string) => `${BASE_PATH}${path}`;
