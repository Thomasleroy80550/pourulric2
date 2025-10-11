import { useEffect, useState } from 'react';

export const useVersion = () => {
  const [version, setVersion] = useState<string>('');

  useEffect(() => {
    fetch('/version.json')
      .then((r) => r.json())
      .then((data) => setVersion(data.version))
      .catch(() => setVersion('dev'));
  }, []);

  return version;
};