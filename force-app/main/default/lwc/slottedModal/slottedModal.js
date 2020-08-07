import { LightningElement, api } from "lwc";

export default class SlottedModal extends LightningElement {
  @api modalTitle;
  @api saveButtonLabel = "Save";
  @api saveButtonVariant = "brand";
  @api size = "large";

  get modalSizingClasses() {
    return `slds-modal slds-fade-in-open slds-modal_${this.size}`;
  }

  cancel() {
    this.close(false);
  }
  save() {
    this.close(true);
  }

  close(isSave) {
    this.dispatchEvent(new CustomEvent("close", { detail: { isSave } }));
  }
}
