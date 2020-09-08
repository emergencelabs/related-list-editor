import { LightningElement, api } from "lwc";
import getPod from "@salesforce/apex/PodService.getPod";

export default class ErrorBoundary extends LightningElement {
  @api flexipageRegionWidth;
  @api recordId;
  @api objectApiName;
  @api listSelection;

  @api isStandalone = false;

  errorHandler(event) {
    window.console.error(JSON.stringify(event.detail));
  }

  error;
  stack;
  errorCallback(error, stack) {
    window.console.error(error);
    if (error) this.error = error;
    if (stack) this.stack = stack;
  }

  reload() {
    window.location.reload();
  }

  reloadComponent() {
    this.error = null;
    this.stack = null;
  }
  _pod;
  get pod() {
    if (this._pod) {
      return this._pod;
    }
    return null;
  }
  async connectedCallback() {
    this._pod = await getPod();
  }
}
