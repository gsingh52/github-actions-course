const core = require('@actions/core')   /* to get inputs */
const exec = require('@actions/exec')   /* to run command line scripts/commands */

const validateBranchName = ({branchName}) => /^[a-zA-Z0-9_\-\.\/]+$/.test(branchName); /*RegEx.test, if matches then return tru else false */
const validateDirectoryName = ({dirName}) => /^[a-zA-Z0-9_\-\/]+$/.test(dirName);

async function run() {
  const baseBranch = core.getInput('brase-branch');
  const targetBranch = core.getInput('target-branch');
  const ghToken = core.getInput('gh-token');
  const workingDir = core.getInput('working-directory'); 
  const debug = core.getBooleanInput('debug');

  core.setSecret(ghToken);

  if (!validateBranchName({branchName: baseBranch})){
    core.setFailed('Invalid base-branch name. Branch names should include only char, no, hypen, underscore, dots and forward slash');
    return;
  }

  if (!validateBranchName({branchName: targetBranch})){
    core.setFailed('Invalid target-branch name. Branch names should include only char, no, hypen, underscore, dots and forward slash');
    return;
  }

  if (!validateDirectoryName({dirName: workingDir})) {
    core.setFailed('Invalid working dir name. Dir name shd include char no hyphen underscore and slash');
    return;
  }

  core.info(`[js-dependency-update] : base branch is ${baseBranch}`);
  core.info(`[js-dependency-update] : target branch is ${targetBranch}`);
  core.info(`[js-dependency-update] : working directory is ${workingDir}`);

  await exec.exec('npm update', [], {
    cwd: workingDir
  } );

  const gitStatus = await exec.getExecOutput('git status -s package*.json', [], {
    cwd: workingDir
  });

  if (gitStatus.stdout.length > 0){
    core.info('[js-dependency-update] : There are updates available!')
  } else {
    core.info('[js-dependency-update] : No updates at this poing in time!')
  }
    /*
    1.Parse inputs:
      1.1 Base-branch from which to check for updates
      1.2 target-branch to use to create the PR
      1.3 Github token for authentication purposes to create PRs
      1.4 working directory for which to check for dependencies
    2. Execute npm update command within the working directory
    3. check whether there are modified pacakge*.json files 
    4 If there are modified files:
      4.1 Add and commit files to the target-branch
      4.2 Create a PR to the base-branch using the octokit API (github  API)
    5 Otherwise, conclude the custom action
    */
  core.info('I am a custom JS action');
}

run()