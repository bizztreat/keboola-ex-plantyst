const constants = require('./src/constants')
var moment = require('./moment');
var Plantyst = require('./Plantyst')
/*const dataDir = process.argv[2]

if (!dataDir) {
  console.error('Missing path to data dir!')
  process.exit(constants.EXIT_STATUS_FAILURE)
}

*/

console.log('you. are. AWESOME!');

var query = {
    // fill these properties
    MeasurementId: 1268,//11,
    From: moment("2017-12-12"),
    To: moment("2017-12-13"),
    View: "Base.MinuteSet"
};

var token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJBY2Nlc3NLZXkiOiJnYWxCUVlZU1kxaVdLSHcySG9iUkQ4cGhrTHdGcnlIeCIsImlhdCI6MTUxMzMzMjgxMiwiaXNzIjoiS2Vib29sYSIsImF1ZCI6Imh0dHBzOi8vbXkucGxhbnR5c3QuY29tLyJ9.Y4EC7WXMH26owcfmrSApqXHmS8ttdV0hrB55F0sROH8";
var bridge = new Plantyst.Data.CommunicationBridgeBearer(token);
var cacheSetup = new Plantyst.Data.CacheSetup();
cacheSetup.CacheWritingEnabled = false;
var provider = new Plantyst.Data.MeasurementTimeSeriesAggregationProvider({ Bridge: bridge, CacheSetup: cacheSetup });
provider.Fetch(query)
    .done(function (result) {
    var from = moment.utc(result.From);
    var values = result.Data.map(function (p, i) { return ({
        From: from.clone().add(i, "m"),
        To: from.clone().add(i + 1, "m"),
        Value: p,
    }); });

    
    values.forEach(function (v) {
        console.log(JSON.stringify(v) + "\n");
    });
});

