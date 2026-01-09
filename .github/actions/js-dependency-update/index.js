const core = require('@actions/core')

async function run() {
    /*
    1. 
      1.1 Parse inputs: Base-branch from which to check for updates
      1.2 target-branch to use to create the PR
      1.3 Github token for authentication purposes to create PRs
      1.4 working directory for which to check for dependencies
    2. Execute npm update command within the working directory
    */
  core.info('I am a custom JS action');
}

run()