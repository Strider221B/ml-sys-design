import { describe, expect, it } from 'vitest';
import { StorageSanitizer } from '@/core/state/storage_sanitizer';

describe('StorageSanitizer', () => {
  const sanitizer = new StorageSanitizer();

  it('test_errorMessage_returnsMandateMessage', () => {
    expect(sanitizer.errorMessage).toContain('Persistence violation');
  });

  it('test_installSanitizer_withMockWindow_trapsLocalStorage', () => {
    const mockWindow = {
      localStorage: {} as Storage,
      sessionStorage: {} as Storage,
      indexedDB: {} as IDBFactory,
    } as unknown as Window;

    sanitizer.installSanitizer(mockWindow);

    expect(() => {
      mockWindow.localStorage.setItem('key', 'val');
    }).toThrow('Persistence violation');

    expect(mockWindow.localStorage.getItem('key')).toBeNull();
    expect(mockWindow.localStorage.key(0)).toBeNull();
    expect(mockWindow.localStorage.length).toBe(0);
    mockWindow.localStorage.removeItem('key');
    mockWindow.localStorage.clear();
  });

  it('test_installSanitizer_withMockWindow_trapsSessionStorage', () => {
    const mockWindow = {
      localStorage: {} as Storage,
      sessionStorage: {} as Storage,
      indexedDB: {} as IDBFactory,
    } as unknown as Window;

    sanitizer.installSanitizer(mockWindow);

    expect(() => {
      mockWindow.sessionStorage.setItem('token', 'secret');
    }).toThrow('Persistence violation');
  });

  it('test_installSanitizer_withMockWindow_trapsIndexedDb', () => {
    const mockWindow = {
      localStorage: {} as Storage,
      sessionStorage: {} as Storage,
      indexedDB: {
        open: () => ({} as IDBOpenDBRequest),
      } as unknown as IDBFactory,
    } as unknown as Window;

    sanitizer.installSanitizer(mockWindow);

    expect(() => {
      mockWindow.indexedDB.open('db_test');
    }).toThrow('Persistence violation');
  });

  it('test_installSanitizer_whenWindowUndefined_doesNotThrow', () => {
    expect(() => {
      sanitizer.installSanitizer(undefined);
    }).not.toThrow();
  });

  it('test_installSanitizer_whenGlobalWindowDefined_usesGlobalWindow', () => {
    const mockWindow = {
      localStorage: {} as Storage,
      sessionStorage: {} as Storage,
      indexedDB: {} as IDBFactory,
    } as unknown as Window;

    const globalObj = globalThis as unknown as { window?: Window | undefined };
    const originalWindow = globalObj.window;
    globalObj.window = mockWindow;

    try {
      sanitizer.installSanitizer();
      expect(() => {
        mockWindow.localStorage.setItem('k', 'v');
      }).toThrow('Persistence violation');
    } finally {
      globalObj.window = originalWindow;
    }
  });

  it('test_installSanitizer_whenIndexedDbMissing_handlesGracefully', () => {
    const mockWindow = {
      localStorage: {} as Storage,
      sessionStorage: {} as Storage,
    } as unknown as Window;

    expect(() => {
      sanitizer.installSanitizer(mockWindow);
    }).not.toThrow();
  });

  it('test_installSanitizer_whenDefinePropertyThrows_catchesSilently', () => {
    const frozenWindow = Object.freeze({
      localStorage: {},
      sessionStorage: {},
      indexedDB: {},
    }) as unknown as Window;

    expect(() => {
      sanitizer.installSanitizer(frozenWindow);
    }).not.toThrow();
  });

  it('test_isLocalStorageBlocked_returnsCorrectStatus', () => {
    const unblockedWindow = {
      localStorage: {
        setItem: () => {},
      } as unknown as Storage,
    } as unknown as Window;

    expect(sanitizer.isLocalStorageBlocked(unblockedWindow)).toBe(false);

    const blockedWindow = {
      localStorage: {} as Storage,
      sessionStorage: {} as Storage,
      indexedDB: {} as IDBFactory,
    } as unknown as Window;
    sanitizer.installSanitizer(blockedWindow);
    expect(sanitizer.isLocalStorageBlocked(blockedWindow)).toBe(true);

    expect(sanitizer.isLocalStorageBlocked(undefined)).toBe(true);
  });
});
