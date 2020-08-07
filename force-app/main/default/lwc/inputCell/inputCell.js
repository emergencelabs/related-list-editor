import { LightningElement, api, track } from "lwc";

export default class InputCell extends LightningElement {
  @api value;

  @api type;
  @api fieldDetail;
  @api rowId;
  @api referenceValue;
  @api objectApiName;
  @api recordTypeId;
  @api isModal = false;

  @track editing = false;
  @track isHovering = false;
  //  slds-grid needs to be added but only when cell is editing
  @track containerClasses = "slds-cell-edit";

  get accessIconName() {
    return true ? "utility:lock" : "utility:edit";
  }

  get isReference() {
    return !!this.fieldDetail.relationshipName;
  }

  get isNameField() {
    return this.fieldDetail.nameField;
  }
  get nameLink() {
    return `/lightning/r/${this.rowId}/view`;
  }

  get link() {
    return this.referenceValue
      ? `/lightning/r/${this.referenceValue.Id}/view`
      : null;
  }

  connectedCallback() {
    this.addEventListener("mouseenter", () => {
      this.isHovering = true;
    });
    this.addEventListener("mouseleave", () => {
      this.isHovering = false;
    });
  }
}
