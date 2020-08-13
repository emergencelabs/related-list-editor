import { LightningElement, api, track } from "lwc";
import { NavigationMixin } from "lightning/navigation";

export default class Tile extends NavigationMixin(LightningElement) {
  @api iconName;
  @api childObjectLabel;
  @api record;
  @api columns;

  @track needsConfirmation = false;

  get nameField() {
    return this.columns.map((c) => c.fieldDetail).find((q) => q.nameField)
      .apiName;
  }

  get recordName() {
    return this.record[this.nameField];
  }

  // TODO: sort out the deal with reference fields here - will it always be Name???
  get fields() {
    if (this.record) {
      return this.columns
        .map((c) => {
          let isReference = !!c.fieldDetail.relationshipName;
          let referenceValue = isReference
            ? this.record[c.fieldDetail.relationshipName]
            : null;
          let value = this.record[c.fieldName];
          if (referenceValue) {
            value = referenceValue.Name;
          } else if (isReference && !referenceValue) {
            value = "";
          }
          return {
            apiName: c.fieldName,
            label: c.label,
            dataType: c.fieldDetail.dataType,
            value,
            link: referenceValue
              ? `/lightning/r/${referenceValue.Id}/view`
              : null,
            htmlFormatted: c.fieldDetail.htmlFormatted
          };
        })
        .filter((f) => f.apiName !== this.nameField);
    }
    return [];
  }

  get childRecordUrl() {
    if (this.record) {
      return `/lightning/r/${this.record.Id}/view`;
    }
    return "#";
  }

  actions = [
    { label: "Edit", value: "edit", iconName: "utility:edit" },
    { label: "Delete", value: "delete", iconName: "utility:delete" }
  ];

  get confirmationModalTitle() {
    return `Delete ${this.childObjectLabel}`;
  }

  closeModal({ detail: { isSave } }) {
    if (isSave) {
      this.dispatchEvent(
        new CustomEvent("requestdelete", {
          detail: { childObject: this.record }
        })
      );
    }
    this.needsConfirmation = false;
  }

  // TODO: potentially need to do the same interval url check
  // for wrapping a promise here so that can refresh records on edit
  handleAction(event) {
    // Get the value of the selected action
    const tileAction = event.detail.action.value;
    if (tileAction === "edit") {
      this.edit();
      return;
    }
    if (tileAction === "delete") {
      this.needsConfirmation = true;
      return;
    }
  }

  edit() {
    this[NavigationMixin.Navigate]({
      type: "standard__recordPage",
      attributes: {
        recordId: this.record.Id,
        actionName: "edit"
      }
    });
  }
}
