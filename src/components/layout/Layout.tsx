
import React from 'react';
import Header from './Header';
import GlobalControlsBar from './GlobalControlsBar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <GlobalControlsBar />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
};

export default Layout;
