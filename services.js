const axios = require('axios')
const qs = require('qs')
const { collectionNames } = require('./operationTypes')
const clientName = 'AtlasGlobalHoa_'

let credential = {}

const getTokenHandler = async () => {
    const payload = {
        Username: 'codemen.susmita@gmail.com',
        Password: 'C0d3fun#!!'
    }

    try {
        const response =  await axios.post(`https://api.premisehq.co/v3/accounts/token`, qs.stringify(payload))
        credential = response.data
        console.log()
        // await getCount()
        return await getAllCollectionData()
    } catch(err) {
        console.log("Failed to get Credential")
    }
}

const getCount = async () => {
    try {
        const response = await axios.post(`https://api.premisehq.co/v2/api/${collectionNames[0].replace(new RegExp('^' + clientName), '')}/get-with-extended-query`, 
        {
          "schema":{
              "name":`@client_${collectionNames[0].replace(new RegExp('^' + clientName), '')}`,
              "alias":"doc"},
              count: true,
              "join":[],"query":"","select":[]
          },
          {headers: {'Authorization': `Bearer ${credential.accessToken}` }}
        )
        console.log(response.data.data[0].count)
    } catch(err) {
        console.log('From Response')
    }
}

const getBaseCollectionData = async (collectionNames, skip, limit) => {
    try {
        const response = await axios.post(`https://api.premisehq.co/v2/api/${collectionNames.replace(new RegExp('^' + clientName), '')}/get-with-extended-query`, 
        {
          "schema":{
              "name":`@client_${collectionNames.replace(new RegExp('^' + clientName), '')}`,
              "alias":"doc"},
              pagination:{skip: skip, limit: limit},
              "join":[],"query":"","select":[]
          },
          {headers: {'Authorization': `Bearer ${credential.accessToken}` }}
        )
        console.log(response.data.data)
    } catch(err) {
        console.log('From Response')
    }
}

const getAllCollectionData =async () => {
    let copyCollectionName = [...collectionNames]
    copyCollectionName = copyCollectionName.slice(1)

      const dffd = copyCollectionName.map((endpoint) => axios.post(`https://api.premisehq.co/v2/api/${endpoint.replace(new RegExp('^' + clientName), '')}/get-with-extended-query`, 
      {
        "schema":{
            "name":`@client_${endpoint.replace(new RegExp('^' + clientName), '')}`,
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

 module.exports = {getTokenHandler, getCount, getBaseCollectionData}