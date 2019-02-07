/*eslint semi: ["error", "never"], no-console:0, no-nested-ternary:0 */
/*eslint no-unused-expressions: ["error", { "allowTernary": true }]*/
/*eslint-env node, es6 */

/**
 * =====================================================================================================================
 * Transform a tab-delimited text strean into batches of HANA UPSERT statements
 * =====================================================================================================================
 **/
const es       = require('event-stream')
const cds      = require('@sap/cds')
const db_utils = require('./db_utils.js')

/***********************************************************************************************************************
 * Metadata objects for the HANA tables being updated
 * The colNames property must conform to the following constraints:
 * 1) It must contain an entry for all columns in the text file arriving from geonames.org
 * 2) Each entry must be either the HANA table column name, or null if that column does not need to be imported
 */
const geoNames = new db_utils.TableMetadata({
  tableName : "ORG_GEONAMES_GEONAMES"
, colNames : ["GeonameId", "Name", null, null, "Latitude", "Longitude", "FeatureClass_FeatureClass"
  , "FeatureCode_FeatureCode", "CountryCode_ISO2", "CountryCodesAlt", "Admin1", "Admin2", "Admin3", "Admin4"
  , "Population", "Elevation", "DEM", "Timezone_TimezoneName", "LastModified"]
})

const alternateNames = new db_utils.TableMetadata({
  tableName : "ORG_GEONAMES_ALTERNATENAMES"
, colNames : ["AlternateNameId", "GeonameId_GeonameId", "ISOLanguage", "AlternateName", "isPreferredName", "isShortName"
  , "isColloquial", "isHistoric", "inUseFrom", "inUseTo"]
})

/***********************************************************************************************************************
 * Handle a text file stream encountered within a ZIP file
 * When the read stream finishes, update the relavant eTag field in the country table
 */
const handleTextFile =
  dbTableData =>
    (entry, countryObj, isAltNames, etag) =>
      entry
        .pipe(es.split())
        .pipe(new db_utils.Upsert({dbTableData: dbTableData, iso2: countryObj.ISO2}))
        .on('finish', () => {
          // Update the appropriate eTag value and time fields
          if (isAltNames) {
            countryObj.ALTNAMESETAG     = etag
            countryObj.ALTNAMESETAGTIME = Date.now()
          }
          else {
            countryObj.COUNTRYETAG     = etag
            countryObj.COUNTRYETAGTIME = Date.now()
          }

          return cds.run( db_utils.genUpsertFrom( "ORG_GEONAMES_BASE_GEO_COUNTRIES", Object.keys(countryObj))
                        , Object.values(countryObj))
                    .catch(console.error)
        })

/**
 * =====================================================================================================================
 * Public API
 * =====================================================================================================================
 **/
module.exports = {
  handleGeonamesFile       : handleTextFile(geoNames)
, handleAlternateNamesFile : handleTextFile(alternateNames)
}
