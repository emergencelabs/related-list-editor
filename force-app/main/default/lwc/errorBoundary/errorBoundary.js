import { LightningElement, api } from "lwc";

export default class ErrorBoundary extends LightningElement {
  @api flexipageRegionWidth;
  @api recordId;
  @api objectApiName;
  @api listSelection;

  @api isStandalone = false;

  errorHandler(event) {
    window.console.error(JSON.stringify(event.data));
  }

  error;
  stack;
  errorCallback(error, stack) {
    window.console.error("caught???");
    if (error) this.error = error;
    if (stack) this.stack = stack;
  }
}
