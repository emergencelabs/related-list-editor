@isTest
public with sharing class ChildRecordServiceTest {
  @IsTest
  static void itGetsRecords() {
    // Test.startTest();
    // System.runAs(contextuser) {
    // }
    // Test.stopTest();
    String accountName = 'Fake Account';
    Account a = new Account(Name = accountName);
    insert a;
    List<sObject> accounts = ChildRecordService.getChildRecords(
      'SELECT Id, Name FROM Account'
    );
    System.assert(accounts.get(0).get('Name') == accountName);
  }

  @IsTest
  static void itGetsRecordCount() {
    String accountName = 'Fake Account';
    Account a = new Account(Name = accountName);
    insert a;
    Integer count = ChildRecordService.getCount('SELECT COUNT() FROM Account');
    System.assert(count == 1);
  }

  @IsTest
  static void itDeletesRecords() {
    String accountName = 'Fake Account';
    Account a = new Account(Name = accountName);
    insert a;
    ChildRecordService.deleteChildRecord(a);
    List<sObject> accounts = ChildRecordService.getChildRecords(
      'SELECT Id, Name FROM Account'
    );
    System.assert(accounts.size() == 0);
  }

  @IsTest
  static void itUpdatesRecordsFullSuccess() {
    String accountName = 'Fake Account';
    Account a = new Account(Name = accountName);
    insert a;
    a.Name = 'New Name';
    Map<Id, Map<String, String>> errorMap = ChildRecordService.updateChildRecords(
      new List<SObject>{ a }
    );
    System.assert(errorMap.keySet().size() == 0);
  }
  @IsTest
  static void itUpdatesRecordsNoSuccess() {
    String accountName = 'Fake Account';
    Account a = new Account(Name = accountName);
    insert a;
    a.Name = null;
    Map<Id, Map<String, String>> errorMap = ChildRecordService.updateChildRecords(
      new List<SObject>{ a }
    );
    System.assert(errorMap.keySet().size() > 0);
  }
}
