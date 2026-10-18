import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { withBasePath } from '@/lib/base-path'

const isProtectedRoute = createRouteMatcher(['/travel-planner(.*)', '/plans(.*)', '/profile(.*)'])

export default clerkMiddleware(
  async (auth, req) => {
    if (isProtectedRoute(req)) await auth.protect()
  },
  { signInUrl: withBasePath('/sign-in'), signUpUrl: withBasePath('/sign-up') }
)

export const config = {
  matcher: [
    // The bare base path (e.g. /planit) isn't matched by the pattern below when basePath is set
    '/',
    // Skip Next.js internals, the health check and all static files, unless found in search params
    '/((?!_next|api/health|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes except the health check
    '/(api(?!/health)|trpc)(.*)',
  ],
}
