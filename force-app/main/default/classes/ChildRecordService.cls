public with sharing class ChildRecordService {
  // FLS is checked on the client side using the @wire getObjectInfo
  // WITH_SECURITY_ENFORCED is intentionally not used as it will throw a Query Exception if any of the fields are
  // inacessible and we want the user to be able to work with what fields are available as opposed to nothing
  @AuraEnabled
  public static List<SObject> getChildRecords(String queryString) {
    String sanitizedQueryString = queryString.escapeHtml4()
      .replace('&#39;', '\'');
    return Database.query(sanitizedQueryString);
  }

  @AuraEnabled
  public static Integer getCount(String queryString, String objectApiName) {
    String safeObjectApiName = String.escapeSingleQuotes(objectApiName);
    Schema.SObjectType type = Schema.getGlobalDescribe().get(safeObjectApiName);
    Boolean canAccess = type.getDescribe().isAccessible();
    if (canAccess) {
      String sanitizedQueryString = queryString.escapeHtml4()
        .replace('&#39;', '\'');

      return Database.countQuery(sanitizedQueryString);
    }
    return 0;
  }

  @AuraEnabled
  public static void deleteChildRecord(SObject childObject) {
    Schema.SObjectType type = childObject.getSObjectType();
    Boolean canDelete = type.getDescribe().isDeletable();
    if (canDelete) {
      delete childObject;
    } else {
      throw new AuraHandledException(
        'You do not have access to delete this record'
      );
    }
  }

  @AuraEnabled
  public static Map<Id, Map<String, String>> updateChildRecords(
    List<SObject> childRecords
  ) {
    Schema.SObjectType type = childRecords.get(0).getSObjectType();
    Boolean canUpdate = type.getDescribe().isUpdateable();
    if (canUpdate) {
      Map<Id, Map<String, String>> errorMap = new Map<Id, Map<String, String>>();
      Database.SaveResult[] srList = Database.update(childRecords, false);
      for (Integer i = 0; i < srList.size(); i++) {
        if (!srList.get(i).isSuccess()) {
          Id targetRecordId = (Id) childRecords.get(i).get('Id');
          errorMap.put(targetRecordId, new Map<String, String>());
          // Operation failed, so get all errors
          for (Database.Error err : srList.get(i).getErrors()) {
            String fieldString = '';
            if (err.getFields().size() > 0) {
              for (String s : err.getFields()) {
                fieldString += s;
              }
            } else {
              fieldString = String.valueOf(i);
            }
            errorMap.get(targetRecordId)
              .put(fieldString, err.getStatusCode() + ': ' + err.getMessage());
          }
        }
      }
      return errorMap;
    } else {
      throw new AuraHandledException(
        'You do not have access to update the requested records'
      );
    }
  }
}
