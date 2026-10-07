import { NewApplicationClient, type NewApplicationMode } from './new-application-client';

function readMode(mode: string | string[] | undefined): NewApplicationMode {
  const value = Array.isArray(mode) ? mode[0] : mode;
  if (value === 'quick' || value === 'manual' || value === 'parse') return value;
  return 'parse';
}

export default async function NewApplicationPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string | string[] }>;
}) {
  const params = await searchParams;
  return <NewApplicationClient initialMode={readMode(params.mode)} />;
}
