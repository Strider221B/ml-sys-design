import React from 'react';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '2026 Machine Learning System Design Platform',
  description:
    'Isomorphic, deterministic interactive simulation and interview preparation engine.',
};

export interface LayoutProps {
  children: React.ReactNode;
}

/**
 * Root isomorphic layout component for Next.js App Router.
 */
export class Layout {
  public static renderRoot(props: LayoutProps): React.ReactNode {
    return (
      <html lang="en" className="dark">
        <body className="bg-slate-950 text-slate-100 min-h-screen antialiased selection:bg-indigo-500 selection:text-white">
          {props.children}
        </body>
      </html>
    );
  }
}

export default Layout.renderRoot;
