import React from 'react';

interface SimpleLayoutProps {
  children: React.ReactNode;
}

const SimpleLayout: React.FC<SimpleLayoutProps> = ({ children }) => {
  return (
    <div style={{ border: '2px solid red', padding: '1rem' }}>
      <header>
        <h1>Ceci est un Layout de Test</h1>
      </header>
      <main>
        {children}
      </main>
    </div>
  );
};

export default SimpleLayout;