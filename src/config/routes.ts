import type { RouteData } from "@/types/routes";

/**
 * Route Config
 * ---------------------------
 * This file defines the application's route structure and access control.
 * It provides a central registry for all application routes along with
 * their metadata.
 *
 * To add a new route:
 * 1. Add the path constant to the paths object
 * 2. Add the route metadata to the routes object with the same key
 * 3. Specify accessType: "public" (unauthenticated only),
 *                        "protected" (authenticated only),
 *                        "universal" (both)
 *
 * Example:
 * RoutePaths.SETTINGS = "/settings"
 * Routes.SETTINGS = {
 *   name: "Settings Page",
 *   path: RoutePaths.SETTINGS,
 *   accessType: "protected",
 * }
 *
 * @module routes
 */

// ⚠️ DEFINE ROUTES HERE ⚠️
// Ensure every route in the app has an entry here
export const paths = {
  landingPage: "/",
  homePage: "/home",
  reelsUploadPage: "/reels/upload",
  sseDemoPage: "/sse-demo",
  sseApiRoute: "/api/sse",
  sseTestApiRoute: "/api/sse/test",
  sseStatusApiRoute: "/api/sse/status",
  sseConfigApiRoute: "/api/sse/config",
  ssePersistentApiRoute: "/api/sse/persistent",
} as const;

// ⚠️ DEFINE METADATA FOR NEW ROUTES HERE ⚠️
// Ensure every route in paths has a corresponding entry here
export const routes: Record<keyof typeof paths, RouteData> = {
  landingPage: {
    name: "Landing Page",
    path: paths.landingPage,
    accessType: "public",
  },
  homePage: {
    name: "Home Page",
    path: paths.homePage,
    accessType: "protected",
  },
  reelsUploadPage: {
    name: "Reels Upload Page",
    path: paths.reelsUploadPage,
    accessType: "protected",
  },
  sseDemoPage: {
    name: "SSE Demo Page",
    path: paths.sseDemoPage,
    accessType: "protected",
  },
  sseApiRoute: {
    name: "SSE API Route",
    path: paths.sseApiRoute,
    accessType: "universal",
  },
  sseTestApiRoute: {
    name: "SSE Test API Route",
    path: paths.sseTestApiRoute,
    accessType: "universal",
  },
  sseStatusApiRoute: {
    name: "SSE Status API Route",
    path: paths.sseStatusApiRoute,
    accessType: "universal",
  },
  sseConfigApiRoute: {
    name: "SSE Config API Route",
    path: paths.sseConfigApiRoute,
    accessType: "universal",
  },
  ssePersistentApiRoute: {
    name: "SSE Persistent API Route",
    path: paths.ssePersistentApiRoute,
    accessType: "universal",
  },
};
