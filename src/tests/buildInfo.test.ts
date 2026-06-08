import { describe, expect, it } from 'vitest';
import { BUILD_DATE, BUILD_ID, CACHE_VERSION, GIT_COMMIT, SHORT_COMMIT } from '../generated/buildInfo';

describe('build metadata', () => {
  it('derives the build and cache identifiers from the commit', () => {
    expect(GIT_COMMIT.startsWith(SHORT_COMMIT)).toBe(true);
    expect(BUILD_ID).toBe(`build-${SHORT_COMMIT}`);
    expect(CACHE_VERSION).toContain(BUILD_ID);
  });

  it('records an ISO build date', () => {
    expect(new Date(BUILD_DATE).toISOString()).toBe(BUILD_DATE);
  });
});
