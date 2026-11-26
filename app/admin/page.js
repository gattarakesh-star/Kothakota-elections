import { cookies } from 'next/headers';
import { isAuthenticated, COOKIE } from '../../lib/auth';
import results from '../../data/results.json';
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
  return <AdminForm initial={results} />;
}
