'use strict'

const elasticsearch = require('elasticsearch')
const moment = require('moment')
const uuidV4 = require('uuid/v4')

exports.handler = (event, context, callback) => {
  console.log('Received event:', JSON.stringify(event, null, 2))

  if (environmentVariablesContainIssues()) {
    return
  }

  var dateStampElasticIndex = process.env.DATESTAMP_ELASTIC_INDEX === 'true'

  var client = new elasticsearch.Client({
    host: process.env.ELASTICSEARCH_HOST,
    log: process.env.ELASTICSEARCH_LOG_LEVEL || 'error'
  })

  function onPingResponse (err, res) {
    if (err) {
      return
    }

    console.log('Successfully made connection with Elasticsearch.')
  }

  client.ping({
    requestTimeout: 30000
  }, onPingResponse)

  function onCreateResponse (err, res) {
    if (err) {
      console.error('Failed to insert document:', err)

      return
    }

    console.log('Inserted CloudWatch EC2 instance event into Elasticsearch.')
  }

  var instanceId = event['instance-id']
  var state = event['state']

  if (instanceId && state) {
    var now = moment()
    var dateStamp = now.format('YYYY.MM.DD')
    var index = dateStampElasticIndex
      ? process.env.ELASTICSEARCH_INDEX + '-' + dateStamp
      : process.env.ELASTICSEARCH_INDEX

    client.create({
      index: index,
      type: process.env.ELASTICSEARCH_DOCUMENT_TYPE,
      id: uuidV4(),
      body: {
        instanceId: instanceId,
        state: state,
        created: now
      }
    }, onCreateResponse)
  }
}

function environmentVariablesContainIssues () {
  var variablesContainIssues = false

  if (!process.env.ELASTICSEARCH_HOST) {
    logMissingEnvironmentVariableError('ELASTICSEARCH_HOST')

    variablesContainIssues = true
  }

  if (!process.env.ELASTICSEARCH_INDEX) {
    logMissingEnvironmentVariableError('ELASTICSEARCH_INDEX')

    variablesContainIssues = true
  }

  if (!process.env.ELASTICSEARCH_DOCUMENT_TYPE) {
    logMissingEnvironmentVariableError('ELASTICSEARCH_DOCUMENT_TYPE')

    variablesContainIssues = true
  }

  return variablesContainIssues
}

function logMissingEnvironmentVariableError (variableName) {
  console.error('Environment variable: ' + variableName + ' has not been set.')
}
