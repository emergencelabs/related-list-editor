import { LightningElement, api, track } from "lwc";

export default class TableControls extends LightningElement {
  @api blockSave = false;
  @api hasErrors = false;
  @api noScroll = false;
  @api errorMessage;

  @track showingPopover = false;

  togglePopover = () => {
    this.showingPopover = !this.showingPopover;
  };

  get style() {
    if (this.noScroll) {
      return "margin-top: 55px;padding-bottom: 20px;";
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
