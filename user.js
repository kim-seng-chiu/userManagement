'use strict';

const AWS = require('aws-sdk');

const crypto = require('crypto');
const kms = new AWS.KMS({
  accessKeyId: `${process.env.AWS_ACCESS_KEY_ID}`,
  secretAccessKey: `${process.env.AWS_SECRET_ACCESS_KEY}`,
  region: 'ap-southeast-2'
});

const generateGUID = () => crypto.randomBytes(16).toString('hex');

const dynamodb = new AWS.DynamoDB.DocumentClient();

function encrypt(dataIn) {
  return new Promise((resolve,reject) => {
    const encryptParams = {
      KeyId: `${process.env.KEY_ID}`,
      Plaintext: dataIn
    };
    console.log('Set encryption parameters');
      kms.encrypt(encryptParams, (err, data) => {
        if(err) {
          throw err;
        } else {
          resolve(data.CiphertextBlob);
        }
    });
  })
};

module.exports.create = async event => {
  const body = JSON.parse(event.body);
  const firstName = body.firstName;
  const lastName = body.lastName;
  const username = body.username;
  const email = body.email;
  const passUnencrypt = body.password;
  console.log('Got data');

  console.log('Encrypting password');
  const encryptedPw = await encrypt(passUnencrypt);
  console.log('Encrypted password');
  
  console.log('Setting data parameters');
  const params = {
    TableName:'USER_TABLE',
    Item: {
      id: generateGUID(),
      firstName: firstName,
      lastName: lastName,
      username: username,
      credentials: encryptedPw,
      email: email
    }
  };
  console.log('Set data parameters');
  
  console.log('Writing data');
  try {
    console.log('Starting to put data');
    const data = await dynamodb.put(params).promise();
    console.log('Finishing data put');
    const response = {
      statusCode: 200
    };
    return response;
  }
  catch(e) {
    return {
      statusCode: 500,
      body: JSON.stringify(e)
    }
  }
}

module.exports.list = async event => {
  const params = {
    TableName: 'USER_TABLE'
  };
  try {
    const data = await dynamodb.scan(params).promise();
    const response = {
      statusCode: 200,
      body: JSON.stringify(data.Items)
    }
    return response;
  }
  catch(e) {
    return {
      statusCode: 500,
      body: JSON.stringify(e)
    }
  }
};

