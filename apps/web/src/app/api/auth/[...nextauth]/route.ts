import NextAuth from 'next-auth';
import GithubProvider from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';
import AuthentikProvider from 'next-auth/providers/authentik';
import CredentialsProvider from 'next-auth/providers/credentials';

const handler = NextAuth({
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID || 'mock_client_id',
      clientSecret: process.env.GITHUB_SECRET || 'mock_client_secret',
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_ID || 'mock_google_id',
      clientSecret: process.env.GOOGLE_SECRET || 'mock_google_secret',
    }),
    AuthentikProvider({
      clientId: process.env.AUTHENTIK_ID || 'mock_authentik_id',
      clientSecret: process.env.AUTHENTIK_SECRET || 'mock_authentik_secret',
      issuer: process.env.AUTHENTIK_ISSUER || 'http://localhost:9000/application/o/k-monitor/',
      authorization: `${process.env.AUTHENTIK_ISSUER || 'http://localhost:9000/application/o/k-monitor/'}authorize`,
      token: `${process.env.AUTHENTIK_ISSUER || 'http://localhost:9000/application/o/k-monitor/'}token`,
      userinfo: `${process.env.AUTHENTIK_ISSUER || 'http://localhost:9000/application/o/k-monitor/'}userinfo`
    }),
    CredentialsProvider({
      name: 'Development Admin',
      credentials: {
        username: { label: "Username", type: "text", placeholder: "admin" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (credentials?.username === 'admin' && credentials?.password === 'admin') {
          return { id: "1", name: "Admin (Sandbox)", email: "admin@kmonitor.local" };
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
  secret: process.env.NEXTAUTH_SECRET || 'secret',
});

export { handler as GET, handler as POST };
