import { LightningElement, api } from "lwc";
import { NavigationMixin } from "lightning/navigation";

export default class TileList extends NavigationMixin(LightningElement) {
  @api iconName;
  @api records = [];

  @api isStandalone;
  @api canRequestMore;
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
    window.console.log("tile list delete");
    this.dispatchEvent(
      new CustomEvent("requestdelete", {
        detail: { childObject }
      })
    );
  }

  // TODO: need to know what the previous offset value was so that it can be continually
  // incremented
  // using a 0 start and continual increment by 10 is okay i guess
  viewAll() {
    if (!this.isStandalone) {
      this.offset += 10;
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
