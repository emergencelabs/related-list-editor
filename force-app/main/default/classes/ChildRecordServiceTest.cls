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
    Contact c = new Contact(
      AccountId = a.Id,
      FirstName = 'Myles',
      LastName = 'Linder'
    );
    insert c;
    List<SObject> contacts = ChildRecordService.getChildRecords(
      new List<String>{ 'FirstName' },
      'Contact',
      'AccountId',
      a.Id,
      'ORDER BY NAME ASC NULLS LAST',
      'LIMIT 10',
      'OFFSET 0'
    );
    System.assert(contacts.get(0).get('FirstName') == c.FirstName);
  }

  @IsTest
  static void itGetsRecordCount() {
    String accountName = 'Fake Account';
    Account a = new Account(Name = accountName);
    insert a;
    Contact c = new Contact(
      AccountId = a.Id,
      FirstName = 'Myles',
      LastName = 'Linder'
    );
    insert c;
    Integer count = ChildRecordService.getCount('Contact', 'AccountId', a.Id);
    System.assert(count == 1);
  }

  @IsTest
  static void itDeletesRecords() {
    String accountName = 'Fake Account';
    Account a = new Account(Name = accountName);
    insert a;
    Contact c = new Contact(
      AccountId = a.Id,
      FirstName = 'Myles',
      LastName = 'Linder'
    );
    insert c;
    ChildRecordService.deleteChildRecord(c);
    List<sObject> contacts = ChildRecordService.getChildRecords(
      new List<String>{ 'Name' },
      'Contact',
      'AccountId',
      c.Id,
      'ORDER BY NAME ASC NULLS LAST',
      'LIMIT 10',
      'OFFSET 0'
    );

    System.assert(contacts.size() == 0);
  }

  @IsTest
  static void itUpdatesRecordsFullSuccess() {
    String accountName = 'Fake Account';
    Account a = new Account(Name = accountName);
    insert a;
    a.Name = 'New Name';
    Map<Id, Map<String, String>> errorMap = ChildRecordService.updateChildRecords(
      new List<SObject>{ a },
      new List<String>{ 'Name' }
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
      new List<SObject>{ a },
      new List<String>{ 'Name' }
    );
    System.assert(errorMap.keySet().size() > 0);
  }
}
