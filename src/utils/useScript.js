import { useEffect, useState } from 'react';

export const useScript = (src) => {
  const [status, setStatus] = useState(src ? 'loading' : 'idle');

  useEffect(() => {
    if (!src) {
      setStatus('idle');
      return;
    }

    let script = document.querySelector(`script[src="${src}"]`);
    if (!script) {
      script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.dataset.status = 'loading';
      document.body.appendChild(script);
    } else {
      setStatus(script.dataset.status || 'ready');
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

  return status;
};
