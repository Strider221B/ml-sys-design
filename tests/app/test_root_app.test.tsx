// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { Layout } from '@/app/layout';
import { Page } from '@/app/page';

describe('RootAppComponents', () => {
  beforeEach(() => {
    global.ResizeObserver = class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };
  });

  it('test_Layout_renderRoot_rendersHtmlAndBody', () => {
    const node = Layout.renderRoot({
      children: React.createElement('div', { id: 'test-child' }, 'Hello'),
    }) as React.ReactElement<{ children: React.ReactElement<{ children: React.ReactNode }> }>;

    expect(node.type).toBe('html');
    expect(node.props.children.type).toBe('body');
  });

  it('test_Page_rendersHeaderAndBrand', () => {
    render(<Page />);
    expect(screen.getByText('2026 Machine Learning System Design Platform')).toBeDefined();
    expect(screen.getByText(/Deterministic interactive simulation/i)).toBeDefined();
    expect(screen.getByText('RAM-Only SSOT')).toBeDefined();
  });

  it('test_Page_navigatesBetweenTabs', () => {
    render(<Page />);
    
    const interviewBtn = screen.getByRole('button', { name: /AI Interview/i });
    fireEvent.click(interviewBtn);
    expect(screen.getByText(/ML System Design Interview Simulator/i)).toBeDefined();

    const chaosBtn = screen.getByRole('button', { name: /Chaos Sandbox/i });
    fireEvent.click(chaosBtn);
    expect(screen.getByText(/Chaos Engineering & Failure Sandbox/i)).toBeDefined();

    const curriculumBtn = screen.getByRole('button', { name: /Curriculum/i });
    fireEvent.click(curriculumBtn);
    expect(screen.getByText(/2026 ML System Design Curriculum/i)).toBeDefined();

    const telemetryBtn = screen.getByRole('button', { name: /Telemetry/i });
    fireEvent.click(telemetryBtn);
    expect(screen.getByText(/Telemetry & Profiler Operations Console/i)).toBeDefined();

    const finopsBtn = screen.getByRole('button', { name: /FinOps/i });
    fireEvent.click(finopsBtn);
    expect(screen.getByText(/FinOps & Hardware Acceleration Engine/i)).toBeDefined();
  });

  it('test_Page_opensAndClosesExportModal', () => {
    render(<Page />);
    const exportBtn = screen.getByRole('button', { name: /Export IaC/i });
    fireEvent.click(exportBtn);

    expect(screen.getByText('Export Infrastructure & Portfolio')).toBeDefined();
    const closeBtn = screen.getByRole('button', { name: '✕' });
    fireEvent.click(closeBtn);
    expect(screen.queryByText('Export Infrastructure & Portfolio')).toBeNull();
  });

  it('test_Page_staticRenderPage_returnsElement', () => {
    const el = Page.renderPage();
    expect(React.isValidElement(el)).toBe(true);
  });
});
