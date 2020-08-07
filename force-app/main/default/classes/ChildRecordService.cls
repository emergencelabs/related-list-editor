public with sharing class ChildRecordService {
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
}
