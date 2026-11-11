import React, { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [isDark]);

  return (
    <button
      onClick={() => setIsDark(!isDark)}
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        padding: '10px 16px',
        borderRadius: '20px',
        backgroundColor: isDark ? '#ffffff' : '#121212',
        color: isDark ? '#121212' : '#ffffff',
        border: 'none',
        cursor: 'pointer',
        fontWeight: 'bold',
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
        zIndex: 9999,
        transition: 'all 0.3s ease'
      }}
    >
      {isDark ? '☀️ Light Mode' : '🌙 Dark Mode'}
    </button>
  );
}