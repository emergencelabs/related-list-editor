@isTest
public with sharing class ApiCallEmbedControllerTest {
  @IsTest
  static void itHitsTheApi() {
    ApexPages.currentPage()
      .getParameters()
      .put('u', EncodingUtil.urlEncode('https://google.com', 'UTF-8'));
    ApexPages.currentPage().getParameters().put('n', 'Account');
    ApexPages.currentPage().getParameters().put('r', '012000000000000AAA');

    ApiCallEmbedController controller = new ApiCallEmbedController();
    System.assert(controller.objectApiName == 'Account');
  }
}
