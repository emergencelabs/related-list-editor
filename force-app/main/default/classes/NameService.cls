public with sharing class NameService {
  @AuraEnabled
  public static string getNameForId(String recordId, String objectApiName) {
    // try {
    String sanitizedId = recordId.escapeHtml4();
    String sanitizedObjectApiName = objectApiName.escapeHtml4();
    return (String) (Database.query(
        'SELECT Name FROM ' +
        sanitizedObjectApiName +
        ' WHERE ID = \'' +
        sanitizedId +
        '\' LIMIT 1'
      ))
      .get(0)
      .get('Name');
    // } catch (Exception e) {
    //   throw new AuraHandledException(e);
    // }
  }
}
