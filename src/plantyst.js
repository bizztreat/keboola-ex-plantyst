const _ = require('lodash')
const path = require('path')
const rp = require('request-promise');
const moment = require('moment');
const constants = require('./constants')
//const { getConfig, parseConfiguration } = require('./helpers/configHelper')
//const { generateCsvFiles, generateManifests, getTextFromCsvFile } = require('./helpers/csvHelper')

var token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJBY2Nlc3NLZXkiOiJnYWxCUVlZU1kxaVdLSHcySG9iUkQ4cGhrTHdGcnlIeCIsImlhdCI6MTUxMzMzMjgxMiwiaXNzIjoiS2Vib29sYSIsImF1ZCI6Imh0dHBzOi8vbXkucGxhbnR5c3QuY29tLyJ9.Y4EC7WXMH26owcfmrSApqXHmS8ttdV0hrB55F0sROH8";

var options = {
    method: 'POST',
    uri: 'https://portal.plantyst.com/api/MeasurementTimeSeriesAggregationsQuery',
    headers: {
        'User-Agent': 'Request-Promise',
        'Content-type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer ' + token
    },
    body: {
        "Queries": [
            {
                "MeasurementId": 1268,
                "From": "2017-11-01T00:00:00Z",
                "To": "2017-11-01T00:10:00Z",
                "View": "Base.MinuteSet",
                "Precision": "2"
            }]
    },
    json: true // Automatically stringifies the body to JSON
};

/**
 * This function is the main program.
 * Reads and parse the input configuration.
 * Reads data from Plantyst API
 *
 * @param {string} dataDir - input directory.
 * @returns {undefined}
 */
module.exports = async (dataDir) => {
    const configFile = path.join(dataDir, constants.CONFIG_FILE)
    const inputFilesDir = path.join(dataDir, constants.INPUT_FILES_DIR)
    const outputFilesDir = path.join(dataDir, constants.OUTPUT_FILES_DIR)

    console.log('Start ...')

    try {
        //const config = parseConfiguration(getConfig(configFile))

        await rp(options)
            .then(function (response) {
                // POST succeeded...
                var result = response.results[0]

                console.log(result);

                var from = moment.utc(result.first);
                console.log(from);

                var values = result.data.map(function (p, i) {
                    return ({
                        From: from.clone().add(i, "m"),
                        To: from.clone().add(i + 1, "m"),
                        Value: p,
                    });
                });

                values.forEach(function (v) {
                    console.log(JSON.stringify(v));
                });


            })
            .catch(function (error) {
                console.error(error.message ? error.message : error)
                process.exit(constants.EXIT_STATUS_FAILURE)
            });

          
        /*  const textToAnalyse = !config.analyseCustomText
            ? await getTextFromCsvFile(config, inputFilesDir)
            : config.customText
      
          if (_.isEmpty(textToAnalyse)) {
            throw new Error('No text to analyse! Quiting the process!')
          }
      
          const nlp = new NLP(config.apiKey)
          const annotations = await nlp.annotateText(textToAnalyse, config.features)
          if (annotations && annotations.error) {
            let { message } = annotations.error
            if (!message) {
              message = 'An unknown problem with the Google NLP API. Please try it again later!'
            }
            throw new Error(message)
          }
          await generateCsvFiles(outputFilesDir, annotations)
          await generateManifests(outputFilesDir)*/

        console.log('Data has been downloaded!')
        process.exit(constants.EXIT_STATUS_SUCCESS)
    } catch (error) {
        console.error(error.message ? error.message : error)
        process.exit(constants.EXIT_STATUS_FAILURE)
    }
}