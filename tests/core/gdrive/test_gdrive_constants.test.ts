import { describe, expect, it } from 'vitest';
import { GDriveConstants } from '@/core/gdrive/gdrive_constants';

describe('GDriveConstants', () => {
  it('test_constants_haveExpectedValues', () => {
    const constantsInstance = new GDriveConstants();
    expect(constantsInstance).toBeDefined();

    expect(GDriveConstants.ROOT_FOLDER_NAME).toBe('ML_System_Design_2026_SSOT');
    expect(GDriveConstants.DEFAULT_DEBOUNCE_MS).toBe(1500);
    expect(GDriveConstants.MAX_RETRIES).toBe(3);
    expect(GDriveConstants.BASE_BACKOFF_MS).toBe(1000);
    expect(GDriveConstants.HTTP_STATUS_PRECONDITION_FAILED).toBe(412);
    expect(GDriveConstants.MANIFEST_FILE_NAME).toBe('manifest.json');
    expect(GDriveConstants.FOLDER_MIME_TYPE).toContain('google-apps.folder');
  });
});

