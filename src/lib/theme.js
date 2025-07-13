/**
 * Theme utility functions for dark/light mode
 * Provides elegant dark/light theme switching with localStorage persistence
 */

export function getThemeToggleScript() {
  return `
    // Theme management
    function getTheme() {
      return localStorage.getItem('theme') || 
             (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    }
    
    function setTheme(theme) {
      localStorage.setItem('theme', theme);
      document.documentElement.setAttribute('data-theme', theme);
      updateThemeIcon();
    }
    
    function toggleTheme() {
      const currentTheme = getTheme();
      setTheme(currentTheme === 'dark' ? 'light' : 'dark');
    }
    
    function updateThemeIcon() {
      const theme = getTheme();
      const themeToggle = document.getElementById('theme-toggle');
      if (themeToggle) {
        themeToggle.innerHTML = theme === 'dark' 
          ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
          : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
      }
    }
    
    // Initialize theme on page load
    document.addEventListener('DOMContentLoaded', function() {
      const theme = getTheme();
      setTheme(theme);
    });
    
    // Apply theme immediately to prevent flash
    (function() {
      const theme = localStorage.getItem('theme') || 
                   (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', theme);
    })();
  `;
}

export function getThemeStyles() {
  return `
    :root {
      --bg-primary: #ffffff;
      --bg-secondary: #f8fafc;
      --bg-card: #ffffff;
      --text-primary: #1e293b;
      --text-secondary: #64748b;
      --text-muted: #94a3b8;
      --border-color: #e2e8f0;
      --border-light: #f1f5f9;
      --accent-primary: #2563eb;
      --accent-hover: #1d4ed8;
      --success: #22c55e;
      --success-bg: #dcfce7;
      --success-border: #bbf7d0;
      --error: #ef4444;
      --error-bg: #fee2e2;
      --error-border: #fecaca;
      --warning: #f59e0b;
      --warning-bg: #fef3c7;
      --warning-border: #fde68a;
      --shadow: rgba(0, 0, 0, 0.1);
      --shadow-lg: rgba(0, 0, 0, 0.15);
    }
    
    [data-theme="dark"] {
      --bg-primary: #0f172a;
      --bg-secondary: #1e293b;
      --bg-card: #334155;
      --text-primary: #f8fafc;
      --text-secondary: #cbd5e1;
      --text-muted: #94a3b8;
      --border-color: #475569;
      --border-light: #334155;
      --accent-primary: #3b82f6;
      --accent-hover: #2563eb;
      --success: #10b981;
      --success-bg: #064e3b;
      --success-border: #065f46;
      --error: #f87171;
      --error-bg: #7f1d1d;
      --error-border: #991b1b;
      --warning: #fbbf24;
      --warning-bg: #78350f;
      --warning-border: #92400e;
      --shadow: rgba(0, 0, 0, 0.3);
      --shadow-lg: rgba(0, 0, 0, 0.4);
    }
    
    * {
      transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
    }
    
    body {
      background-color: var(--bg-secondary);
      color: var(--text-primary);
    }
    
    .theme-toggle {
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 50%;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 6px var(--shadow);
      z-index: 1000;
      color: var(--text-primary);
    }
    
    .theme-toggle:hover {
      background: var(--bg-secondary);
      transform: scale(1.05);
    }
    
    .card {
      background: var(--bg-card) !important;
      border: 1px solid var(--border-color) !important;
      color: var(--text-primary) !important;
      box-shadow: 0 4px 6px var(--shadow) !important;
    }
    
    input, select, textarea {
      background: var(--bg-card) !important;
      border: 1px solid var(--border-color) !important;
      color: var(--text-primary) !important;
    }
    
    input:focus, select:focus, textarea:focus {
      border-color: var(--accent-primary) !important;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1) !important;
    }
    
    .btn-primary {
      background: var(--accent-primary) !important;
      color: white !important;
    }
    
    .btn-primary:hover {
      background: var(--accent-hover) !important;
    }
    
    h1, h2, h3, h4, h5, h6 {
      color: var(--text-primary) !important;
    }
    
    .link {
      color: var(--accent-primary) !important;
    }
    
    .link:hover {
      color: var(--accent-hover) !important;
    }
  `;
}

export function getThemeToggleButton() {
  return `
    <button id="theme-toggle" class="theme-toggle" onclick="toggleTheme()" aria-label="Toggle dark/light mode">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
      </svg>
    </button>
  `;
}
