import { LoginScreen } from '@/components/auth/LoginScreen';
import { readLoginFeature, safeNextPath } from '@/lib/safe-next-path';
import { readPublicSupabase } from '@/lib/public-env';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[]; feature?: string | string[] }>;
}) {
  const params = await searchParams;
  const nextValue = Array.isArray(params.next) ? params.next[0] : params.next;
  const featureValue = Array.isArray(params.feature) ? params.feature[0] : params.feature;
  return (
    <div className="px-4 md:px-6 py-8 max-w-lg mx-auto">
      <LoginScreen
        configured={readPublicSupabase() !== null}
        nextPath={safeNextPath(nextValue)}
        feature={readLoginFeature(featureValue)}
      />
    </div>
  );
}
