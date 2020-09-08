public with sharing class PodService {
  @AuraEnabled
  public static string getPod() {
    return [SELECT InstanceName FROM Organization].InstanceName.toLowerCase();
  }
}
