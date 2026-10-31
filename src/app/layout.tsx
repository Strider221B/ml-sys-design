import React from 'react';

export interface LayoutProps {
  children: React.ReactNode;
}

/**
 * Root isomorphic layout component for Next.js App Router.
 */
export class Layout {
  public static renderRoot(props: LayoutProps): React.ReactNode {
    return (
      <html lang="en">
        <body className="bg-slate-950 text-slate-100 min-h-screen">
          {props.children}
        </body>
      </html>
    );
  }
}

export default Layout.renderRoot;
