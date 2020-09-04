public with sharing class LookupController {
  private final static Integer MAX_RESULTS = 5;

  @AuraEnabled
  public static List<LookupSearchResult> search(
    String searchTerm,
    String nameField,
    String objectApiName,
    String iconName
  ) {
    // Prepare results
    Schema.SObjectType type = Schema.getGlobalDescribe().get(objectApiName);
    Boolean canAccess = type.getDescribe().isAccessible();
    List<LookupSearchResult> results = new List<LookupSearchResult>();
    if (canAccess) {
      String SearchQUERY =
        'FIND \'' +
        searchTerm +
        '\' IN ALL FIELDS RETURNING ' +
        objectApiName +
        '(' +
        nameField +
        ') LIMIT 5';
      List<List<SObject>> sObjectLists = search.query(SearchQUERY);
      List<SObject> targetList = sObjectLists[0];
      for (SObject obj : targetList) {
        results.add(
          new LookupSearchResult(
            obj.Id,
            objectApiName,
            iconName,
            (String) obj.get(nameField),
            null
          )
        );
      }
    }
    return results;
  }
}
