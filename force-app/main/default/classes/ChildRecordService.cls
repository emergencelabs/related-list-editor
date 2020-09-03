public with sharing class ChildRecordService {
  // FLS is checked on the client side using the @wire getObjectInfo
  // WITH_SECURITY_ENFORCED is intentionally not used as it will throw a Query Exception if any of the fields are
  // inacessible and we want the user to be able to work with what fields are available as opposed to nothing
  @AuraEnabled
  public static List<SObject> getChildRecords(
    List<String> fields,
    String childObjectApiName,
    String relationshipField,
    String recordId,
    String sortString,
    String limitString,
    String offsetString
  ) {
    String safeObjectApiName = String.escapeSingleQuotes(childObjectApiName);
    Schema.SObjectType type = Schema.getGlobalDescribe().get(safeObjectApiName);
    Schema.DescribeSObjectResult childDescribe = type.getDescribe();
    Boolean canAccess = childDescribe.isAccessible();
    if (canAccess) {
      String fieldString = '';
      for (Integer i = 0; i < fields.size(); i++) {
        String field = fields.get(i);
        System.debug(field);
        Integer dotIndex = field.indexOf('.');
        if (dotIndex >= 0) {
          // dont include fields that walk two objects
          if (field.indexOf('.', dotIndex + 1) >= 0) {
            continue;
          }
          //check user access on object for lookup
          String lookupObject = field.substring(0, dotIndex);
          if (lookupObject == 'Owner') {
            lookupObject = 'User';
          }
          Schema.SObjectType lookupType = Schema.getGlobalDescribe()
            .get(lookupObject);

          Schema.DescribeSObjectResult lookupDescribe = lookupType.getDescribe();
          if (lookupDescribe.isAccessible()) {
            //check user access on field for object
            String lookupFieldName = field.substring(dotIndex + 1);
            System.debug(lookupFieldName);
            Schema.DescribeFieldResult lookupFieldDescribe = lookupDescribe.fields.getMap()
              .get(lookupFieldName)
              .getDescribe();
            if (
              lookupFieldDescribe.isAccessible() &&
              !lookupFieldDescribe.isEncrypted()
            ) {
              fieldString += field;
              fieldString += ', ';
            }
          }
        } else {
          Schema.DescribeFieldResult fieldDescribe = childDescribe.fields.getMap()
            .get(field)
            .getDescribe();
          //check that field isAccessible to user
          //check that field is not encrypted
          if (fieldDescribe.isAccessible() && !fieldDescribe.isEncrypted()) {
            fieldString += field;
            fieldString += ', ';
          }
        }
      }
      System.debug(fieldString);
      return Database.query(
        'SELECT Id, ' +
        fieldString.substring(0, fieldString.length() - 2) +
        ' FROM ' +
        safeObjectApiName +
        ' WHERE ' +
        String.escapeSingleQuotes(relationshipField) +
        ' = \'' +
        String.escapeSingleQuotes(recordId) +
        '\' ' +
        String.escapeSingleQuotes(sortString) +
        ' ' +
        String.escapeSingleQuotes(limitString) +
        ' ' +
        String.escapeSingleQuotes(offsetString)
      );
    } else {
      return new List<SObject>();
    }
  }

  @AuraEnabled
  public static Integer getCount(
    String objectApiName,
    String relationshipField,
    String recordId
  ) {
    String safeObjectApiName = String.escapeSingleQuotes(objectApiName);
    Schema.SObjectType type = Schema.getGlobalDescribe().get(safeObjectApiName);
    Boolean canAccess = type.getDescribe().isAccessible();
    if (canAccess) {
      String sanitizedQueryString =
        'SELECT COUNT() FROM ' +
        safeObjectApiName +
        ' WHERE ' +
        String.escapeSingleQuotes(relationshipField) +
        ' = \'' +
        String.escapeSingleQuotes(recordId) +
        '\'';
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
