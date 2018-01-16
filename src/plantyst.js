const _ = require('lodash')
const path = require('path')
const rp = require('request-promise')
const moment = require('moment')
const constants = require('./constants')
const { getConfig, parseConfiguration } = require('./helpers/configHelper')
const { generateCsvFile, generateManifests } = require('./helpers/csvHelper')

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

    console.log("Version: 1.0.0")
    console.log(configFile)

    try {
        const config = parseConfiguration(getConfig(configFile))

        const nowUTC = moment().utc()
        const prevUTC = nowUTC.clone().subtract(config.changedInLast.amount, config.changedInLast.unitOfTime)

        console.log(`Reading plantyst data since ${prevUTC.format()} ...`)

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
                        //"From": "2017-11-01T00:00:00Z",
                        //"To": "2017-11-01T00:10:00Z",
                        "From": prevUTC.format(),
                        "To": nowUTC.format(),
                        "View": config.granularity,
                        "Precision": "2"
                    }]
            },
            json: true // Automatically stringifies the body to JSON
        };

        var step
        switch(config.granularity) {
            case "Base.MinuteSet":
                step = "m"
                break;
            case "Base.Hour":
                step = "h"
                throw new Error('This granularity is not supported yet!')
                break;
            case "Base.Day":
                step = "d"
                throw new Error('This granularity is not supported yet!')
                break;
            case "Base.Month":
                step = "M"
                throw new Error('This granularity is not supported yet!')
                break;
        }

        //console.log(options)
        //console.log(options.body)
        var values

        await rp(options)
            .then(function (response) { // POST succeeded...
                var result = response.results[0]
                var from = moment.utc(result.first);
                //console.log(result);

                values = result.data.map(function (p, i) {
                    return ({
                        From: from.clone().add(i, step),
                        To: from.clone().add(i + 1, step),
                        Value: p,
                    });
                });
            })
            .catch(function (error) {
                console.error(error.message ? error.message : error)
                process.exit(constants.EXIT_STATUS_FAILURE)
            });

        // Print result to console
        values.forEach(function (v) {
            console.log(JSON.stringify(v));
        });
        //

        await generateCsvFile(outputFilesDir, values)

        console.log('Data has been read successfully!')
        process.exit(constants.EXIT_STATUS_SUCCESS)
    } catch (error) {
        console.error(error.message ? error.message : error)
        process.exit(constants.EXIT_STATUS_FAILURE)
    }
}