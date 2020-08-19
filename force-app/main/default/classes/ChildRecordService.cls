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
  public static Integer getCount(String queryString) {
    String sanitizedQueryString = queryString.escapeHtml4()
      .replace('&#39;', '\'');

    return Database.countQuery(sanitizedQueryString);
  }

  @AuraEnabled
  public static void deleteChildRecord(SObject childObject) {
    Schema.SObjectType type = childObject.getSObjectType();
    Boolean canDelete = type.getDescribe().isDeletable();
    if (!canDelete) {
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
                // TODO: when could this be more than one, dependent fields?
                // really needto look into that and then adjust this to format string
                // there's a bug here where custom fields dont come back with __c or the namespace
                fieldString += s;
                System.debug(err.getFields());
              }
            } else {
              fieldString = String.valueOf(i);
            }
            errorMap.get(targetRecordId).put(fieldString, err.getMessage());
            // System.debug(err.getStatusCode() + ': ' + err.getMessage());
            // System.debug('fields that affected this error: ' + err.getFields());
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
