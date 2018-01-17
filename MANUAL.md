# Plantyst extractor

## What It Does

This app extracts measured data objects from Plantyst API. 

https://plantystportal.docs.apiary.io/

### Allowed data objects to extract

- Measurement Data

All the objects are mapped to output CSV file. See schema below:

#### Measurement Data

['From', 'To', 'Value']

- From: Timestamp
- To: Timestamp
- Value: Sum of measurements within the from - to range

## Configuration

### Output mapping

Use path `/data/out/tables/output.csv` as File in output mapping.
For destination bucket use according your needs.

### Parameters

<pre>
{
  "apiURI": <web-service-uri>
  "endpoint": <service-endpoint>
  "measurementId": <your-id>
  "granularity": One of these ["Base.MinuteSet", "Base.Hour", "Base.Day", "Base.Month"]
  "changedInLast": The time period for which the data will be extracted. (E.g. '30m', '24h', '7d', ...)
  "#apiToken": <your-secret-tocken>,
}
</pre>


- `apiURI` is url of the service
- `endpoint` is an api endpoint
- `#apiToken` is your secret token
- `measurementId` is your unique ID
- `granularity` is measured time period like minute, hour, day, ...
- `changedInLast` is time range for data extract


## Contact

BizzTreat, s.r.o
Bubenská 1477/1
Prague

If you have any question contact support@bizztreat.com

Cheers!