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
        return await getAllCollectionData()
    } catch(err) {
        console.log("Failed to get Credential")
    }
}

const getAllCollectionData =async () => {

      const dffd = collectionNames.map((endpoint) => axios.post(`https://api.premisehq.co/v2/api/${endpoint.replace(new RegExp('^' + clientName), '')}/get-with-extended-query`, 
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

 module.exports = {getTokenHandler}