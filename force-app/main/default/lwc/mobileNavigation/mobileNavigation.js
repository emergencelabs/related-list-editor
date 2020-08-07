import { LightningElement, api } from "lwc";
import { NavigationMixin } from "lightning/navigation";

export default class MobileNavigation extends LightningElement {
  @api listName;
  @api count = 0;
  @api iconName = "standard:default";

  @api objectApiName;
  @api childObjectApiName;
  @api relationshipField;
  @api recordId;

  viewAll() {
    this[NavigationMixin.Navigate]({
      type: "standard__component",
      attributes: {
        componentName: "REPLACE_ME"
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
