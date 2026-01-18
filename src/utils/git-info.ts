// @ts-ignore
declare const __GIT_COMMIT_HASH__: string
// @ts-ignore
declare const __GIT_COMMIT_SHORT_HASH__: string
// @ts-ignore
declare const __GIT_COMMIT_MESSAGE__: string
// @ts-ignore
declare const __GIT_COMMIT_DATE__: string
// @ts-ignore
declare const __GIT_BRANCH__: string

export interface GitInfo {
  commitHash: string
  commitShortHash: string
  commitMessage: string
  commitDate: string
  branch: string
}

const isProduction = import.meta.env.MODE === 'production'

let gitInfo: GitInfo = {
  commitHash: 'dev',
  commitShortHash: 'dev',
  commitMessage: 'Development',
  commitDate: new Date().toISOString(),
  branch: 'main'
}

if (isProduction && typeof __GIT_COMMIT_HASH__ !== 'undefined') {
  gitInfo = {
    commitHash: __GIT_COMMIT_HASH__,
    commitShortHash: __GIT_COMMIT_SHORT_HASH__,
    commitMessage: __GIT_COMMIT_MESSAGE__,
    commitDate: __GIT_COMMIT_DATE__,
    branch: __GIT_BRANCH__
  }
}

export { gitInfo }
