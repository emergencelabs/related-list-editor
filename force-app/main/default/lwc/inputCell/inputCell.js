import { LightningElement, api, track } from "lwc";

export default class InputCell extends LightningElement {
  @api value;

  @api type;
  @api fieldDetail;
  @api rowId;
  @api referenceValue;
  @api objectApiName;
  @api recordTypeId;
  @api defaultEdit = false;

  @track editing = false;
  @track isHovering = false;
  //  slds-grid needs to be added but only when cell is editing
  @track containerClasses = "slds-cell-edit";

  // 3 = NotSupported, 2 = Modal, 1 = Field,  0 = editable
  get disableInputReason() {
    if (this.fieldDetail.updateable) {
      //check type details for if is not supported or is modal edit
      return 0;
    }
    return 1;
  }

  get accessIconName() {
    return this.disableInputReason >= 1 ? "utility:lock" : "utility:edit";
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
    this.editing = this.defaultEdit;

    this.addEventListener("mouseenter", () => {
      this.isHovering = true;
    });
    this.addEventListener("mouseleave", () => {
      this.isHovering = false;
    });
  }
}
