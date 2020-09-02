import { LightningElement, api } from "lwc";
import getNameForId from "@salesforce/apex/NameService.getNameForId";
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

  name;

  get showBackButton() {
    return !this.allowEditModal && this.recordId;
  }

  newRecord() {
    this.dispatchEvent(new CustomEvent("requestnew"));
  }

  refreshRecords() {
    this.dispatchEvent(new CustomEvent("refreshrecords"));
  }

  displayEditModal() {
    this.dispatchEvent(new CustomEvent("displaymodal"));
  }

  back(e) {
    e.preventDefault();
    this[NavigationMixin.Navigate]({
      type: "standard__recordPage",
      attributes: {
        recordId: this.recordId,
        actionName: "view"
      }
    });
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

  getName() {
    return getNameForId({
      recordId: this.recordId,
      objectApiName: this.objectApiName
    });
  }

  async connectedCallback() {
    if (this.showBackButton) {
      try {
        this.name = await this.getName();
      } catch (e) {
        console.error(e);
        this.name = this.objectApiName;
      }
    }
  }
}
