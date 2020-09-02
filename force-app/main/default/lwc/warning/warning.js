import { LightningElement, api } from "lwc";

export default class Warning extends LightningElement {
  @api listName;
  @api hasError = false;
  @api errorCode;

  get listWarningPreText() {
    if (this.listName) {
      return `The ${this.listName} related list`;
    }
    return "This related list";
  }

  get errorText() {
    if (this.errorCode === "INVALID_TYPE") return `is not supported.`;
    return `is not accessible to the current User. Please
    consult your System Administrator.`;
  }
}
