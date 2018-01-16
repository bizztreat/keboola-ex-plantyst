const plantystProcess = require('./src/plantyst')
const constants = require('./src/constants')
const dataDir = process.argv[2]
//const dataDir = 'data';

if (!dataDir) {
  console.error('Missing path to data dir!')
  process.exit(constants.EXIT_STATUS_FAILURE)
}

plantystProcess(dataDir)