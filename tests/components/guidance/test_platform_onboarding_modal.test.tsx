// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PlatformOnboardingModal } from '@/components/guidance/platform_onboarding_modal';

describe('PlatformOnboardingModal', () => {
  it('test_render_whenClosed_rendersNothing', () => {
    const { container } = render(<PlatformOnboardingModal isOpen={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('test_render_whenOpen_displaysInitialSlideAndTitle', () => {
    render(<PlatformOnboardingModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Platform Onboarding & Guide')).toBeDefined();
    expect(screen.getByText('Beyond Static Whiteboards')).toBeDefined();
    expect(screen.getByText('Step 1 of 4')).toBeDefined();
  });

  it('test_navigationButtons_stepsThroughSlidesAndCompletes', () => {
    const onClose = vi.fn();
    render(<PlatformOnboardingModal isOpen={true} onClose={onClose} />);

    // Step 1 -> Next
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Step 2 of 4')).toBeDefined();
    expect(screen.getByText('The 6-Screen Operational Loop')).toBeDefined();

    // Step 2 -> Back
    fireEvent.click(screen.getByText('Back'));
    expect(screen.getByText('Step 1 of 4')).toBeDefined();

    // Step 1 -> Step 2 -> Step 3
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Step 3 of 4')).toBeDefined();
    expect(screen.getByText('Connect Google Drive')).toBeDefined();

    // Step 3 -> Step 4
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Step 4 of 4')).toBeDefined();
    const getStartedBtn = screen.getByText('Get Started');
    expect(getStartedBtn).toBeDefined();

    fireEvent.click(getStartedBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it('test_keyboardNavigation_handlesArrowKeysAndEscape', () => {
    const onClose = vi.fn();
    render(<PlatformOnboardingModal isOpen={true} onClose={onClose} />);

    const dialog = screen.getByRole('dialog');

    fireEvent.keyDown(dialog, { key: 'ArrowRight' });
    expect(screen.getByText('Step 2 of 4')).toBeDefined();

    fireEvent.keyDown(dialog, { key: 'ArrowLeft' });
    expect(screen.getByText('Step 1 of 4')).toBeDefined();

    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('test_dotIndicatorsAndDriveAction_navigateDirectlyAndDispatchAuth', () => {
    const onConnectDrive = vi.fn();
    render(<PlatformOnboardingModal isOpen={true} onClose={vi.fn()} onConnectDrive={onConnectDrive} />);

    const slide3Dot = screen.getByLabelText('Slide 3');
    fireEvent.click(slide3Dot);

    expect(screen.getByText('Step 3 of 4')).toBeDefined();
    const driveBtn = screen.getByText('Connect Google Drive');
    fireEvent.click(driveBtn);

    expect(onConnectDrive).toHaveBeenCalled();
  });

  it('test_closeButton_invokesOnClose', () => {
    const onClose = vi.fn();
    render(<PlatformOnboardingModal isOpen={true} onClose={onClose} />);

    const closeBtn = screen.getByLabelText('Close dialog');
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalled();
  });
});

