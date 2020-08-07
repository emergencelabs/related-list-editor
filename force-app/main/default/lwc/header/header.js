import { LightningElement, api } from "lwc";
import { NavigationMixin } from "lightning/navigation";

// TODO: need to get the new modal not to route to the new record!

export default class Header extends NavigationMixin(LightningElement) {
  @api iconName;
  @api listLabel;
  @api childObjectApiName;
  @api relationshipField;
  @api recordId;
  @api count = "0";

  @api allowEditModal = false;
  @api requireNewModal = false;
  @api reasonForNewModal;

  newRecord() {
    this[NavigationMixin.Navigate]({
      type: "standard__objectPage",
      attributes: {
        objectApiName: this.childObjectApiName,
        actionName: "new"
      },
      state: {
        defaultFieldValues: `${this.relationshipField}=${this.recordId}`,
        nooverride: "1"
      }
    });
  }

  displayEditModal() {
    this.dispatchEvent(new CustomEvent("displaymodal"));
  }
}
