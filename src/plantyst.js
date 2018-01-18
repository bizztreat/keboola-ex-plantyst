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

    console.log("Version: 2.0.2")

    try {
        const config = parseConfiguration(getConfig(configFile))

        const nowUTC = moment().utc()
        const prevUTC = nowUTC.clone().subtract(config.changedInLast.amount, config.changedInLast.unitOfTime)

        console.log(`URI: ${config.apiURI + constants.API_ENDPOINT_MEASUREMENTS}`)
        console.log(`Measurement ID: ${config.measurementId}`)
        console.log(`Granularity: ${config.granularity}`)
        console.log(`Metadocuments: ${config.metadocuments}`)
        console.log(`Reading plantyst data since ${prevUTC.format()} ...`)

        var options = {
            method: 'POST',
            uri: config.apiURI + constants.API_ENDPOINT_MEASUREMENTS,
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
                        "From": prevUTC.format(),
                        "To": nowUTC.format(),
                        "View": config.granularity,
                        "Precision": "2"
                    }]
            },
            json: true // Automatically stringifies the body to JSON
        };

        var step
        switch (config.granularity) {
            case "Base.MinuteSet":
                step = "m"
                break;
            case "Base.Hour":
                step = "h"
                break;
            case "Base.Day":
                step = "d"
                break;
            case "Base.Month":
                step = "M"
                break;
        }

        var values = []

        await rp(options)
            .then(function (response) { // POST succeeded...
                var result = response.results[0]
                var from = moment.utc(result.first);
                //console.log(result);

                var valIndex = result.outputFormat.indexOf('ValueSum') + 1
                var ii = 0
                values = result.data.map(function (p, i) {
                    if ((i + 1) % valIndex == 0) {
                        return ({
                            From: from.clone().add(ii++, step),
                            To: from.clone().add(ii, step),
                            Value: p,
                        });
                    }
                });

                values = _.remove(values, undefined)

            })
            .catch(function (error) {
                console.error(error.message ? error.message : error)
                process.exit(constants.EXIT_STATUS_FAILURE)
            });

        // values.forEach(function (v) {
        //     console.log(JSON.stringify(v));
        // });


        await generateCsvFile(outputFilesDir, `measurements.csv`, values)
        console.log('Data has been read successfully!')

        // METADOCUMENTS
        if (config.metadocuments) {
            options = {
                method: 'POST',
                uri: config.apiURI + constants.API_ENDPOINT_METADOCUMENTS,
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
                            "From": prevUTC.format(),
                            "To": nowUTC.format()
                        }]
                },
                json: true // Automatically stringifies the body to JSON
            };

            values = []
            var comments = []

            await rp(options)
                .then(function (response) { // POST succeeded...
                    var data = response.resourceList
                    var upToDate = moment.utc(response.dateTime);
                    //console.log(response)

                    if (!_.isEmpty(data)) {
                        data.forEach(function (d) {
                            values.push({
                                guid: d.guid,
                                type: d.type,
                                title: d.title,
                                description: d.description,
                                customId: d.customId,
                                creatorId: d.creatorId,
                                measurementId: d.measurementId,
                                from: d.from,
                                to: d.to,
                                color: d.color,
                                setpoint: d.setpoint,
                                lastModified: d.lastModified,
                                operations: d.operations,
                                downtimeCode: d.downtimeCode,
                            })

                            if (!_.isEmpty(d.comments)) {
                                d.comments.forEach(function (c) {
                                    comments.push({
                                        documentGuid: d.guid,
                                        id: c.id,
                                        text: c.text,
                                        modificationTime: c.modificationTime,
                                    });
                                });
                            }
                        });
                    }
                })
                .catch(function (error) {
                    console.error(error.message ? error.message : error)
                    process.exit(constants.EXIT_STATUS_FAILURE)
                });
            
            // values.forEach(function (v) {
            //     console.log(JSON.stringify(v));
            // });
    
            // comments.forEach(function (v) {
            //     console.log(JSON.stringify(v));
            // });

            await generateCsvFile(outputFilesDir, `metadocuments.csv`, values)
            await generateCsvFile(outputFilesDir, `metadocuments-comments.csv`, comments)
            console.log('Metadocuments has been read successfully!')
        }

        process.exit(constants.EXIT_STATUS_SUCCESS)
    } catch (error) {
        console.error(error.message ? error.message : error)
        process.exit(constants.EXIT_STATUS_FAILURE)
    }
}