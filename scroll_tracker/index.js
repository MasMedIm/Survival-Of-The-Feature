 'use strict';
 const AWS = require('aws-sdk');
 const docClient = new AWS.DynamoDB.DocumentClient();
 const TABLE = process.env.TABLE_NAME;

 exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event));
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (err) {
    console.error('Invalid JSON:', err);
    return { statusCode: 400, body: 'Invalid JSON' };
  }
  const { variant, sessionId, maxDepth, ts } = body;
  if (!variant || !sessionId || maxDepth == null || ts == null) {
    return { statusCode: 400, body: 'Missing required fields' };
  }
  const item = {
    sessionId: String(sessionId),
    ts: Number(ts),
    variant: String(variant),
    maxDepth: Number(maxDepth),
    ttl: Math.floor(Date.now() / 1000) + 7*24*3600
  };
  try {
    await docClient.put({ TableName: TABLE, Item: item }).promise();
    return { statusCode: 200, body: JSON.stringify({ status: 'ok' }) };
  } catch (err) {
    console.error('DynamoDB error:', err);
    return { statusCode: 500, body: 'Server Error' };
  }
};