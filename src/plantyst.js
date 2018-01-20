const _ = require('lodash')
const path = require('path')
const rp = require('request-promise')
const moment = require('moment')
const constants = require('./constants')
const { getConfig, parseConfiguration } = require('./helpers/configHelper')
const { generateCsvFile, generateManifests } = require('./helpers/csvHelper')
const { getMeasurements, getMeasurementTimeSeries, getMetadocuments } = require('./helpers/callerHelper')

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

    try {
        const config = parseConfiguration(getConfig(configFile))
        var options
        var values = []

        console.log("Version: 2.1.0")
        console.log(`URI: ${constants.API_URI}`)
        console.log(`Endpoint: ${config.endpoint}`)

        switch (config.endpoint) {
            case 'Measurements':
                options = {
                    method: 'GET',
                    uri: constants.API_URI + constants.API_ENDPOINT_MEASUREMENTS,
                    headers: {
                        'User-Agent': 'Request-Promise',
                        'Content-type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': 'Bearer ' + config.apiToken
                    },
                    json: true // Automatically stringifies the body to JSON
                }

                values = await getMeasurements(options)

                // values.forEach(function (v) {
                //     console.log(JSON.stringify(v));
                // });

                await generateCsvFile(outputFilesDir, `measurements.csv`, values)
                console.log('Measurements has been read successfully!')
                break
            case 'MeasurementTimeSeriesAggregationsQuery':
                const nowUTC = moment().utc()
                const prevUTC = nowUTC.clone().subtract(config.changedInLast.amount, config.changedInLast.unitOfTime)

                console.log(`Measurement ID: ${config.measurementId}`)
                console.log(`Granularity: ${config.granularity}`)
                console.log(`Metadocuments: ${config.metadocuments}`)
                console.log(`Reading plantyst data since ${prevUTC.format()} ...`)

                var ids = config.measurementId.split(',');

                var queries = ids.map(function (v) {
                    return ({
                        "MeasurementId": v.trim(),
                        "From": prevUTC.format(),
                        "To": nowUTC.format(),
                        "View": config.granularity,
                        "Precision": "2"
                    });
                })

                // console.log(queries)

                options = {
                    method: 'POST',
                    uri: constants.API_URI + constants.API_ENDPOINT_MEASUREMENT_TIME_SERIES,
                    headers: {
                        'User-Agent': 'Request-Promise',
                        'Content-type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': 'Bearer ' + config.apiToken
                    },
                    body: {
                        "Queries": queries //[
                            // {
                            //     // "MeasurementId": config.measurementId,
                            //     "MeasurementId": '1269',
                            //     "From": prevUTC.format(),
                            //     "To": nowUTC.format(),
                            //     "View": config.granularity,
                            //     "Precision": "2"
                            // }]
                    },
                    json: true // Automatically stringifies the body to JSON
                }

                // console.log(options.body.Queries)

                values = await getMeasurementTimeSeries(options, config.granularity)

                // values.forEach(function (v) {
                //     console.log(JSON.stringify(v));
                // });

                await generateCsvFile(outputFilesDir, `time-series.csv`, values)
                console.log('Time Series has been read successfully!')

                // METADOCUMENTS
                if (config.metadocuments) {
                    queries = ids.map(function (v) {
                        return ({
                            "MeasurementId": v.trim(),
                            "From": prevUTC.format(),
                            "To": nowUTC.format()
                        });
                    })

                    options = {
                        method: 'POST',
                        uri: constants.API_URI + constants.API_ENDPOINT_METADOCUMENTS,
                        headers: {
                            'User-Agent': 'Request-Promise',
                            'Content-type': 'application/json',
                            'Accept': 'application/json',
                            'Authorization': 'Bearer ' + config.apiToken
                        },
                        body: {
                            "Queries": queries//[
                                // {
                                //     "MeasurementId": config.measurementId,
                                //     "From": prevUTC.format(),
                                //     "To": nowUTC.format()
                                // }]
                        },
                        json: true // Automatically stringifies the body to JSON
                    };

                    var result = await getMetadocuments(options)

                    // result.values.forEach(function (v) {
                    //     console.log(JSON.stringify(v));
                    // });

                    // result.comments.forEach(function (v) {
                    //     console.log(JSON.stringify(v));
                    // });

                    await generateCsvFile(outputFilesDir, `metadocuments.csv`, result.values)
                    await generateCsvFile(outputFilesDir, `metadocuments-comments.csv`, result.comments)
                    console.log('Metadocuments has been read successfully!')
                }

                break
            default:
                throw new Error('Unknown API endpoint. Use one of these [Measurements, MeasurementTimeSeriesAggregationsQuery]')
        }

        await generateManifests(outputFilesDir)
        process.exit(constants.EXIT_STATUS_SUCCESS)
    } catch (error) {
        console.error(error.message ? error.message : error)
        process.exit(constants.EXIT_STATUS_FAILURE)
    }
}