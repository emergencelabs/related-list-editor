public with sharing class ChildRecordService {
  @AuraEnabled
  public static List<SObject> getChildRecords(String queryString) {
    String sanitzedQueryString = queryString.escapeHtml4()
      .replace('&#39;', '\'');

    return Database.query(sanitzedQueryString);
  }
}
