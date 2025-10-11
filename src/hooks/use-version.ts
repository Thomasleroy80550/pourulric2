import { useEffect, useState } from 'react';
import { getSetting } from '@/lib/admin-api';
import { APP_VERSION_KEY } from '@/lib/constants';

export const useVersion = () => {
  const [version, setVersion] = useState<string>('1.0.0.0');

  useEffect(() => {
    getSetting(APP_VERSION_KEY)
      .then((s) => setVersion(s?.value || '1.0.0.0'))
      .catch(() => setVersion('1.0.0.0'));
  }, []);

  return version;
};