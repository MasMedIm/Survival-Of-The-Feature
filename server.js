const express = require('express');
const bodyParser = require('body-parser');
const AWS = require('aws-sdk');
const path = require('path');

const { handler: trackHandler } = require('./scroll_tracker/index');
const { handler: readHandler } = require('./scroll_tracker/read');
const { handler: redirectHandler } = require('./redirect');

const app = express();
app.use(bodyParser.json());

const dynamodbEndpoint = process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000';
AWS.config.update({
  region: process.env.AWS_REGION || 'us-west-1',
  endpoint: dynamodbEndpoint,
});

const TABLE_NAME = process.env.TABLE_NAME;
if (!TABLE_NAME) {
  console.error('Error: TABLE_NAME environment variable is required');
  process.exit(1);
}

app.post('/track', async (req, res) => {
  const event = { body: JSON.stringify(req.body) };
  try {
    const result = await trackHandler(event);
    res.status(result.statusCode).send(result.body);
  } catch (err) {
    console.error('Error in track handler:', err);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/events', async (req, res) => {
  const event = { queryStringParameters: req.query };
  try {
    const result = await readHandler(event);
    res.status(result.statusCode).send(result.body);
  } catch (err) {
    console.error('Error in read handler:', err);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/redirect', async (req, res) => {
  try {
    const result = await redirectHandler();
    const location = result.headers && result.headers.Location;
    if (location) {
      res.redirect(location);
    } else {
      res.status(500).send('No redirect location provided');
    }
  } catch (err) {
    console.error('Error in redirect handler:', err);
    res.status(500).send('Internal Server Error');
  }
});

// Serve static files
app.use(express.static(path.join(__dirname)));
// Fallback to index.html for SPA routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
const ddb = new AWS.DynamoDB();
async function init() {
  try {
    await ddb.describeTable({ TableName: TABLE_NAME }).promise();
    console.log(`Table ${TABLE_NAME} exists`);
  } catch (err) {
    if (err.code === 'ResourceNotFoundException') {
      console.log(`Creating table ${TABLE_NAME}...`);
      await ddb.createTable({
        TableName: TABLE_NAME,
        AttributeDefinitions: [
          { AttributeName: 'sessionId', AttributeType: 'S' },
          { AttributeName: 'ts', AttributeType: 'N' }
        ],
        KeySchema: [
          { AttributeName: 'sessionId', KeyType: 'HASH' },
          { AttributeName: 'ts', KeyType: 'RANGE' }
        ],
        BillingMode: 'PAY_PER_REQUEST'
      }).promise();
      console.log(`Table ${TABLE_NAME} created`);
    } else {
      console.error('Error describing table:', err);
      process.exit(1);
    }
  }
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}
init().catch(err => {
  console.error('Initialization error:', err);
  process.exit(1);
});