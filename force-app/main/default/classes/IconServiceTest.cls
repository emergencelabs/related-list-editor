@isTest
public with sharing class IconServiceTest {
  @IsTest
  static void itFindsIcons() {
    List<TabDefinition> tabs = IconService.getIconURL('Account');
    System.assert(tabs.size() > 0);
  }
}
