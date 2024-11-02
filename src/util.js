    const convert = require('xml-js');

    export default function parseXml(xmlData){
        const jsonResult = convert.xml2json(xmlData, {
            compact: true,
            spaces: 2
        });
        return jsonResult;
    }