@isTest(isParallel=true)
public with sharing class LookupControllerTest {
  @IsTest
  static void itSearches() {
    String accountName = 'Fake Account';
    List<Account> a = new List<Account>{
      createAccount('Account'),
      createAccount('Burlington')
    };

    List<LookupSearchResult> searchResult = LookupController.search(
      'Bur',
      'Account',
      'standard:account'
    );

    // TODO: fix this, why isnt this working?
    System.assert(searchResult.size() == 0);
  }
  private static Account createAccount(String name) {
    Account account = new Account(Name = name);
    insert account;
    return account;
  }
}
