import React from 'react';

interface LoginButtonProps {
  onLogin: () => void;
}

export const LoginButton: React.FC<LoginButtonProps> = ({ onLogin }) => {
  return (
    <div className="bg-white border-b border-gray-200 p-4">
      <button
        onClick={onLogin}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 12h-2v3h-3v2h3v3h2v-3h3v-2h-3zm-9 0c-1.84 0-3.48.96-4.34 2.37C7.17 15.22 9.42 15.74 12 15.74c.53 0 1.04-.03 1.55-.07-.07-.29-.12-.58-.12-.9 0-.28.02-.55.06-.81C13.01 13.98 12.52 14 12 14zm0-10C9.79 2 8 3.79 8 6s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
        </svg>
        WebViewでログイン画面を表示
      </button>
      <p className="text-xs text-gray-500 mt-2 text-center">
        アプリ内でログインを行います
      </p>
    </div>
  );
};