//FRONT/src/components/Toast.jsx
import { useState, useCallback, useEffect, useRef } from 'react';

let _addToast = null;

export function useToast() {
  return useCallback((msg, type = 'info') => {
    _addToast?.(msg, type);
  }, []);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  const id = useRef(0);

  useEffect(() => {
    _addToast = (msg, type) => {
      const key = ++id.current;
      setToasts(prev => [...prev, { key, msg, type }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.key !== key)), 4000);
    };
    return () => { _addToast = null; };
  }, []);

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.key} className={`toast ${t.type}`}>{t.msg}</div>
      ))}
    </div>
  );
}