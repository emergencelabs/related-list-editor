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

  // TODO: this will be false if the user has no access to the child object
  get canRenderEditor() {
    return this.relatedListInfo && this.childObjectInfo.data;
  }

  get hasChildObjectError() {
    if (this.childObjectInfo.error) {
      window.console.error(this.childObjectInfo.error);
    }
    return !!this.childObjectInfo.error;
  }
  get childObjectErrorCode() {
    if (this.childObjectInfo && this.childObjectInfo.error) {
      return this.childObjectInfo.error.body.errorCode;
    }
    return null;
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

  // Ensure that `javascript:` cannot be injected into the iframe src
  get vfPageUrl() {
    if (
      this.objectApiName &&
      this.recordTypeId &&
      !this.objectApiName.includes("javascript") &&
      !this.recordTypeId.includes("javascript")
    ) {
      return `${this.urlBase}--rle.visualforce.com/apex/ApiCallEmbed?v=49.0&n=${this.objectApiName}&r=${this.recordTypeId}`;
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

    this.dispatchEvent(
      new CustomEvent("rleerror", {
        detail: {
          message: "Unable to find a Record Type Id for this record."
        }
      })
    );
    return null;
  }

  disconnectedCallback() {
    window.removeEventListener("message", this.listener);
  }
  listener;

  setIFrameConnection() {
    let iframe = this.template.querySelector("iframe");
    iframe.contentWindow.postMessage(
      true,
      `${this.urlBase}--rle.visualforce.com`
    );
  }

  async connectedCallback() {
    this.listener = ({ origin, data: apiResponse = {} }) => {
      console.log(origin);
      if (
        (origin === `${this.urlBase}--rle.visualforce.com` ||
          origin.includes(`${this.urlBase}--rle`)) &&
        this.listSelection
      ) {
        if (apiResponse.object === this.objectApiName) {
          console.log("inside origin check");
          this.relatedListInfo = apiResponse.data.relatedLists.find(
            (rli) =>
              rli.sobject === this.parsedListDetails.childObject &&
              rli.field === this.parsedListDetails.relationshipField
          );

          this.loading = false;
        }
      }
    };
    window.addEventListener("message", this.listener);
    this.recordTypeId = await this.findRecordTypeId();
  }
}
