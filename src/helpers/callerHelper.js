const _ = require('lodash')
const rp = require('request-promise')
const moment = require('moment')
const {
    EXIT_STATUS_FAILURE
  } = require('../constants')

module.exports = {
    getMeasurements,
    getMeasurementTimeSeries,
    getMetadocuments
}

/**
 * This function calls API and get all Measurements.
 *
 * @param {Object} options - an options object.
 * @returns {Object}
 */
async function getMeasurements(options) {
    var values = []

    await rp(options)
        .then(function (response) { // POST succeeded...
            var data = response.resourceList
            // console.log(data)

            values = data.map(function (p, i) {
                return ({
                    measurementId: p.measurementId,
                    title: p.title,
                    description: p.description,
                    quantityType: p.quantityType,
                    archived: p.archived,
                    rights: p.rights.join(),
                    first: moment.utc(p.first).format(),
                });
            });
        })
        .catch(function (error) {
            console.error(error.message ? error.message : error)
            process.exit(EXIT_STATUS_FAILURE)
        })

    return values
}

/**
 * This function calls API and get all Measurement Time Series.
 *
 * @param {Object} options - an options object.
 * @param {String} granularity - a time granularity for request.
 * @returns {Object}
 */
async function getMeasurementTimeSeries(options, granularity) {
    var values = []

    var step
    switch (granularity) {
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

    await rp(options)
        .then(function (response) { // POST succeeded...
            // var result = response.results[0]
            // var from = moment.utc(result.first);
            // console.log(response);

            response.results.forEach(function (r) {
                var from = moment.utc(r.first);
                // console.log(JSON.stringify(r));

                var valIndex = r.outputFormat.indexOf('ValueSum') + 1
                var ii = 0
                var data = r.data.map(function (p, i) {
                    if ((i + 1) % valIndex == 0) {
                        return ({
                            MeasurementId: r.query.measurementId,
                            From: from.clone().add(ii++, step),
                            To: from.clone().add(ii, step),
                            Value: p,
                        });
                    }
                });

                data = _.remove(data, undefined)

                values = values.concat(data)
            });

            values.forEach(function (v) {
                console.log(JSON.stringify(v));
            });

            // var valIndex = result.outputFormat.indexOf('ValueSum') + 1
            // var ii = 0
            // values = result.data.map(function (p, i) {
            //     if ((i + 1) % valIndex == 0) {
            //         return ({
            //             MeasurementId: result.query.measurementId,
            //             From: from.clone().add(ii++, step),
            //             To: from.clone().add(ii, step),
            //             Value: p,
            //         });
            //     }
            // });

            // values = _.remove(values, undefined)

        })
        .catch(function (error) {
            console.error(error.message ? error.message : error)
            process.exit(EXIT_STATUS_FAILURE)
        });

    return values
}

/**
 * This function calls API and get all Measurement Time Series.
 *
 * @param {Object} options - an options object.
 * @param {String} granularity - a time granularity for request.
 * @returns {Object}
 */
async function getMetadocuments(options) {
    var values = []
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
                        operations: d.operations,
                        downtimeCode: d.downtimeCode,
                        lastModified: d.lastModified,
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
            process.exit(EXIT_STATUS_FAILURE)
        });

    return {
        values,
        comments
    }
}