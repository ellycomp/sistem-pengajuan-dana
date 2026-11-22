import { useEffect, useState } from 'react';
import { SIT_QUDWAH_LOGO_URL } from '../data/seedData';

const CUSTOM_LOGO_KEY = 'sit_qudwah_custom_logo_v1';
const LOGO_EVENT = 'sit-qudwah-logo-updated';

function readCustomLogo(): string {
  try {
    return localStorage.getItem(CUSTOM_LOGO_KEY) || '';
  } catch {
    return '';
  }
}

interface SchoolLogoProps {
  className?: string;
}

export function SchoolLogo({ className = 'w-10 h-12' }: SchoolLogoProps) {
  const [customLogo, setCustomLogo] = useState<string>(readCustomLogo);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const refreshLogo = () => {
      setCustomLogo(readCustomLogo());
      setHasError(false);
    };
    window.addEventListener(LOGO_EVENT, refreshLogo);
    window.addEventListener('storage', refreshLogo);
    return () => {
      window.removeEventListener(LOGO_EVENT, refreshLogo);
      window.removeEventListener('storage', refreshLogo);
    };
  }, []);

  const logoSource = customLogo || SIT_QUDWAH_LOGO_URL;

  if (hasError) {
    return (
      <div className={`${className} rounded flex items-center justify-center bg-white border border-[#BEC9C6] text-[#00433C] shrink-0`} role="img" aria-label="Logo SIT Qudwah">
        <span className="text-[10px] font-bold">SIT QUDWAH</span>
      </div>
    );
  }

  return (
    <img
      src={logoSource}
      alt="Logo SIT Qudwah"
      onError={() => setHasError(true)}
      className={`${className} object-contain shrink-0`}
    />
  );
}
