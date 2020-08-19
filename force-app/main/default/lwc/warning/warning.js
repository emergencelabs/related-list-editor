import { LightningElement, api } from "lwc";

export default class Warning extends LightningElement {
  @api listName;
  @api cantAccess = false;

  get listWarningPreText() {
    if (this.listName) {
      return `The ${this.listName} related list`;
    }
    return "This related list";
  }
}
