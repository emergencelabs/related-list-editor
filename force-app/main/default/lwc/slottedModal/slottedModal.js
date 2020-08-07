import { LightningElement, api } from "lwc";

export default class SlottedModal extends LightningElement {
  @api listLabel;

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
