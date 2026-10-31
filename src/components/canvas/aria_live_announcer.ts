export type PolitenessSetting = 'polite' | 'assertive';

/**
 * Publishes accessible screen reader live region announcements (WCAG 2.1 AA/AAA).
 */
export class AriaLiveAnnouncer {
  private static readonly _DEFAULT_POLITENESS: PolitenessSetting = 'polite';
  private static readonly _LIVE_REGION_ID = 'a11y-live-region';
  private static readonly _SR_ONLY_CLASS = 'sr-only';
  private static readonly _EMPTY_STRING = '';
  private static readonly _CLEAR_TIMEOUT_MS = 5000;

  public constructor() {
    this._lastAnnouncement = AriaLiveAnnouncer._EMPTY_STRING;
    this._element = this._resolveLiveRegionElement();
  }

  /**
   * Broadcasts accessible status message to screen readers via aria-live region.
   */
  public announce(
    message: string,
    politeness: PolitenessSetting = AriaLiveAnnouncer._DEFAULT_POLITENESS
  ): void {
    if (!message) {
      return;
    }
    this._lastAnnouncement = message;
    const targetElement = this._ensureLiveElement();
    if (!targetElement) {
      return;
    }
    this._applyAnnouncementToDom(targetElement, message, politeness);
  }

  /**
   * Clears the active live region text.
   */
  public clear(): void {
    this._lastAnnouncement = AriaLiveAnnouncer._EMPTY_STRING;
    if (this._element) {
      this._element.textContent = AriaLiveAnnouncer._EMPTY_STRING;
    }
  }

  /**
   * Returns the underlying live region DOM node if available in browser context.
   */
  public getLiveRegionElement(): HTMLElement | null {
    return this._element;
  }

  /**
   * Returns the most recent announcement string for testing and verification.
   */
  public getLastAnnouncement(): string {
    return this._lastAnnouncement;
  }

  private _element: HTMLElement | null;
  private _lastAnnouncement: string;

  private _resolveLiveRegionElement(): HTMLElement | null {
    if (typeof document === 'undefined') {
      return null;
    }
    return document.getElementById(AriaLiveAnnouncer._LIVE_REGION_ID);
  }

  private _ensureLiveElement(): HTMLElement | null {
    if (this._element) {
      return this._element;
    }
    if (typeof document === 'undefined') {
      return null;
    }
    const created = document.createElement('div');
    created.id = AriaLiveAnnouncer._LIVE_REGION_ID;
    created.setAttribute('aria-live', AriaLiveAnnouncer._DEFAULT_POLITENESS);
    created.setAttribute('aria-atomic', 'true');
    created.className = AriaLiveAnnouncer._SR_ONLY_CLASS;
    document.body.appendChild(created);
    this._element = created;
    return created;
  }

  private _applyAnnouncementToDom(
    element: HTMLElement,
    message: string,
    politeness: PolitenessSetting
  ): void {
    element.setAttribute('aria-live', politeness);
    element.textContent = AriaLiveAnnouncer._EMPTY_STRING;
    // Brief delay trigger ensures screen readers detect DOM mutation
    setTimeout(() => {
      element.textContent = message;
    }, 50);
  }
}

