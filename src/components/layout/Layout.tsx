import React from "react";
import Header from "./Header";
import GlobalControlsBar from "./GlobalControlsBar";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <GlobalControlsBar />
      <main className="flex-1">{children}</main>
      <footer className="bg-secondary/50 border-t py-4">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div>
              <p className="text-xs text-muted-foreground">
                CLEWs-EU Model Visualization
              </p>
            </div>
            <div className="mt-2 md:mt-0">
              <p className="text-xs text-muted-foreground">
                Coded by:{" "}
                <a
                  href="https://christoshadjichristofi.com"
                  className="underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Christos Hadjichristofi
                </a>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
