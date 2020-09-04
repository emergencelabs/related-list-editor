public with sharing class NameFieldService {
  @AuraEnabled
  public static string getNameField(String objectName) {
    Schema.SObjectType type = Schema.getGlobalDescribe().get(objectName);
    Schema.DescribeSObjectResult childDescribe = type.getDescribe();
    for (
        Schema.SObjectField childField : childDescribe.fields.getMap()
        .values()
    ) {
        Schema.DescribeFieldResult fieldDescribe = childField.getDescribe();
      if (fieldDescribe.isNameField()) {
        return fieldDescribe.getName();
      }
    }
    return null;
  }
}
