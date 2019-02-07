/*eslint semi: ["error", "never"], no-console:0, no-nested-ternary:0 */
/*eslint no-unused-expressions: ["error", { "allowTernary": true }]*/
/*eslint-env node, es6 */

/**
 * =====================================================================================================================
 * HTML Utilities
 * =====================================================================================================================
 */
const bfu = require('basic-formatting-utils')

const { push } = require('./functional_tools.js')


// =====================================================================================================================
// Return an HTML span element containing some text and a mouseover description
const asSpanWithDesc = (txt, desc) => bfu.as_span([`title="${desc}"`], txt)

// =====================================================================================================================
// Return an HTML td element containing some value from the HANA table
const asTableData = tdValue => bfu.as_td(["class='bfu-td'"], tdValue)

// =====================================================================================================================
// Retrieve the elements of a given table from the CDS model
// If the table name cannot be found, return an empty array
const cdsModelDefinitions =
  cdsObj =>
    tabName =>
      (tab => tab === undefined ? [] : tab.elements)
      (cdsObj.model.definitions[tabName])

// =====================================================================================================================
// Take the cds.model.definitions["<some_table_name>"].elements object and convert each property value into an array
// of property element objects, then sort that array into column index number order
// This transformation loses the case-sensitive name defined in the orginal CDS file, but preserves the uppercase names
// used in the HANA database (in property "@cds.persistence.name")
const sortModelElements =
  elementObj =>
    Object
      .keys(elementObj)
      .reduce((acc, element) => push(acc, elementObj[element]), [])
      .sort((el1, el2) => el1.indexNo - el2.indexNo)

// =====================================================================================================================
// Transform a CDS Model elements object into a row of HTML table header elemnts
const tableHdrs =
  cdsModelDef =>
    (sortedEls =>
      bfu.as_tr( []
               , sortedEls
                   .reduce((acc, el) =>
                           // Ignore fields of type 'cds.Association'
                           (el.type === 'cds.Association')
                           ? acc
                           : ((descr, label) =>
                              // If the description is missing, then use the OData foreign key property instead
                              descr === undefined
                              ? push(acc, bfu.as_th( ["class='bfu-th'"], el['@odata.foreignKey4']))
                              : push(acc, bfu.as_th( ["class='bfu-th'"], asSpanWithDesc(label['='], descr['='])))
                             )
                             // Create a column header from the description and label fields
                             (el['@description'],el['@Common.Label'])
                           , [])
                   .join('')
               )
    )
    // Sort the elements in the CDS model definition into column order
    (sortModelElements(cdsModelDef))

// =====================================================================================================================
// Transform an array of objects read from a HANA table into the corresponding HTML table rows.
// The column order is defined by the indexNo property in the CDS Model elements object
const tableBody =
  (cdsModelDef, tableData) =>
    (sortedEls =>
      tableData
        .map(rowData =>
               bfu.as_tr( []
                        , sortedEls
                            .reduce((acc, el) =>
                                      (el.type === 'cds.Association')
                                      ? acc
                                      : push(acc, asTableData(rowData[el['@cds.persistence.name']])), [])
                            .join('')
                        )
            )
        .join('')
    )
    // Sort the elements in the CDS model definition into column order
    (sortModelElements(cdsModelDef))

// Transform a CDS Model elements object into an HTML table
const cdsElObjToHtmlTable =
  (cdsElObj, tableData) =>
    bfu.as_table(
      ["class='bfu-table'"]
    , `${tableHdrs(cdsElObj)}${tableBody(cdsElObj, tableData)}`
    )

/**
 * ---------------------------------------------------------------------------------------------------------------------
 *  Public API
 * ---------------------------------------------------------------------------------------------------------------------
 */
module.exports = {
  cdsElObjToHtmlTable : cdsElObjToHtmlTable
, cdsModelDefinitions : cdsModelDefinitions
}


