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
  @api fullCount;
  @api visibleCount;
  @api showBackLink = false;
  @api allowEditModal = false;
  @api reasonForNewModal;

  name;

  @api sortString = "";
  get metaStrings() {
    if (this.sortString) {
      let countString = this.count.includes("+")
        ? `Showing ${this.visibleCount} of ${this.fullCount} item${
            this.count !== 1 ? "s" : ""
          }`
        : "";
      return [countString, this.sortString]
        .filter((s) => !!s)
        .map((str, i, list) => {
          if (i !== list.length - 1) {
            return `${str} • `;
          }
          return str;
        });
    }
    //   return `${
    //     this.count.includes("+")
    //       ? `Showing ${this.visibleCount} of ${this.fullCount} item${
    //           this.count !== 1 ? "s" : ""
    //         } • `
    //       : ""
    //   }${this.sortString}`;

    return [];
  }

  get zeroCount() {
    return this.count === "0" || this.count === 0;
  }

  get showBackButton() {
    return this.showBackLink;
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
