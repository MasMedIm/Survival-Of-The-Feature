 'use strict';
 const AWS = require('aws-sdk');
 const docClient = new AWS.DynamoDB.DocumentClient();
 const TABLE = process.env.TABLE_NAME;

 exports.handler = async (event) => {
  console.log('Received GET event:', JSON.stringify(event));
  const qs = event.queryStringParameters || {};
  const variant = qs.variant;
  const params = { TableName: TABLE };
  if (variant) {
    params.FilterExpression = 'variant = :v';
    params.ExpressionAttributeValues = { ':v': variant };
  }
  try {
    const data = await docClient.scan(params).promise();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: data.Items })
    };
  } catch (err) {
    console.error('DynamoDB scan error:', err);
    return {
      statusCode: 500,
      body: 'Error fetching events'
    };
  }
};