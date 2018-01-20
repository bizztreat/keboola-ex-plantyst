const _ = require('lodash')
const nconf = require('nconf')
const isThere = require('is-there')
const {
  DATA_GRANULARITY_DEFAULT,
  API_ENDPOINT_MEASUREMENTS,
  CHANGED_IN_LAST_DEFAULT
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
function getConfig(configPath, fileExist = isThere) {
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
function parseConfiguration(configObject = {}) {
  try {
    // const apiURI = configObject.get('parameters:apiURI')
    // if (_.isUndefined(apiURI) || _.isEmpty(apiURI)) {
    //   throw new Error('Parameter apiURI is empty/not defined')
    // }

    const apiToken = configObject.get('parameters:#apiToken')
    if (_.isUndefined(apiToken) || _.isEmpty(apiToken)) {
      throw new Error('Parameter #apiToken is empty/not defined')
    }

    const endpoint = configObject.get('parameters:endpoint')
    if (_.isUndefined(endpoint) || _.isEmpty(endpoint)) {
      throw new Error('Parameter endpoint is empty/not defined')
    }

    const granularity = !_.isUndefined(configObject.get('parameters:granularity'))
      ? configObject.get('parameters:granularity')
      : DATA_GRANULARITY_DEFAULT

    // const measurementId = configObject.get('parameters:measurementId')
    // if (_.isUndefined(measurementId) || _.isEmpty(measurementId)) {
    //   throw new Error('Field measurementId is empty/not defined')
    // }
    const measurementId = !_.isUndefined(configObject.get('parameters:measurementId'))
    ? configObject.get('parameters:measurementId')
    : null

    // const changedIn = configObject.get('parameters:changedInLast')
    // if (_.isUndefined(changedIn) || _.isEmpty(changedIn)) {
    //   throw new Error('Field changedInLast is empty/not defined')
    // }
    const changedIn = !_.isUndefined(configObject.get('parameters:changedInLast'))
    ? configObject.get('parameters:changedInLast')
    : CHANGED_IN_LAST_DEFAULT


    const amount = changedIn.slice(0,-1)
    if(!_.isNumber(parseInt(amount))) {
      throw new Error('Field changedInLast has invalid format. Use format [NNu] N = number, u = unit. Sample: 15d')
    }

    const unitOfTime = changedIn.slice(-1)
    const allowedUnits = ["m", "h", "d", "M"]
    if(allowedUnits.indexOf(unitOfTime) == -1) {
      throw new Error('Field changedInLast contains unknown unit of time. Use one of these [m, h, d, M]')
    }

    // console.log("-"+configObject.get('parameters:metadocuments')+"-")

    const metadocuments = !_.isUndefined(configObject.get('parameters:metadocuments'))
    ? configObject.get('parameters:metadocuments')
    : false

    const changedInLast = {
      amount: amount,
      unitOfTime: unitOfTime
    }

    return {
      // apiURI,
      apiToken,
      endpoint,
      granularity,
      changedInLast,
      measurementId,
      metadocuments
    }
  } catch (error) {
    throw new Error(`Problem in the input configuration - ${error.message}`)
  }
}
