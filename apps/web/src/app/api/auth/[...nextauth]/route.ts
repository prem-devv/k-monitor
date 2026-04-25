import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Admin Login',
      credentials: {
        username: { label: "Username", type: "text", placeholder: "admin" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (credentials?.username === 'admin' && credentials?.password === 'admin') {
          return { id: "1", name: "Admin", email: "admin@kmonitor.local" };
        }
        return null;
      }
    }),
  ],
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    session({ session, token }) {
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'default-secret-change-in-production',
});

export { handler as GET, handler as POST };
