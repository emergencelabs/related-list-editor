public with sharing class RecordTypeService {
  @AuraEnabled
  public static String getRecordTypeId(String objectApiName, String recordId) {
    try {
      List<SObject> objList = Database.query(
        'SELECT RecordTypeId FROM ' +
        objectApiName +
        ' WHERE Id = \'' +
        recordId +
        '\' LIMIT 1'
      );
      String rtId = (String) objList.get(0).get('RecordTypeId');
      if (rtId != null) {
        return rtId;
      }
      return getDefaultRecordTypeId(objectApiName);
    } catch (QueryException qe) {
      return getDefaultRecordTypeId(objectApiName);
    } catch (Exception e) {
      System.debug(e.getCause());
      System.debug(e.getTypeName());
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
