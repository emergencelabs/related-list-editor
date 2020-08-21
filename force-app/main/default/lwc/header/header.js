import { LightningElement, api } from "lwc";
import { NavigationMixin } from "lightning/navigation";

// TODO: need to get the new modal not to route to the new record!

export default class Header extends NavigationMixin(LightningElement) {
  @api iconName;
  @api listLabel;
  @api childObjectApiName;
  @api objectApiName;
  @api relationshipField;
  @api recordId;
  @api count = "0";

  @api allowEditModal = false;
  @api requireNewModal = false;
  @api reasonForNewModal;

  get disableRefresh() {
    return this.count == 0;
  }

  newRecord() {
    this[NavigationMixin.Navigate]({
      type: "standard__objectPage",
      attributes: {
        objectApiName: this.childObjectApiName,
        actionName: "new"
      },
      state: {
        defaultFieldValues: `${this.relationshipField}=${this.recordId}`,
        nooverride: "1",
        // useRecordTypeCheck: "1",
        navigationLocation: "LOOKUP"
      }
    });
    // this.generateNewRecordPromise().then(() => {
    //   // TODO: seems as if the best we can do is refresh the
    //   // records even if they dont create a new one
    //   // this would have to replace the entire records, resetting the offset
    //   // just as a sort would - which would be kind of annoying if
    //   window.console.log("REFRESH RECORDS HERE");
    // });
  }

  intervalId;
  generateNewRecordPromise() {
    return new Promise((resolve) => {
      this[NavigationMixin.Navigate]({
        type: "standard__objectPage",
        attributes: {
          objectApiName: this.childObjectApiName,
          actionName: "new"
        },
        state: {
          defaultFieldValues: `${this.relationshipField}=${this.recordId}`,
          nooverride: "1",
          // useRecordTypeCheck: "1",
          navigationLocation: "LOOKUP"
        }
      });
      let originalUrl = window.location.href;
      // eslint-disable-next-line @lwc/lwc/no-async-operation
      this.intervalId = window.setInterval(() => {
        if (window.location.href === originalUrl) {
          resolve();
          window.clearInterval(this.intervalId);
        }
      }, 1000);
    });
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

  disconnectedCallback() {
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
    }
  }
}
