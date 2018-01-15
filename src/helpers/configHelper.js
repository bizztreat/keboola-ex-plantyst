const _ = require('lodash')
const nconf = require('nconf')
const isThere = require('is-there')
const {
  DATA_GRANULARITY_DEFAULT,
  API_ENDPOINT_DEFAULT
} = require('../constants')

module.exports = {
  getConfig,
  parseConfiguration
}

/**
 * This function reads and parse the config passed via args.
 *
 * @param {string} configPath - a path to a configuration.
 * @param {function} fileExist - a simple function that checks whether a file exists .
 * @returns {Object}
 */
function getConfig (configPath, fileExist = isThere) {
  if (fileExist(configPath)) {
    return nconf.env().file(configPath)
  } else {
    return {}
  }
}

/**
 * This function reads verifies the input configuration and returns relevant params.
 *
 * @param {Object} configObject - nconf object with the input configuration.
 * @throws {error}
 * @returns {Object}
 */
function parseConfiguration (configObject = {}) {
  try {
    const apiURI = configObject.get('parameters:apiURI')
    if (_.isUndefined(apiURI) || _.isEmpty(apiURI)) {
      throw new Error('Parameter apiURI is empty/not defined')
    }

    const apiToken = configObject.get('parameters:#apiToken')
    if (_.isUndefined(apiToken) || _.isEmpty(apiToken)) {
      throw new Error('Parameter #apiToken is empty/not defined')
    }

    const endpoint = !_.isUndefined(configObject.get('parameters:endpoint'))
      ? configObject.get('parameters:endpoint')
      : API_ENDPOINT_DEFAULT

    const granularity = !_.isUndefined(configObject.get('parameters:granularity'))
      ? configObject.get('parameters:granularity')
      : DATA_GRANULARITY_DEFAULT

    const measurementId = configObject.get('parameters:measurementId')
    if (_.isUndefined(measurementId) || _.isEmpty(measurementId)) {
      throw new Error('Field measurementId is empty/not defined')
    }

    return {
      apiURI,
      apiToken,
      endpoint,
      granularity,
      measurementId
    }
  } catch (error) {
    throw new Error(`Problem in the input configuration - ${error.message}`)
  }
}
