public with sharing class ApiCallEmbedController {
  public String pageLayoutDescribeResponse { get; set; }
  public String targetOrigin { get; set; }
  public String objectApiName { get; set; }
  public Boolean readyToSend { get; set; }
  public ApiCallEmbedController() {
    this.readyToSend = false;
    String url = System.URL.getOrgDomainUrl().toExternalForm();
    this.targetOrigin =
      url.substring(0, url.indexOf('.') + 1) + 'lightning.force.com';
    this.getRelatedListDetails();
  }

  public void setReady() {
    this.readyToSend = true;
  }

  public void getRelatedListDetails() {
    PageReference currentPage = ApexPages.currentPage();
    Map<String, String> parameters = currentPage.getParameters();
    String apiVersion = parameters.get('v') == null
      ? '49.0'
      : parameters.get('v');
    String parentObjectApiName = parameters.get('n').escapeHtml4();
    this.objectApiName = parentObjectApiName;
    String recordTypeId = parameters.get('r').escapeHtml4();
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
