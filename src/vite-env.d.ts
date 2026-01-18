/// <reference types="vite/client" />

export interface GitInfo {
  commitHash: string
  commitShortHash: string
  commitMessage: string
  commitDate: string
  branch: string
}

declare const __GIT_COMMIT_HASH__: string
declare const __GIT_COMMIT_SHORT_HASH__: string
declare const __GIT_COMMIT_MESSAGE__: string
declare const __GIT_COMMIT_DATE__: string
declare const __GIT_BRANCH__: string
