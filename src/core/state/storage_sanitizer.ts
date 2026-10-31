/**
 * Enforces Zero Permanent Local State by trapping and neutralizing browser persistence APIs.
 */
export class StorageSanitizer {
  private static readonly _ERROR_MSG =
    'Persistence violation: Local storage is disabled by architectural mandate.';
  private static readonly _STORAGE_LOCAL = 'localStorage';
  private static readonly _STORAGE_SESSION = 'sessionStorage';
  private static readonly _STORAGE_INDEXED_DB = 'indexedDB';

  public constructor() {}

  /**
   * Returns standard error message thrown on unauthorized local persistence attempts.
   */
  public get errorMessage(): string {
    return StorageSanitizer._ERROR_MSG;
  }

  /**
   * Traps window localStorage, sessionStorage, and indexedDB.
   */
  public installSanitizer(targetWindow?: Window): void {
    const win = this._resolveWindow(targetWindow);
    if (!win) {
      return;
    }
    this._trapStorage(win, StorageSanitizer._STORAGE_LOCAL);
    this._trapStorage(win, StorageSanitizer._STORAGE_SESSION);
    this._trapIndexedDb(win);
  }

  /**
   * Checks whether localStorage.setItem throws the expected architectural violation error.
   */
  public isLocalStorageBlocked(targetWindow?: Window): boolean {
    const win = this._resolveWindow(targetWindow);
    if (!win || !win.localStorage) {
      return true;
    }
    try {
      win.localStorage.setItem('__test_probe__', '1');
      return false;
    } catch (err: unknown) {
      return err instanceof Error && err.message === StorageSanitizer._ERROR_MSG;
    }
  }

  private _resolveWindow(targetWindow?: Window): Window | null {
    if (targetWindow) {
      return targetWindow;
    }
    if (typeof window !== 'undefined') {
      return window;
    }
    return null;
  }

  private _trapStorage(win: Window, type: 'localStorage' | 'sessionStorage'): void {
    const mockStorage = this._createMockStorage();
    try {
      Object.defineProperty(win, type, {
        value: mockStorage,
        configurable: true,
        writable: false,
      });
    } catch {
      // Ignored if environment locks property
    }
  }

  private _trapIndexedDb(win: Window): void {
    if (!win.indexedDB && typeof win.indexedDB === 'undefined') {
      return;
    }
    try {
      Object.defineProperty(win, StorageSanitizer._STORAGE_INDEXED_DB, {
        value: {
          open: (): IDBOpenDBRequest => {
            throw new Error(StorageSanitizer._ERROR_MSG);
          },
        },
        configurable: true,
        writable: false,
      });
    } catch {
      // Ignored if environment locks property
    }
  }

  private _createMockStorage(): Storage {
    return {
      getItem: (): string | null => null,
      setItem: (): void => {
        throw new Error(StorageSanitizer._ERROR_MSG);
      },
      removeItem: (): void => {},
      clear: (): void => {},
      key: (): string | null => null,
      length: 0,
    };
  }
}

