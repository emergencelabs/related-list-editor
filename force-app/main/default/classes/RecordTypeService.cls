public with sharing class RecordTypeService {
  @AuraEnabled
  public static String getRecordTypeId(String objectApiName, String recordId) {
    String safeObjectApiName = String.escapeSingleQuotes(objectApiName);
    try {
      List<SObject> objList = Database.query(
        'SELECT RecordTypeId FROM ' +
        safeObjectApiName +
        ' WHERE Id = \'' +
        recordId +
        '\' LIMIT 1'
      );
      String rtId = (String) objList.get(0).get('RecordTypeId');
      if (rtId != null) {
        return rtId;
      }
      return getDefaultRecordTypeId(safeObjectApiName);
    } catch (QueryException qe) {
      return getDefaultRecordTypeId(safeObjectApiName);
    } catch (Exception e) {
      return null;
    }
  }

  // NOTE: because there is no guarantee that at the application level we end up using the default record type id
  // we still need to get it here for the child object
  @AuraEnabled
  public static Map<String, String> getRecordTypeIdForList(
    String objectApiName,
    List<Id> recordIds
  ) {
    String safeObjectApiName = String.escapeSingleQuotes(objectApiName);
    // first get the default record type id as its needed no matter what
    String defaultRecordTypeId = getDefaultRecordTypeId(safeObjectApiName);
    Map<String, String> recordTypeMaps = new Map<String, String>{
      'Default' => defaultRecordTypeId
    };
    try {
      List<SObject> objList = Database.query(
        'SELECT Id, RecordTypeId FROM ' +
        safeObjectApiName +
        ' WHERE Id IN :recordIds'
      );
      for (SObject obj : objList) {
        String rtId = (String) obj.get('RecordTypeId');
        if (rtId != null) {
          recordTypeMaps.put((String) obj.get('Id'), rtId);
        } else {
          recordTypeMaps.put((String) obj.get('Id'), defaultRecordTypeId);
        }
      }
      return recordTypeMaps;
    } catch (QueryException qe) {
      return recordTypeMaps;
    } catch (Exception e) {
      return null;
    }
  }

  private static String getDefaultRecordTypeId(String objectApiName) {
    SObjectType sObjectDetail = Schema.getGlobalDescribe().get(objectApiName);
    DescribeSObjectResult res = sObjectDetail.getDescribe();
    List<Schema.RecordTypeInfo> rtis = res.getRecordTypeInfos();
    for (Schema.RecordTypeInfo rt : rtis) {
      if (rt.getDeveloperName() == 'Master') {
        return rt.getRecordTypeId();
      }
    }
    return null;
  }
}
