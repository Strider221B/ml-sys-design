// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AriaLiveAnnouncer } from '@/components/canvas/aria_live_announcer';

describe('AriaLiveAnnouncer', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
  });

  it('test_announce_createsLiveRegionAndDispatchesMessage', () => {
    const announcer = new AriaLiveAnnouncer();
    announcer.announce('Topology cycle detected', 'assertive');

    const element = announcer.getLiveRegionElement();
    expect(element).not.toBeNull();
    expect(element?.id).toBe('a11y-live-region');
    expect(element?.getAttribute('aria-live')).toBe('assertive');

    vi.advanceTimersByTime(100);
    expect(element?.textContent).toBe('Topology cycle detected');
    expect(announcer.getLastAnnouncement()).toBe('Topology cycle detected');
  });

  it('test_announce_whenEmptyMessage_doesNotModifyElement', () => {
    const announcer = new AriaLiveAnnouncer();
    announcer.announce('');
    expect(announcer.getLastAnnouncement()).toBe('');
  });

  it('test_announce_reusesExistingDomElement', () => {
    const preExisting = document.createElement('div');
    preExisting.id = 'a11y-live-region';
    document.body.appendChild(preExisting);

    const announcer = new AriaLiveAnnouncer();
    announcer.announce('Model worker scaled to 8 GPUs');
    expect(announcer.getLiveRegionElement()).toBe(preExisting);

    vi.advanceTimersByTime(100);
    expect(preExisting.textContent).toBe('Model worker scaled to 8 GPUs');
  });

  it('test_clear_resetsLiveRegionAndLastAnnouncement', () => {
    const announcer = new AriaLiveAnnouncer();
    announcer.announce('Alert message');
    vi.advanceTimersByTime(100);

    announcer.clear();
    expect(announcer.getLastAnnouncement()).toBe('');
    expect(announcer.getLiveRegionElement()?.textContent).toBe('');
  });

  it('test_announce_whenPolitenessOmitted_defaultsToPolite', () => {
    const announcer = new AriaLiveAnnouncer();
    announcer.announce('Normal system event');

    const element = announcer.getLiveRegionElement();
    expect(element?.getAttribute('aria-live')).toBe('polite');
    vi.advanceTimersByTime(100);
    expect(element?.textContent).toBe('Normal system event');
  });
});

