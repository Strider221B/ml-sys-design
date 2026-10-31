import React from 'react';
import { GuidanceConstants, OnboardingSlideConfig } from '@/components/guidance/guidance_constants';

export interface PlatformOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectDrive?: (() => void) | undefined;
}

export interface PlatformOnboardingModalState {
  currentSlide: number;
}

/**
 * Global 4-slide interactive onboarding walkthrough and architectural guide dialog.
 */
export class PlatformOnboardingModal extends React.Component<
  PlatformOnboardingModalProps,
  PlatformOnboardingModalState
> {
  private static readonly _FIRST_SLIDE = 0;
  private static readonly _LAST_SLIDE = 3;
  private static readonly _DRIVE_SLIDE = 2;

  public constructor(props: PlatformOnboardingModalProps) {
    super(props);
    this.state = {
      currentSlide: PlatformOnboardingModal._FIRST_SLIDE,
    };
  }

  public override render(): React.ReactNode {
    if (!this.props.isOpen) {
      return null;
    }
    const slide = GuidanceConstants.ONBOARDING_SLIDES[this.state.currentSlide];
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 text-xs text-slate-200"
        role="dialog"
        aria-modal="true"
        aria-label="Platform Onboarding Walkthrough"
        onKeyDown={this._handleKeyDown}
        tabIndex={0}
      >
        {this._renderDialogContainer(slide)}
      </div>
    );
  }

  private _handleKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'Escape') {
      this.props.onClose();
    } else if (event.key === 'ArrowRight') {
      this._nextSlide();
    } else if (event.key === 'ArrowLeft') {
      this._prevSlide();
    }
  };

  private _nextSlide = (): void => {
    this.setState((prev) => ({
      currentSlide: Math.min(PlatformOnboardingModal._LAST_SLIDE, prev.currentSlide + 1),
    }));
  };

  private _prevSlide = (): void => {
    this.setState((prev) => ({
      currentSlide: Math.max(PlatformOnboardingModal._FIRST_SLIDE, prev.currentSlide - 1),
    }));
  };

  private _goToSlide = (index: number): void => {
    this.setState({ currentSlide: index });
  };

  private _renderDialogContainer(slide: OnboardingSlideConfig): React.ReactNode {
    return (
      <div className="flex flex-col w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {this._renderHeader()}
        <div className="p-6 flex flex-col gap-5 min-h-[300px]">
          {this._renderSlideContent(slide)}
        </div>
        {this._renderFooter()}
      </div>
    );
  }

  private _renderHeader(): React.ReactNode {
    return (
      <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/70">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-indigo-600 font-black text-white text-[10px]">
            ML
          </span>
          <span className="font-bold text-white text-sm">Platform Onboarding &amp; Guide</span>
        </div>
        <button
          type="button"
          onClick={this.props.onClose}
          className="text-slate-400 hover:text-white font-bold p-1 rounded hover:bg-slate-800 transition"
          aria-label="Close dialog"
        >
          ✕
        </button>
      </div>
    );
  }

  private _renderSlideContent(slide: OnboardingSlideConfig): React.ReactNode {
    return (
      <div className="flex flex-col gap-3 flex-1">
        {this._renderSlideBadgeHeader(slide)}
        <h2 className="text-lg font-bold text-white tracking-tight">{slide.title}</h2>
        <p className="text-slate-300 text-xs leading-relaxed">{slide.subtitle}</p>
        {this._renderPointsList(slide.points)}
        {slide.id === PlatformOnboardingModal._DRIVE_SLIDE && this._renderDriveAction()}
      </div>
    );
  }

  private _renderSlideBadgeHeader(slide: OnboardingSlideConfig): React.ReactNode {
    return (
      <div className="flex items-center gap-2">
        <span className="px-2.5 py-0.5 rounded-full bg-indigo-950 border border-indigo-500/40 text-indigo-300 font-semibold text-[11px]">
          {slide.badge}
        </span>
        <span className="text-slate-500 font-mono text-[11px]">
          Step {slide.id + 1} of {GuidanceConstants.ONBOARDING_SLIDES.length}
        </span>
      </div>
    );
  }

  private _renderPointsList(points: string[]): React.ReactNode {
    return (
      <ul className="flex flex-col gap-2 pt-2">
        {points.map((point) => (
          <li key={point} className="flex items-start gap-2 text-slate-300">
            <span className="text-emerald-400 font-bold">✓</span>
            <span className="leading-snug">{point}</span>
          </li>
        ))}
      </ul>
    );
  }

  private _renderDriveAction(): React.ReactNode {
    return (
      <div className="pt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={this.props.onConnectDrive}
          className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow transition"
        >
          {GuidanceConstants.LABEL_CONNECT_DRIVE}
        </button>
        <span className="text-[11px] text-amber-300">
          Volatile RAM active. Connect Drive to auto-save.
        </span>
      </div>
    );
  }

  private _renderFooter(): React.ReactNode {
    return (
      <div className="flex items-center justify-between border-t border-slate-800 px-6 py-4 bg-slate-950/70">
        {this._renderDots()}
        {this._renderNavButtons()}
      </div>
    );
  }

  private _renderDots(): React.ReactNode {
    return (
      <div className="flex items-center gap-1.5" role="tablist" aria-label="Slide indicators">
        {GuidanceConstants.ONBOARDING_SLIDES.map((s) => {
          const isActive = s.id === this.state.currentSlide;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={`Slide ${s.id + 1}`}
              onClick={() => this._goToSlide(s.id)}
              className={`h-2 rounded-full transition-all ${
                isActive ? 'w-6 bg-indigo-500' : 'w-2 bg-slate-700 hover:bg-slate-600'
              }`}
            />
          );
        })}
      </div>
    );
  }

  private _renderNavButtons(): React.ReactNode {
    const isFirst = this.state.currentSlide === PlatformOnboardingModal._FIRST_SLIDE;
    const isLast = this.state.currentSlide === PlatformOnboardingModal._LAST_SLIDE;
    return (
      <div className="flex items-center gap-2">
        {!isFirst && (
          <button
            type="button"
            onClick={this._prevSlide}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition"
          >
            Back
          </button>
        )}
        {this._renderForwardButton(isLast)}
      </div>
    );
  }

  private _renderForwardButton(isLast: boolean): React.ReactNode {
    const label = isLast ? 'Get Started' : 'Next';
    const action = isLast ? this.props.onClose : this._nextSlide;
    return (
      <button
        type="button"
        onClick={action}
        className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow transition"
      >
        {label}
      </button>
    );
  }
}
