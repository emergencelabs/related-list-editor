public with sharing class IconService {
  @AuraEnabled
  public static List<TabDefinition> getIconURL(String objectName) {
    // So if a child object for a related list has no tab then SF uses the parent objects icon
    return [
      SELECT
        (SELECT ContentType, Url FROM Icons WHERE ContentType LIKE 'image/svg%')
      FROM TabDefinition
      WHERE SobjectName = :objectName
    ];
  }
}
