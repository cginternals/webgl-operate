

/**
 * Provided via the git-revision-webgl-operate and define plugins.
 */
declare let GIT_REV_VERSION: string;
declare let GIT_REV_COMMIT: string;
declare let GIT_REV_BRANCH: string;

/**
 * `gloperate.branch` provides the git revision branch at build-time.
 */
export const branch = typeof GIT_REV_BRANCH !== 'undefined' ? `${GIT_REV_BRANCH}` : undefined;

/**
 * `gloperate.commit` provides the git revision commit at build-time.
 */
export const commit = typeof GIT_REV_COMMIT !== 'undefined' ? `${GIT_REV_COMMIT}` : undefined;

/**
 * `gloperate.version` provides the git revision version at build-time.
 */
export const version = typeof GIT_REV_VERSION !== 'undefined' ? `${GIT_REV_VERSION}` : undefined;
