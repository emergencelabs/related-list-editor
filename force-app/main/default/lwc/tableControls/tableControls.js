import { LightningElement, api } from "lwc";

export default class TableControls extends LightningElement {
  @api blockSave = false;
  @api hasErrors = false;
  @api noScroll = false;

  get style() {
    if (this.noScroll) {
      return "margin-top: 30px;padding-bottom: 20px;";
    }
    return "";
  }

  cancel() {
    this.close(false);
  }
  save() {
    this.close(true);
  }

  close(isSave) {
    this.dispatchEvent(new CustomEvent("commit", { detail: { isSave } }));
  }
}
