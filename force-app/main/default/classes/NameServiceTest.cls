@isTest
public with sharing class NameServiceTest {
  @IsTest
  static void itFindsName() {
    Account a = new Account(Name = 'An Account');
    insert a;
    String name = NameService.getNameForId(a.Id, 'Account');
    System.assert(name == a.Name);
  }
}
