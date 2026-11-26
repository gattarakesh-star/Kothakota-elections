'use client';

import { useEffect, useState } from 'react';

export default function AutoRefresh({ seconds = 60 }) {
  const [left, setLeft] = useState(seconds);

  useEffect(() => {
    const timer = setInterval(() => {
      setLeft((value) => {
        if (value <= 1) {
          window.location.reload();
          return seconds;
        }
        return value - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [seconds]);

  return <span className="pill live">● Live · next refresh {left}s</span>;
}
