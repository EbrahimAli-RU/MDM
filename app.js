const {operationTypes : OPERATIONTYPE} = require("./operationTypes")
const { getCollectionsData, getCount, getBaseCollectionData, insertToOutpotTable } = require('./services')
const GL_JSON = require("./gl_detail.json")

const mapping = {};

const mappingHandler = (collectionNames, res) => {
    for (let i = 0; i < collectionNames.length; i++) {
        mapping[collectionNames[i]] = res[i]?.data?.data;
    }
}

const checkBaseCondition = (obj, inputJson) => {
    if(JSON.stringify(inputJson.baseCondition) === '{}') return true
    let rowValue = {}
    const {from, collectionName, columnName, matchValue} = inputJson.baseCondition
    if (from === "client_setup" && mapping[collectionName].length > 0) {
        rowValue = mapping[collectionName][0];
      } else if (from === 'array') {
          const [fromWhere, columnName] = matchWith;
          const value = (fromWhere === 'base') ? obj[columnName] : totalStore[parseInt(fromWhere)][columnName];
          rowValue = getSpecficRowValue(value, mapping[collectionName], columnName);
          store && totalStore.push(rowValue);
      } else if (from === 'store') {
        rowValue = totalStore[parseInt(collectionName)];
      } else {
        rowValue = obj;
      }
      if(matchValue) {
        for(let idx = 0;idx<matchValue.length;idx++) {
            if(matchValue[idx].value === rowValue[columnName]) {
                if(JSON.stringify(matchValue[idx].targetValue) !== '{}') {
                    inputJson.valueFromTarget = matchValue[idx].targetValue
                }
                return true;
            }
          }
      }
      
    return false;
}

const getSpecficRowValue = (valueToMatch, collectionName, columnName) => {

    for(let idx = 0;idx<collectionName.length;idx++) {
        if(collectionName[idx][columnName] == valueToMatch) {
            return collectionName[idx]
        }
    }
    return {}
}

const getRowValue = (currentObj, totalStore, obj) => {
    const {matchWith, collectionName, columnName, store, from} = currentObj
    let rowValue = {}
    if (from === 'array') {
        const [fromWhere, column] = matchWith;
        const value = (fromWhere === 'base') ? obj[column] : totalStore[parseInt(fromWhere)][column];
        rowValue = getSpecficRowValue(value, mapping[collectionName], columnName);
        store && totalStore.push(rowValue);
    } else if (from === 'store') {
        rowValue = totalStore[parseInt(collectionName)];
    } else if(from === "client_setup" && mapping[collectionName].length > 0) {
        rowValue = mapping[collectionName][0]
    } else {
        rowValue = obj;
    }
    return rowValue;
}

const lookupHandler = (obj, jsonLogic) => {
    if(checkBaseCondition(obj, jsonLogic)) {
       
        const joins = jsonLogic.joins
        let isMatched = false;
        const totalStore = []
        for(let i=0;i<joins.length;i++) {
            const currentObj = joins[i];
            let leftRowValue = {}, rightRowValue = {}

            leftRowValue = getRowValue(currentObj.leftColumn, totalStore, obj)
            rightRowValue = getRowValue(currentObj.rightColumn, totalStore, obj)
            /// IF NOT MATCHED TO LEFT COLUMN
            if(JSON.stringify(rightRowValue) === '{}') {
                isMatched = false;
                return "";
            }
            
            isMatched = true;
            if(JSON.stringify(currentObj.joinCondition) !== '{}') {
                const {from, collectionName, columnName} = currentObj.joinCondition
                isMatched = false;
                let valueFromConditionColumn = {}
                
                if(from === 'store') {
                    valueFromConditionColumn = totalStore[parseInt(collectionName)][columnName]
                }
                const valueTomatch = currentObj.joinCondition.valueToMatch
                for(let idx=0;idx<valueTomatch.length;idx++) {
                    if(valueTomatch[idx]['value'] === valueFromConditionColumn) {
                        isMatched = true;
                        jsonLogic.valueFromTarget = valueTomatch[idx].valueFrom
                        break;
                    }
                }
            }
        }
        let finalOutput = ''
        if(isMatched) {
            const {staticValue, from, collectionName, columnName, valueFormate} = jsonLogic.valueFromTarget
            if(staticValue) {
                jsonLogic.destinationColumn = staticValue
                finalOutput = staticValue
            } else if(from === 'store') {
                finalOutput = totalStore[parseInt(collectionName)][columnName]
            } else {
                const [fromWhere, columnName] = matchWith;
                const value = (fromWhere === 'base') ? obj[columnName] : totalStore[parseInt(fromWhere)][columnName];
                let finalValue = getSpecficRowValue(value, mapping[collectionName], columnName);
                if(valueFormate) {
                    finalValue =  formatHandler(finalValue)
                }
                finalOutput = finalValue
            }
        }
        return finalOutput
    } else {
        return ""
    }
}

const concatHandler = (obj, inputJson) => {
    let finalOutput = '',totalStore = []
    if(checkBaseCondition(obj, inputJson)) {

        for(let idx = 0;idx<inputJson.concatenation.length;idx++) {
            const {from, collectionName, columnName, concatWith} = inputJson.concatenation[idx] 
            let value = {}
            if(from === "client_setup" && mapping[collectionName].length > 0) {
                value = mapping[collectionName][0]
            } else if (from === 'array') {
                const [fromWhere, columnName] = matchWith;
                const value = (fromWhere === 'base') ? obj[columnName] : totalStore[parseInt(fromWhere)][columnName];
                value = getSpecficRowValue(value, mapping[collectionName], columnName);
                store && totalStore.push(value);
            } else if(from === 'store') {
                value = totalStore[parseInt(collectionName)]
            } else {
                value = obj
            }
            finalOutput = `${finalOutput}${value[columnName]}${concatWith}`
        }
    } 
    return finalOutput;
}

const operations = {
    '+': (a, b) => a + b,
    '-': (a, b) => a - b,
    '*': (a, b) => a * b,
    '/': (a, b) => a / b,
  };

const calculationHandler = (obj, inputJson) => {
    if(checkBaseCondition(obj, inputJson)) {
        let finalOutput = 0, prevData = {};
        let fullStore = []
        if(inputJson.calculation.length > 0) {
            const currentObj = inputJson.calculation[0]
            if(currentObj.from === "client_setup" && mapping[currentObj.collectionName].length > 0) {
                prevData = mapping[currentObj.collectionName][0]
            } else if(currentObj.from === 'store') {
                prevData = totalStore[parseInt(currentObj.collectionName)]
            } else {
                prevData = obj
            }
            if(currentObj.store) fullStore.push(prevData)
            finalOutput = prevData[currentObj.columnName]
        }
        
        for (let idx = 1; idx < inputJson.calculation.length; idx++) {
            const { from, collectionName, store, operand, columnName } = inputJson.calculation[idx];
          
            let value;
          
            if (from === "client_setup" && mapping[collectionName].length > 0) {
              value = mapping[collectionName][0];
            } else if (from === 'array') {
                const [fromWhere, columnName] = matchWith;
                const value = (fromWhere === 'base') ? obj[columnName] : totalStore[parseInt(fromWhere)][columnName];
                rowValue = getSpecficRowValue(value, mapping[collectionName], columnName);
                store && totalStore.push(rowValue);
            } else if (from === 'store') {
              value = totalStore[parseInt(collectionName)];
            } else {
              value = obj;
            }
          
            store && fullStore.push(value);
            finalOutput = operations[operand](+finalOutput, +value[columnName]);
          }
          

        return finalOutput
    }
}

function formatDate(inputDateStr) {
    const date = new Date(inputDateStr);
  
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); 
    const day = String(date.getDate()).padStart(2, '0');
  
    const formattedDate = `${month}/${day}/${year}`;
  
    return formattedDate;
  }

  function UniqueDate(inputDateStr) {
    // Remove all occurrences of "/"
    const formattedDate = inputDateStr.toString().replace(/\//g, '');
  
    return formattedDate;
  }
  

const formatHandler = (value, formatType) => {
    let formatedValue = ''
    switch(formatType) {
        case 'Date':
            formatedValue = formatDate(value);
            break;
        case 'DateUnique':
            formatedValue = formatDate(value);
            formatedValue = UniqueDate(formatedValue);
            break;
        default:
            console.log("Unknown Type");
    }

    return formatedValue
}

const copyHandler = (obj, inputJson, output) => {
    let finalOutput = ''
    if(checkBaseCondition(obj, inputJson)) {
        const {staticValue, from, collectionName, columnName, valueFormate} = inputJson.valueFromTarget
        let rowValue = {}
        if(JSON.stringify(inputJson?.valueFromTarget) !== '{}') {
            if(staticValue) {
                finalOutput = staticValue
            } else if (from === "client_setup" && mapping[collectionName].length > 0) {
                finalOutput = mapping[collectionName][0][[columnName]];
              } else if (from === 'array') {
                  const [fromWhere, columnName] = matchWith;
                  const value = (fromWhere === 'base') ? obj[columnName] : totalStore[parseInt(fromWhere)][columnName];
                  rowValue = getSpecficRowValue(value, mapping[collectionName], columnName);
                  finalOutput = rowValue[columnName]
                  store && totalStore.push(rowValue);
              } else if (from === 'store') {
                rowValue = totalStore[parseInt(collectionName)];
                finalOutput = rowValue[columnName]
              } else if(from === 'output'){
                rowValue = output;
                finalOutput = rowValue[columnName]
              }
              else {
                rowValue = obj;
                finalOutput = rowValue[columnName]
              }

              if(valueFormate) {
                finalOutput = formatHandler(finalOutput, valueFormate)
              }
        }
    } 

    return finalOutput
}

const startProcessing = (data, inputJson) => {
    let finalData = []
    data.forEach(detail => {
        let finalOutput = {}
        inputJson.operations.forEach(operation => {
            let calculatedValue = ''
            switch(operation.operationType) {
                case OPERATIONTYPE.LOOKUP:
                    calculatedValue = lookupHandler(detail, operation);
                    break;
                case OPERATIONTYPE.CONCAT:
                    calculatedValue = concatHandler(detail, operation);
                    break;
                case OPERATIONTYPE.CALCULATION:
                    calculatedValue = calculationHandler(detail, operation);
                    break;
                case OPERATIONTYPE.COPY:
                    calculatedValue = copyHandler(detail, operation, finalOutput);
                    break;
                default:
                    console.log("Invalid Operation");
            }
            finalOutput = {
                ...finalOutput,
                [operation.destinationField.newColumnName]: calculatedValue
            }
        })
    
        finalData.push(finalOutput)
    })
    return finalData
}

const getCountAndProcessingData = async (inputJson) => {
    let skip = 0, limit = 10
    const totalDataCount = await getCount(inputJson.baseCollection)
    for(let i = 0;i<=totalDataCount;i = i + limit) {
        const data = await getBaseCollectionData(inputJson.baseCollection, i, limit)
        mapping[inputJson.baseCollection] = data
        await insertToOutpotTable(startProcessing(data, inputJson), inputJson.outputCollectionNames)
    }
}

const jsonMapping = {
    AtlasGlobalHoa_GL_Output : GL_JSON
}

export const handler = async (event, context) => {
    console.log(JSON.stringify(event));
    const inputJson = jsonMapping[event.collectionName]
  
    const main = async () => {
        try {
            const response = await getCollectionsData(inputJson.collectionNames)
            if(inputJson.collectionNames.length === response.length) {
                mappingHandler(inputJson.collectionNames, response)
                await getCountAndProcessingData(inputJson)
            } else {
                throw Error;
            }
        } catch(err) {
            console.log("FROM APP", err)
        }
      }
    
      await main()
  };

  const main = async () => {
    const inputJson = jsonMapping['AtlasGlobalHoa_GL_Output']
    try {
        const response = await getCollectionsData(inputJson.collectionNames)
        if(inputJson.collectionNames.length === response.length) {
            mappingHandler(inputJson.collectionNames, response)
            await getCountAndProcessingData(inputJson)
        } else {
            throw Error;
        }
    } catch(err) {
        console.log("FROM APP", err)
    }
  }

  main()
