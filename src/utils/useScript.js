import { useEffect, useState } from 'react';

export const useScript = (src) => {
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    if (!src) return;

    const deferStatus = (nextStatus) => {
      queueMicrotask(() => setStatus(nextStatus));
    };

    let script = document.querySelector(`script[src="${src}"]`);
    if (!script) {
      script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.dataset.status = 'loading';
      document.body.appendChild(script);
      deferStatus('loading');
    } else {
      deferStatus(script.dataset.status || 'ready');
    }

    const handleLoad = () => {
      script.dataset.status = 'ready';
      setStatus('ready');
    };
    const handleError = () => {
      script.dataset.status = 'error';
      setStatus('error');
    };

    script.addEventListener('load', handleLoad);
    script.addEventListener('error', handleError);

    return () => {
      script.removeEventListener('load', handleLoad);
      script.removeEventListener('error', handleError);
    };
  }, [src]);

  return src ? status : 'idle';
};
