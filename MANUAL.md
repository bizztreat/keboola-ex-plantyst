# Plantyst extractor

## What It Does

This app extracts measured data objects from Plantyst API. 

https://plantystportal.docs.apiary.io/

### Allowed data objects to extract

- Measurements
- Measurement Data
- Metadocuments and Comments

All the objects are mapped to output CSV file. See schema below:

#### Measurements

Represents production machines

["measurementId","title","description","quantityType","archived","rights","first"]

- measurementId: Id of the specific production machine
- title: The title of the machine
- description: The description of the machine
- quantityType: 
- archived: Flag for archived machine
- rights: List of assigned permissions
- first: Timestamp of the first measurement

#### Measurement Data

["measurementId","from","to","value"]

- measurementId: Id of the specific production machine
- from: Timestamp
- to: Timestamp
- value: Sum of measurements within the from - to range

#### Metadocuments

["guid","type","title","description","customId","creatorId","measurementId","from","to","color","setpoint","operations","downtimeCode","lastModified"]

- guid:
- type: 
- title:
- description:
- customId:
- creatorId:
- measurementId:
- from:
- to:
- color:
- lastModified:
- operations:
- downtimeCode:

#### Comments

["documentGuid","id","text","modificationTime"]

- documentGuid: Parent guid of the metadocument
- id: Comment d within the metadocument
- text: Content of the message
- modificationTime: Timestamp

## Configuration

### Parameters

<pre>
{
  "endpoint": <web-service-endpoint>
  "#apiToken": <your-secret-tocken>
  "measurementId": <your-id(s)>
  "granularity": One of these ["Base.MinuteSet", "Base.Hour", "Base.Day", "Base.Month"]
  "changedInLast": The time period for which the data will be extracted. (E.g. '30m', '24h', '7d', ...)
  "metadocuments": [true/false] If you want to also extract metadocuments for measured data
}
</pre>


- `endpoint` is an endpoint of the service
- `#apiToken` is your secret token
- `measurementId` is your unique ID(s)
- `granularity` is measured time period like minute, hour, day, ...
- `changedInLast` is time range for data extract
- `metaducuments` select if you want to read metadocuments


## Contact

BizzTreat, s.r.o
Řehořova 968/42
Prague

If you have any question contact support@bizztreat.com

Cheers!