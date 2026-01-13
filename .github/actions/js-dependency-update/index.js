const core = require('@actions/core')   /* to get inputs */
const exec = require('@actions/exec')   /* to run command line scripts/commands */
const github = require('@actions/github');
const { Octokit } = require('@octokit/core');
const { log } = require('node:console');
const { setUncaughtExceptionCaptureCallback } = require('node:process');

const setupGit = async () => {
    await exec.exec(`git config --global user.name "gh-automation"`);
    await exec.exec(`git config --global user.email "gh-automation@gmail.com"`);
};

const validateBranchName = ({branchName}) => /^[a-zA-Z0-9_\-\.\/]+$/.test(branchName); /*RegEx.test, if matches then return tru else false */
const validateDirectoryName = ({dirName}) => /^[a-zA-Z0-9_\-\/]+$/.test(dirName);

const setupLogger = ({debug, prefix} = { debug: false, prefix: ''}) => ({
    debug: (message) =>  {
      if (debug) {
        core.info(`DEBUG ${prefix}${prefix ? ' : ' : ''}${message}`);
        // extend the logging functionality 
      }
    },
    info: (message) => {
        core.info(`${prefix}${prefix ? ' : ' : ''}${message}`);
    },
    error: (message) => {
        core.error(`${prefix}${prefix ? ' : ' : ''}${message}`); /*prefix if no prefix, then add empty or if there is then add :*/
    }
});

async function run() {
  const baseBranch = core.getInput('base-branch', { required: true});
  /*const headBranch = core.getInput('head-branch', { required: true});*/
  const headBranch = core.getInput('head-branch', { required: true});
  const ghToken = core.getInput('gh-token', { required: true});
  const workingDir = core.getInput('working-directory', { required: true}); 
  const debug = core.getBooleanInput('debug');
  const logger = setupLogger({debug, prefix: '[js-dependency-update]'});

  const commonExecOpts = {
    cwd: workingDir
  }

  core.setSecret(ghToken);

  logger.debug('Validating inputs - base-branch, head-branch, working-directory');

  if (!validateBranchName({branchName: baseBranch})){
    core.setFailed('Invalid base-branch name. Branch names should include only char, no, hypen, underscore, dots and forward slash');
    return;
  }

  if (!validateBranchName({branchName: headBranch})){
    core.setFailed('Invalid head-branch name. Branch names should include only char, no, hypen, underscore, dots and forward slash');
    return;
  }

  if (!validateDirectoryName({dirName: workingDir})) {
    core.setFailed('Invalid working dir name. Dir name shd include char no hyphen underscore and slash');
    return;
  }

  logger.debug(`Base branch is ${baseBranch}`);
  logger.debug(`Head branch is ${headBranch}`);
  logger.debug(`Working directory is ${workingDir}`);

  logger.debug('Checking for package updates')
  await exec.exec('npm update', [], {
    ...commonExecOpts
  } );

  const gitStatus = await exec.getExecOutput('git status -s package*.json', [], {
    ...commonExecOpts
  });

  if (gitStatus.stdout.length > 0){
    logger.debug('There are updates available!');
    logger.debug('Setting up git');
    await setupGit();

    logger.debug('Commiting and pushing package*.json changes');
    await exec.exec(`git checkout -b ${headBranch}`, [], {
        ...commonExecOpts,
    });
    await exec.exec(`git add package.json package-lock.json`, [], {
        ...commonExecOpts,
    });
    await exec.exec(`git commit -m  "chore: update dependencies`, [], {
        ...commonExecOpts,
    });
    await exec.exec(`git push -u origin ${headBranch} --force`, [], {
        ...commonExecOpts,
    });

    logger.debug('Fetching octokit API');
    const octokit = github.getOctokit(ghToken);    /*pass the github token here */
    try {
      logger.debug(`Creating PR using head branch ${headBranch}`);
      await octokit.rest.pulls.create({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        title: `Update NPM dependencies`,
        body: `This pull request updates NPM packages`,
        base: baseBranch,
        head: headBranch
      });
    } catch (e) {
        logger.error(
            'Something went wrong while creating the PR, Check logs below.'
        );
        core.setFailed(e.message);
        logger.error(e);
    }
  } else {
    logger.info('No updates at this poing in time.');
  }
    /*
    1.Parse inputs:
      1.1 Base-branch from which to check for updates
      1.2 head-branch to use to create the PR
      1.3 Github token for authentication purposes to create PRs
      1.4 working directory for which to check for dependencies
    2. Execute npm update command within the working directory
    3. check whether there are modified pacakge*.json files 
    4 If there are modified files:
      4.1 Add and commit files to the head-branch
      4.2 Create a PR to the base-branch using the octokit API (github  API)
    5 Otherwise, conclude the custom action
    
  core.info('I am a custom JS action'); */
}

run()