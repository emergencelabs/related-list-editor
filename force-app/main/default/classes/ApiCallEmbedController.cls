public with sharing class ApiCallEmbedController {
  public String pageLayoutDescribeResponse { get; set; }
  public String targetOrigin { get; set; }
  public String objectApiName { get; set; }
  public ApiCallEmbedController() {
    PageReference currentPage = ApexPages.currentPage();
    Map<String, String> parameters = currentPage.getParameters();
    this.targetOrigin = EncodingUtil.urlDecode(parameters.get('u'), 'UTF-8');
    String apiVersion = parameters.get('v') == null
      ? '49.0'
      : parameters.get('v');
    String parentObjectApiName = parameters.get('n');
    this.objectApiName = parentObjectApiName;
    String recordTypeId = parameters.get('r');
    String restAPIURL =
      System.Url.getOrgDomainUrl().toExternalForm() +
      '/services/data/v' +
      apiVersion +
      '/sobjects/' +
      parentObjectApiName +
      '/describe/layouts/' +
      recordTypeId;

    HttpRequest httpRequest = new HttpRequest();
    httpRequest.setMethod('GET');
    httpRequest.setHeader(
      'Authorization',
      'Bearer ' + System.UserInfo.getSessionId()
    );
    httpRequest.setEndpoint(restAPIURL);
    String response = '';
    try {
      Http http = new Http();
      HttpResponse httpResponse = http.send(httpRequest);
      if (httpResponse.getStatusCode() == 200) {
        response = JSON.serializePretty(
          JSON.deserializeUntyped(httpResponse.getBody())
        );
        this.pageLayoutDescribeResponse = response;
      } else {
        this.pageLayoutDescribeResponse = httpResponse.getBody();
      }
    } catch (System.Exception e) {
      this.pageLayoutDescribeResponse = '{' + '"error":' + e.getMessage() + '}';
    }
  }
}
