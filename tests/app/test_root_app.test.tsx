import React from 'react';
import { describe, expect, it } from 'vitest';
import { Layout } from '@/app/layout';
import { Page } from '@/app/page';

describe('RootAppComponents', () => {
  it('test_Layout_renderRoot_rendersHtmlAndBody', () => {
    const node = Layout.renderRoot({
      children: React.createElement('div', { id: 'test-child' }, 'Hello'),
    }) as React.ReactElement<{ children: React.ReactElement<{ children: React.ReactNode }> }>;

    expect(node.type).toBe('html');
    expect(node.props.children.type).toBe('body');
  });

  it('test_Page_renderPage_rendersHeaderAndSubtitle', () => {
    const node = Page.renderPage() as React.ReactElement<{
      children: Array<React.ReactElement<{ children: React.ReactNode }>>;
    }>;

    expect(node.type).toBe('main');
    expect(node.props.children[0].props.children).toContain('2026 Machine Learning System Design Platform');
    expect(node.props.children[1].props.children).toContain('interactive simulation');
  });
});

