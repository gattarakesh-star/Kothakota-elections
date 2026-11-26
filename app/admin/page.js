import { cookies } from 'next/headers';
import { isAuthenticated, COOKIE } from '../../lib/auth';
import { readState, seedState } from '../../lib/store';
import LoginForm from '../../components/LoginForm';
import AdminForm from '../../components/AdminForm';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Admin · Kothakota Election Results',
};

export default async function AdminPage() {
  const cookieStore = await cookies();
  const authenticated = isAuthenticated(cookieStore.get(COOKIE)?.value);

  if (!authenticated) return <LoginForm />;

  const onVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
  const supabaseReady = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
  const envReady = supabaseReady || Boolean(process.env.GITHUB_TOKEN) || !onVercel;

  let initial = seedState();
  let source = 'seed';
  try {
    const state = await readState();
    initial = state.data;
    source = state.source;
  } catch {
    // Keep the bundled seed so the admin page still renders.
  }

  return <AdminForm initial={initial} envReady={envReady} source={source} />;
}
