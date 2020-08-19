public with sharing class LookupController {
  private final static Integer MAX_RESULTS = 5;

  @AuraEnabled
  public static List<LookupSearchResult> search(
    String searchTerm,
    String objectApiName,
    String iconName
  ) {
    // Prepare results
    List<LookupSearchResult> results = new List<LookupSearchResult>();
    String SearchQUERY =
      'FIND \'' +
      searchTerm +
      '\' IN ALL FIELDS RETURNING ' +
      objectApiName +
      '(Name) LIMIT 5';
    List<List<SObject>> sObjectLists = search.query(SearchQUERY);
    List<SObject> targetList = sObjectLists[0];
    for (SObject obj : targetList) {
      results.add(
        new LookupSearchResult(
          obj.Id,
          objectApiName,
          iconName,
          (String) obj.get('Name'),
          null
        )
      );
    }
    return results;
  }
}
