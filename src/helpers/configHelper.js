const _ = require('lodash')
const nconf = require('nconf')
const isThere = require('is-there')
const {
  ANALYSE_SYNTAX_DEFAULT,
  ANALYSE_ENTITIES_DEFAULT,
  ANALYSE_SENTIMENT_DEFAULT,
  ANALYSE_CUSTOM_TEXT_DEFAULT
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
    const apiKey = configObject.get('parameters:#apiKey')
    if (_.isUndefined(apiKey) || _.isEmpty(apiKey)) {
      throw new Error('Parameter #apiKey is empty/not defined')
    }

    const analyseCustomText = !_.isUndefined(configObject.get('parameters:analyseCustomText'))
      ? configObject.get('parameters:analyseCustomText')
      : ANALYSE_CUSTOM_TEXT_DEFAULT

    const customText = configObject.get('parameters:customText')

    if (analyseCustomText && (_.isUndefined(customText) || _.isEmpty(customText))) {
      throw new Error('Field customText is empty. Please fill this field or set analyseCustomText field to false!')
    }

    const inputFiles = configObject.get('storage:input:tables')
    if (!analyseCustomText && (_.isUndefined(inputFiles) || !_.isArray(inputFiles) || _.isEmpty(inputFiles))) {
      throw new Error('No KBC Bucket/Table selected. Please select one or set analyseCustomText field to true!')
    }

    if (!analyseCustomText && _.size(inputFiles) > 1) {
      throw new Error('Only 1 file is allowed at a time! Please select only one file for NLP processing.')
    }

    const inputFileName = !analyseCustomText && _.first(inputFiles).destination

    const syntaxAnalysis = !_.isUndefined(configObject.get('parameters:syntaxAnalysis'))
      ? configObject.get('parameters:syntaxAnalysis')
      : ANALYSE_SYNTAX_DEFAULT

    const entitiesAnalysis = !_.isUndefined(configObject.get('parameters:entitiesAnalysis'))
      ? configObject.get('parameters:entitiesAnalysis')
      : ANALYSE_ENTITIES_DEFAULT

    const sentimentAnalysis = !_.isUndefined(configObject.get('parameters:sentimentAnalysis'))
      ? configObject.get('parameters:sentimentAnalysis')
      : ANALYSE_SENTIMENT_DEFAULT

    const features = {
      syntax: syntaxAnalysis,
      entities: entitiesAnalysis,
      sentiment: sentimentAnalysis
    }

    return {
      apiKey,
      features,
      customText,
      inputFileName,
      analyseCustomText
    }
  } catch (error) {
    throw new Error(`Problem in the input configuration - ${error.message}`)
  }
}
