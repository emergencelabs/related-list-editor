import { LightningElement, api, track } from "lwc";
import { NavigationMixin } from "lightning/navigation";

export default class Tile extends NavigationMixin(LightningElement) {
  @api iconName;
  // TODO: make singular child object label
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

  get fields() {
    if (this.record) {
      return this.columns
        .map((c) => ({
          apiName: c.fieldName,
          label: c.label,
          value: this.record[c.fieldName]
        }))
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

  closeModal({ detail }) {
    this.needsConfirmation = false;
  }

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
