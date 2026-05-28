import { withAuth } from "next-auth/middleware"

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
  pages: {
    signIn: "/login",
  },
})

export const config = {
  matcher: [
    "/((?!api/auth|login|_next/static|_next/image|icon-192\\.png|icon-512\\.png|manifest\\.json|sw\\.js).*)",
  ],
}
