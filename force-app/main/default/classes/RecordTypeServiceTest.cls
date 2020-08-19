@isTest
public with sharing class RecordTypeServiceTest {
  @IsTest
  static void itReturnsDefaultRecordTypeSingular() {
    Account account = new Account(Name = 'Fakitty Fake');
    insert account;
    String rtId = RecordTypeService.getRecordTypeId('Account', account.Id);
    System.assert(rtId == '012000000000000AAA');
  }
  @IsTest
  static void itReturnsDefaultRecordTypePlural() {
    Account account = new Account(Name = 'Fakitty Fake');
    insert account;
    Map<String, String> rtIds = RecordTypeService.getRecordTypeIdForList(
      'Account',
      new List<Id>{ account.Id }
    );
    System.assert(rtIds.get('Default') == '012000000000000AAA');
  }
}
