const OPERATIONTYPE = require("./operationTypes")
const client_setup = require('./client_setup')
const gl_detail = require('./gl_detail')
const gl_mapping = require('./gl_mapping')
const property_mapping = require('./property_mapping')
const segment_mapping = require('./segment_mapping')
const inputJson = require("./gl_detail.json")

const mapping = {
    AtlasGlobalHoa_GL_details: gl_detail,
    AtlasGlobalHoa_GL_mapping: gl_mapping,
    AtlasGlobalHoa_Property_mapping: property_mapping,
    AtlasGlobalHoa_Client_setup: client_setup,
    AtlasGlobalHoa_Segment_mapping: segment_mapping
  }

const checkBaseCondition = () => {
    return true;
}

const getSpecficRowValue = (valueToMatch, tableName, columnName) => {
    for(let idx = 0;idx<tableName.length;idx++) {
        if(tableName[idx][columnName] == valueToMatch) {
            return tableName[idx]
        }
    }
    return {}
}

const getRowValue = (currentObj, totalStore, obj) => {
    const {matchWith, collectionName, columnName, store, from} = currentObj
    let rowValue = {}
    if (from === 'array') {
        const [fromWhere, colmnName] = matchWith;
        const value = (fromWhere === 'base') ? obj[colmnName] : totalStore[parseInt(fromWhere)][colmnName];
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
    if(JSON.stringify(obj.baseCondition) === "{}" || checkBaseCondition()) {
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
                obj.destinationColumn = ''
                isMatched = false;
                return;
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
        if(isMatched) {
            const {staticValue, from, tableName, columnName, valueFormate} = jsonLogic.valueFromTarget
            if(staticValue) {
                jsonLogic.destinationColumn = staticValue
            } else if(from === 'store') {
                console.log(totalStore[parseInt(tableName)][columnName])
            } else {
                const [fromWhere, colmnName] = matchWith;
                const value = (fromWhere === 'base') ? obj[colmnName] : totalStore[parseInt(fromWhere)][colmnName];
                let finalValue = getSpecficRowValue(value, mapping[tableName], columnName);
                if(valueFormate) {
                    finalValue =  formatHandler(finalValue)
                }
                jsonLogic.destinationColumn = finalValue;
            }
        }
    } else {
        obj.destinationColumn = ''
    }
}

const concatHandler = (obj, inputJson) => {
    if(JSON.stringify(inputJson.baseCondition) === "{}" || checkBaseCondition()) {
        let finalOutput = '',totalStore = []
        
        for(let idx = 0;idx<inputJson.concatenation.length;idx++) {
            const {from, collectionName, columnName, concatWith} = inputJson.concatenation[idx]
            
            let value = {}
            if(from === "client_setup" && mapping[collectionName].length > 0) {
                value = mapping[collectionName][0]
            } else if(from === 'store') {
                value = totalStore[parseInt(collectionName)][columnName]
            } else {
                value = obj
            }
            finalOutput = `${finalOutput}${value[columnName]}${concatWith}`
        }
    } else {
        console.log("FROM ELSE")
    }
}

const operations = {
    '+': (a, b) => a + b,
    '-': (a, b) => a - b,
    '*': (a, b) => a * b,
    '/': (a, b) => a / b,
  };

const calculationHandler = (obj, inputJson) => {
    if(JSON.stringify(inputJson.baseCondition) === "{}" || checkBaseCondition()) {
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
            } else if (from === 'store') {
              value = totalStore[parseInt(collectionName)];
            } else {
              value = obj;
            }
          
            store && fullStore.push(value);
            finalOutput = operations[operand](+finalOutput, +value[columnName]);
          }
          

        console.log(finalOutput)
    }
}

gl_detail.forEach(detail => {
    inputJson.operations.forEach(operation => {
        switch(operation.operationType) {
            case OPERATIONTYPE.LOOKUP:
                lookupHandler(detail, operation);
                break;
            case OPERATIONTYPE.CONCAT:
                concatHandler(detail, operation);
                break;
            case OPERATIONTYPE.CALCULATION:
                calculationHandler(detail, operation);
                break;
            default:
                console.log("Invalid Operation");
        }
    })
})