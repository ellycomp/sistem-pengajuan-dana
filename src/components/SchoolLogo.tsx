import { useState } from 'react';
import { SIT_QUDWAH_LOGO_URL } from '../data/seedData';

interface SchoolLogoProps {
  className?: string;
}

export function SchoolLogo({ className = 'w-10 h-12' }: SchoolLogoProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        className={`${className} rounded flex items-center justify-center bg-[#FFFFFF] border border-[#BEC9C6] text-[#00433C] shrink-0`}
        role="img"
        aria-label="Logo SIT Qudwah"
      >
        <svg
          viewBox="0 0 40 48"
          className="w-4/5 h-4/5"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M20 4L35 10V23C35 33.2 28.5 40.9 20 44C11.5 40.9 5 33.2 5 23V10L20 4Z"
            fill="#00433C"
          />
          <path
            d="M20 9L30 13V22.5C30 29.8 25.5 35.6 20 38.2C14.5 35.6 10 29.8 10 22.5V13L20 9Z"
            fill="#CDE8E2"
          />
          <path
            d="M15 20.5C15 17.7 17.2 15.5 20 15.5C22.8 15.5 25 17.7 25 20.5V28H15V20.5Z"
            fill="#00433C"
          />
          <circle cx="20" cy="21" r="2.2" fill="#FFFFFF" />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={SIT_QUDWAH_LOGO_URL}
      alt="Logo SIT Qudwah"
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={`${className} rounded object-contain bg-[#FFFFFF] border border-[#BEC9C6] p-0.5 shrink-0`}
    />
  );
}
