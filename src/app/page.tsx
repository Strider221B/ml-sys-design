import React from 'react';

/**
 * Root landing page for 2026 ML System Design Platform.
 */
export class Page {
  private static readonly _TITLE = '2026 Machine Learning System Design Platform';
  private static readonly _SUBTITLE =
    'Isomorphic, deterministic interactive simulation and interview preparation engine.';

  public static renderPage(): React.ReactNode {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
          {Page._TITLE}
        </h1>
        <p className="mt-4 text-lg text-slate-400 max-w-2xl">
          {Page._SUBTITLE}
        </p>
      </main>
    );
  }
}

export default Page.renderPage;
