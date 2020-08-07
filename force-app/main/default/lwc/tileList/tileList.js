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

  // TODO: this will need to double as a 'View More' when in the standalone
  // view and will have to get additional records in the same fashion that the
  // data table will
  viewAll() {
    if (this.isStandalone) {
      this.dispatchEvent(
        new CustomEvent("viewmore", { detail: { offset: 10 } })
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
