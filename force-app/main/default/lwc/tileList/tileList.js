import { LightningElement, api } from "lwc";
import { NavigationMixin } from "lightning/navigation";

export default class TileList extends NavigationMixin(LightningElement) {
  @api iconName;
  @api records = [];

  @api isStandalone;
  @api canRequestMore;
  @api layoutModeLimit;
  @api childObjectLabel;
  @api childObjectApiName;
  @api objectApiName;
  @api relationshipField;
  @api columns;
  @api recordId;

  offset = 0;

  get showViewMoreButton() {
    return (this.isStandalone && this.canRequestMore) || !this.isStandalone;
  }

  get ViewMoreButtonLabel() {
    if (this.isStandalone) return "View More";
    return "View All";
  }

  requestDelete({ detail: { childObject } }) {
    this.dispatchEvent(
      new CustomEvent("requestdelete", {
        detail: { childObject }
      })
    );
  }

  viewAll() {
    if (this.isStandalone) {
      this.offset += this.layoutModeLimit;
      this.dispatchEvent(
        new CustomEvent("viewmore", { detail: { offset: this.offset } })
      );
    } else {
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
}
