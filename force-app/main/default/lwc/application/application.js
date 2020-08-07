import { LightningElement, api, track, wire } from "lwc";
import FORM_FACTOR from "@salesforce/client/formFactor";
import { getObjectInfo } from "lightning/uiObjectInfoApi";
import getRecordTypeId from "@salesforce/apex/RecordTypeService.getRecordTypeId";

export default class Application extends LightningElement {
  @api flexipageRegionWidth;
  @api recordId;
  @api objectApiName;

  @api listSelection;
  @api isStandalone = false;

  @track loading = true;

  @track recordTypeId;

  @track relatedListInfo;

  get childObjectName() {
    if (this.parsedListDetails) {
      return this.parsedListDetails.childObject;
    }
    return null;
  }

  @wire(getObjectInfo, { objectApiName: "$childObjectName" })
  childObjectInfo;

  get canRenderEditor() {
    return this.relatedListInfo && this.childObjectInfo.data;
  }

  get layoutMode() {
    if (FORM_FACTOR === "Medium" || FORM_FACTOR === "Small") {
      if (this.isStandalone) {
        return 1;
      }
      return 0;
    } else if (
      FORM_FACTOR === "Large" &&
      this.flexipageRegionWidth === "SMALL"
    ) {
      return 2;
    }
    return 3;
  }

  get parsedListDetails() {
    if (this.listSelection) {
      if (typeof this.listSelection === "string") {
        return JSON.parse(this.listSelection);
      }
      if (typeof this.listSelection === "object") {
        return this.listSelection;
      }
    }
    return null;
  }

  get listNameText() {
    if (
      this.parsedListDetails &&
      this.parsedListDetails.childObjectPluralLabel
    ) {
      return this.parsedListDetails.childObjectPluralLabel;
    } else if (this.parsedListDetails && this.parsedListDetails.childObject) {
      return this.parsedListDetails.childObject;
    }
    return null;
  }

  get allowApiRequest() {
    return this.objectApiName && this.parsedListDetails && this.recordTypeId;
  }

  get urlBase() {
    let url = window.location.origin;
    return url.substring(0, url.indexOf("."));
  }
  get vfPageUrl() {
    if (this.objectApiName && this.recordTypeId) {
      return `${this.urlBase}--rle.visualforce.com/apex/ApiCallEmbed?v=49.0&n=${
        this.objectApiName
      }&r=${this.recordTypeId}&u=${encodeURIComponent(window.location.origin)}`;
    }
    return null;
  }

  async findRecordTypeId() {
    let id = await getRecordTypeId({
      objectApiName: this.objectApiName,
      recordId: this.recordId
    });
    if (id) {
      return id;
    }

    // this sucks as it wont be caught by any errorCallback's so will
    // need to probably put some additional event bubbling in that
    // the error boundary will catch?
    throw new Error("Unable to find Record Type Id");
  }

  async connectedCallback() {
    window.console.log(this.objectApiName, this.recordId);

    this.recordTypeId = await this.findRecordTypeId();
    window.addEventListener("message", ({ origin, data }) => {
      if (
        origin === `${this.urlBase}--rle.visualforce.com` &&
        this.listSelection
      ) {
        let apiResponse = JSON.parse(data);
        this.relatedListInfo = apiResponse.relatedLists.find(
          (rli) =>
            rli.sobject === this.parsedListDetails.childObject &&
            rli.field === this.parsedListDetails.relationshipField
        );
        this.loading = false;
      }
    });
  }
}
