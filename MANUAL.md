# Plantyst extractor

## What It Does

This app extracts measured data objects from Plantyst API. 

https://plantystportal.docs.apiary.io/

### Allowed data objects to extract

- Measurement Data
- Metadocuments and Comments

All the objects are mapped to output CSV file. See schema below:

#### Measurement Data

['From', 'To', 'Value']

- From: Timestamp
- To: Timestamp
- Value: Sum of measurements within the from - to range

#### Metadocuments

['Guid', 'Type', 'Title', 'Description', 'CustomId', 'CreatorId', 'MeasurementId', 'From', 'To', 'Color', 'LastModified', 'Operations', 'DowntimeCode']

- Guid:
- Type: 
- Title:
- Description:
- CustomId:
- CreatorId:
- MeasurementId:
- From:
- To:
- Color:
- LastModified:
- Operations:
- DowntimeCode:

#### Comments

['DocumentGuid', 'Id', 'Text', 'ModificationTime']

- DocumentGuid: Parent guid of the metadocument
- Id: Comment d within the metadocument
- Text: Content of the message
- ModificationTime: Timestamp

## Configuration

### Parameters

<pre>
{
  "apiURI": <web-service-uri>
  "#apiToken": <your-secret-tocken>
  "measurementId": <your-id>
  "granularity": One of these ["Base.MinuteSet", "Base.Hour", "Base.Day", "Base.Month"]
  "changedInLast": The time period for which the data will be extracted. (E.g. '30m', '24h', '7d', ...)
  "metadocuments": [true/false] If you want to also extract metadocuments for measured data

}
</pre>


- `apiURI` is url of the service
- `#apiToken` is your secret token
- `measurementId` is your unique ID
- `granularity` is measured time period like minute, hour, day, ...
- `changedInLast` is time range for data extract
- `metaducuments` select if you want to read metadocuments


## Contact

BizzTreat, s.r.o
Bubenská 1477/1
Prague

If you have any question contact support@bizztreat.com

Cheers!