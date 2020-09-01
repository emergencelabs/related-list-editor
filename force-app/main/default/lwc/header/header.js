import { LightningElement, api } from "lwc";
import { NavigationMixin } from "lightning/navigation";

export default class Header extends NavigationMixin(LightningElement) {
  @api iconName;
  @api listLabel;
  @api childObjectApiName;
  @api objectApiName;
  @api relationshipField;
  @api recordId;
  @api count = "0";

  @api allowEditModal = false;
  @api reasonForNewModal;

  newRecord() {
    this.dispatchEvent(new CustomEvent("requestnew"));
  }

  refreshRecords() {
    this.dispatchEvent(new CustomEvent("refreshrecords"));
  }

  displayEditModal() {
    this.dispatchEvent(new CustomEvent("displaymodal"));
  }

  viewAll(event) {
    event.preventDefault();
    this[NavigationMixin.Navigate]({
      type: "standard__component",
      attributes: {
        componentName: "rle__RelatedListEditor"
      },
      state: {
        c__recordId: this.recordId,
        c__childObject: this.childObjectApiName,
        c__parentObject: this.objectApiName,
        c__relationshipField: this.relationshipField
      }
    });
  }
}
