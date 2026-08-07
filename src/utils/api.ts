/**
 * Utility to build absolute API endpoints for mobile Expo apps.
 * In mobile native apps, relative URLs like '/api/chats' will fail.
 * This helper resolves absolute URL dynamically or uses window.location.origin.
 */

export const getBaseUrl = (): string => {
  if (
    typeof window !== "undefined" &&
    window.location &&
    window.location.origin &&
    window.location.origin !== "null"
  ) {
    return window.location.origin;
  }
  // Absolute Cloud Run app URL fallback for mobile Expo apps
  return "https://ais-dev-imjvrr4xf5yhnyoaql4jgk-743342040073.asia-southeast1.run.app";
};

export const apiUrl = (path: string): string => {
  const base = getBaseUrl().replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
};
