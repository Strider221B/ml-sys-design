// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AppWelcomeModal } from '@/components/welcome/app_welcome_modal';
import { WelcomeConstants } from '@/components/welcome/welcome_constants';

describe('AppWelcomeModal', () => {
  it('test_render_whenClosed_returnsNull', () => {
    const { container } = render(
      <AppWelcomeModal isOpen={false} onClose={vi.fn()} onTakeTour={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('test_render_whenOpen_rendersHeaderPillarsAndWorkspaces', () => {
    render(<AppWelcomeModal isOpen={true} onClose={vi.fn()} onTakeTour={vi.fn()} />);

    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText(WelcomeConstants.HERO_TITLE)).toBeDefined();
    expect(screen.getByText(WelcomeConstants.HERO_BADGE)).toBeDefined();

    expect(screen.getByText('Deterministic Simulation')).toBeDefined();
    expect(screen.getByText('Zero Local Persistence & Drive SSOT')).toBeDefined();
    expect(screen.getByText('Dual-Mode AI Engine')).toBeDefined();

    expect(screen.getByText('Architecture Canvas')).toBeDefined();
    expect(screen.getByText('AI Interview Simulator')).toBeDefined();
    expect(screen.getByText('Chaos Sandbox')).toBeDefined();
    expect(screen.getByText('Curriculum Explorer')).toBeDefined();
    expect(screen.getByText('Real-Time Telemetry')).toBeDefined();
    expect(screen.getByText('FinOps Workspace')).toBeDefined();
  });

  it('test_handleSkip_whenCheckboxUnchecked_callsOnCloseWithFalse', () => {
    const onClose = vi.fn();
    render(<AppWelcomeModal isOpen={true} onClose={onClose} onTakeTour={vi.fn()} />);

    const skipBtn = screen.getByText(WelcomeConstants.BTN_SKIP_TO_CANVAS);
    fireEvent.click(skipBtn);

    expect(onClose).toHaveBeenCalledWith(false);
  });

  it('test_handleSkip_whenCheckboxChecked_callsOnCloseWithTrue', () => {
    const onClose = vi.fn();
    render(<AppWelcomeModal isOpen={true} onClose={onClose} onTakeTour={vi.fn()} />);

    const checkbox = screen.getByLabelText(WelcomeConstants.CHECKBOX_DONT_SHOW_AGAIN);
    fireEvent.click(checkbox);

    const skipBtn = screen.getByText(WelcomeConstants.BTN_SKIP_TO_CANVAS);
    fireEvent.click(skipBtn);

    expect(onClose).toHaveBeenCalledWith(true);
  });

  it('test_handleTakeTour_triggersBothOnCloseAndOnTakeTour', () => {
    const onClose = vi.fn();
    const onTakeTour = vi.fn();
    render(<AppWelcomeModal isOpen={true} onClose={onClose} onTakeTour={onTakeTour} />);

    const tourBtn = screen.getByText(WelcomeConstants.BTN_TAKE_TOUR);
    fireEvent.click(tourBtn);

    expect(onClose).toHaveBeenCalledWith(false);
    expect(onTakeTour).toHaveBeenCalled();
  });

  it('test_handleKeyDown_onEscape_callsOnClose', () => {
    const onClose = vi.fn();
    render(<AppWelcomeModal isOpen={true} onClose={onClose} onTakeTour={vi.fn()} />);

    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledWith(false);
  });

  it('test_closeButton_callsOnClose', () => {
    const onClose = vi.fn();
    render(<AppWelcomeModal isOpen={true} onClose={onClose} onTakeTour={vi.fn()} />);

    const closeBtn = screen.getByLabelText('Close welcome screen');
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalledWith(false);
  });
});

