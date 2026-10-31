import { describe, expect, it } from 'vitest';
import { PyodideConstants } from '@/core/math/pyodide_constants';

describe('PyodideConstants', () => {
  it('test_constants_cdnUrlAndPackages_areConfigured', () => {
    expect(PyodideConstants.PYODIDE_CDN_URL).toContain('pyodide.js');
    expect(PyodideConstants.DEFAULT_PACKAGES).toContain(PyodideConstants.PACKAGE_NUMPY);
    expect(PyodideConstants.DEFAULT_PACKAGES).toContain(PyodideConstants.PACKAGE_SCIPY);
  });

  it('test_constants_defaultsAndHacks_areDefined', () => {
    expect(PyodideConstants.DEFAULT_AGENT_POPULATION).toBe(1000);
    expect(PyodideConstants.DEFAULT_MINHASH_PERMUTATIONS).toBe(128);
    expect(PyodideConstants.HACK_LENGTH_EXPLOITATION).toBe('LENGTH_EXPLOITATION');
    expect(PyodideConstants.HACK_SYCOPHANCY).toBe('SYCOPHANCY');
    expect(PyodideConstants.HACK_SAFETY_EVASION).toBe('SAFETY_EVASION');
    expect(PyodideConstants.OBJECTIVE_MAXIMIZE).toBe('maximize');
    expect(PyodideConstants.OBJECTIVE_MINIMIZE).toBe('minimize');
  });

  it('test_instantiate_createsInstance', () => {
    const instance = new PyodideConstants();
    expect(instance).toBeDefined();
  });
});

