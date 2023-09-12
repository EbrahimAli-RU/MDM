const axios = require('axios')
const {payload, url} = require('./credential') 

let credential = {}

console.log(payload)

const getCollectionsData = async (collections) => {
    const response = await getTokenHandler();
    credential = response
    return await getAllCollectionData(collections)
}

const getTokenHandler = async () => {
    // const payload = {
    //     ClientId: '5812ev0p28p19odvai29jpsu7a',
    //     ClientSecretKey: '1kltftch48njekote8ebhh49jm0uone54gkm7h6kf29f0a3mh2cg'
    // }

    try {
        const response =  await axios.post(`${url.baseUrl}/v3/accounts/api-token`, payload,
        {headers: {'Authorization': `Basic c3VwZXJ1c2VyOmNqZGpkamdodTc1NjRAZmpmayEhOTg3NjY1` }})
        return response.data
        // return await getAllCollectionData()
    } catch(err) {
        console.log("Failed to get Credential")
        return { accessToken: '' }
    }
}

const getCount = async (collectionName) => {
    try {
        const response = await axios.post(`${url.baseUrl}/v2/api/${collectionName}/get-with-extended-query`, 
        {
          "schema":{
              "name":`@client_${collectionName}`,
              "alias":"doc"},
              count: true,
              "join":[],"query":"","select":[]
          },
          {headers: {'Authorization': `Bearer ${credential.accessToken}` }}
        )
        return response.data.data[0].count;
    } catch(err) {
        console.log('From Response')
        return 0;
    }
}

const getBaseCollectionData = async (collectionName, skip, limit) => {
    try {
        const response = await axios.post(`${url.baseUrl}/v2/api/${collectionName}/get-with-extended-query`, 
        {
          "schema":{
              "name":`@client_${collectionName}`,
              "alias":"doc"},
              pagination:{skip: skip, limit: limit},
              "join":[],"query":"","select":[]
          },
          {headers: {'Authorization': `Bearer ${credential.accessToken}` }}
        )
        return response.data.data
    } catch(err) {
        console.log('From Response')
        return []
    }
}

const getAllCollectionData =async (collections) => {

      const dffd = collections.map((endpoint) => axios.post(`${url.baseUrl}/v2/api/${endpoint}/get-with-extended-query`, 
      {
        "schema":{
            "name":`@client_${endpoint}`,
            "alias":"doc"},
            "join":[],"query":"","select":[]
        },
        {headers: {'Authorization': `Bearer ${credential.accessToken}` }}
      ))
      
      try {
        const response = await axios.all(dffd)
        return response
      } catch (err) {
        return []
      }
}

const insertToOutpotTable = async (data, outPutCollectionName) => {
    try{
        const response = await axios.post(`${url.baseUrl}/v2/api/${outPutCollectionName}/bulk`, data, 
        {headers: {'Authorization': `Bearer ${credential.accessToken}` }})
        console.log(response.data?.message)
    } catch(err) {
        console.log('Failed to insert')
    }
}

 module.exports = { getTokenHandler, getCount, getBaseCollectionData, insertToOutpotTable, getCollectionsData }