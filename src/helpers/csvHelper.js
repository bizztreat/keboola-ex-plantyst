const _ = require('lodash')
const fs = require('fs')
const path = require('path')
const csv = require('fast-csv')
const jsonfile = require('jsonfile')
const json2csv = require('json2csv')

module.exports = {
  generateCsvFiles,
  generateManifests,
  getTextFromCsvFile
}

/**
 * This function reads and parse file selected by a user.
 * Then it converts the whole file into single string.
 *
 * @param {Object} config - user configuration.
 * @param {string} dataDir - input directory.
 * @throws {error}
 * @returns {string}
 */
async function getTextFromCsvFile (config, dataDir) {
  try {
    const { inputFileName } = config
    const fileName = path.join(dataDir, inputFileName)
    const arrayOfRows = await parseCsvFile(fileName)
    const csvFile = await convertToString(arrayOfRows)

    return csvFile
  } catch (error) {
    throw error
  }
}

/**
 * This function reads the big object returned by Google NLP response,
 * gets all relevant keys (which contains array or object) and store content
 * into a single file (named after the key).
 *
 * @param {string} dataDir - output directory.
 * @param {Object} annotations - response from Google NLP service.
 * @returns {undefined}
 */
async function generateCsvFiles (dataDir, annotations) {
  const keys = Object.keys(annotations)
  for (const key of keys) {
    const data = annotations[key]
    if (_.isArray(data) || _.isObject(data)) {
      const content = await json2csv({ data })
      await writeCsvFile(path.join(dataDir, `${key}.csv`), content)
    }
  }
}

/**
 * This function reads the contents of the output directory, filter out files which are not .csv
 * and iterates over each file and generate a simple manifest which triggers a full-load into KBC.
 *
 * @param {string} dataDir - output directory.
 * @returns {undefined}
 */
async function generateManifests (dataDir) {
  const files = await readDirectory(dataDir)
  const csvFiles = files.filter(file => path.extname(file) === '.csv')

  for (const file of csvFiles) {
    await createManifestFile(path.join(dataDir, `${file}.manifest`), { incremental: false })
  }
}

/**
 * This function reads the file via streams and reads every line.
 * The result is returned as an array via Promise.
 *
 * @param {string} fileName - path the fileName which is going to be processed.
 * @returns {Promise.<[]>}
 */
function parseCsvFile (fileName) {
  return new Promise((resolve, reject) => {
    const contentArray = []
    const readStream = fs.createReadStream(fileName)
    csv.fromStream(readStream)
      .on('data', (row) => contentArray.push(row))
      .on('error', (error) => reject(error))
      .on('end', () => resolve(contentArray))
  })
}

/**
 * This function gets the filename and data and prepares the output file.
 *
 * @param {string} file - path + name of the output file.
 * @param {Array|Object} data - content which is going to be written into a file.
 * @returns {Promise.<[]>}
 */
function writeCsvFile (file, data) {
  return new Promise((resolve, reject) => {
    fs.writeFile(file, data, (error) => {
      if (error) {
        reject(error)
      } else {
        resolve()
      }
    })
  })
}

/**
 * This function reads the arrays (rows) and convert them into single string.
 *
 * @param {Array} arrayOfRows - content of the input file split into rows stored in array.
 * @returns {Promise.<[]>}
 */
function convertToString (arrayOfRows) {
  return new Promise((resolve, reject) => {
    csv.writeToString(arrayOfRows, { headers: true }, (error, data) => {
        if (error) {
          reject(error)
        } else {
          resolve(data)
        }
      }
    )
  })
}

/**
 * This function reads the directory and store all the files into an array.
 *
 * @param {string} dataDir - directory with the files which are going to be read.
 * @returns {Promise.<[]>}
 */
function readDirectory (dataDir) {
  return new Promise((resolve, reject) => {
    fs.readdir(dataDir, (error, files) => {
      if (error) {
        reject(error)
      } else {
        resolve(files)
      }
    })
  })
}

/**
 * This function generates a manifest (JSON) file with data passed in input.
 *
 * @param {string} fileName - output filename.
 * @param {Object} data - output to be written.
 * @returns {Promise}
 */
function createManifestFile (fileName, data) {
  return new Promise((resolve, reject) => {
    jsonfile.writeFile(fileName, data, {}, (error) => {
      if (error) {
        reject(error)
      } else {
        resolve()
      }
    })
  })
}