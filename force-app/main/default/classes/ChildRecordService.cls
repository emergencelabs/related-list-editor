public with sharing class ChildRecordService {
  // NOTE: there is technically a query within the loop here so it seems like
  // i'll need to change the approach to include the recordTypeId in the query and do the
  // bs to get catching it when it doesnt exist again but this will work for now
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

  // update to try/catch and return error message if failure to show to end user
  @AuraEnabled
  public static void deleteChildRecord(SObject childObject) {
    delete childObject;
  }

  @AuraEnabled
  public static Map<Id, Map<String, String>> updateChildRecords(
    List<SObject> childRecords
  ) {
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
              // there's a bug here where custom fields dont come back with __c or the namspace, thefuck
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
  }
}
