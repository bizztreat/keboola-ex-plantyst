const _ = require('lodash')
const path = require('path')
const rp = require('request-promise');
const moment = require('moment');
const constants = require('./constants')
const { getConfig, parseConfiguration } = require('./helpers/configHelper')
const { generateCsvFiles, generateManifests } = require('./helpers/csvHelper')

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
    //const inputFilesDir = path.join(dataDir, constants.INPUT_FILES_DIR)
    const outputFilesDir = path.join(dataDir, constants.OUTPUT_FILES_DIR)

    console.log('Start ...')

    try {
        const config = parseConfiguration(getConfig(configFile))

        var options = {
            method: 'POST',
            uri: config.apiURI + config.endpoint,
            headers: {
                'User-Agent': 'Request-Promise',
                'Content-type': 'application/json',
                'Accept': 'application/json',
                'Authorization': 'Bearer ' + config.apiToken
            },
            body: {
                "Queries": [
                    {
                        "MeasurementId": config.measurementId,
                        "From": "2017-11-01T00:00:00Z",
                        "To": "2017-11-01T00:10:00Z",
                        "View": config.granularity, //"Base.MinuteSet",
                        "Precision": "2"
                    }]
            },
            json: true // Automatically stringifies the body to JSON
        };

        //console.log(options)
        var values

        await rp(options)
            .then(function (response) { // POST succeeded...
                var result = response.results[0]
                //console.log(result);

                var from = moment.utc(result.first);
                //console.log(from);

                values = result.data.map(function (p, i) {
                    return ({
                        From: from.clone().add(i, "m"),
                        To: from.clone().add(i + 1, "m"),
                        Value: p,
                    });
                });
            })
            .catch(function (error) {
                console.error(error.message ? error.message : error)
                process.exit(constants.EXIT_STATUS_FAILURE)
            });

        values.forEach(function (v) {
            console.log(JSON.stringify(v));
        });

        await generateCsvFile(outputFilesDir, values)

        console.log('Data has been downloaded!')
        process.exit(constants.EXIT_STATUS_SUCCESS)
    } catch (error) {
        console.error(error.message ? error.message : error)
        process.exit(constants.EXIT_STATUS_FAILURE)
    }
}