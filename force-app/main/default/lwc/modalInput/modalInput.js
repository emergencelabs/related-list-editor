import { LightningElement, api, wire, track } from "lwc";
import { getPicklistValues } from "lightning/uiObjectInfoApi";
import multipicklist from "./multipicklist.html";
// import textarea from "./textarea.html";

export default class ModalInput extends LightningElement {
  @api type;
  @api value;
  @api label;
  @api fieldApiName;
  @api recordTypeId;
  @api objectApiName;

  @track details = {};

  get fieldInfo() {
    if (this.fieldApiName && this.objectApiName) {
      return {
        fieldApiName: this.fieldApiName,
        objectApiName: this.objectApiName
      };
    }
    return null;
  }

  @api getValue() {
    if (this.type === "multipicklist") {
      return this.template
        .querySelector("lightning-dual-listbox")
        .value.join(";");
    }
    return null;
  }

  // TODO: dispatch error if something goes wrong here
  @wire(getPicklistValues, {
    recordTypeId: "$recordTypeId",
    fieldApiName: "$fieldInfo"
  })
  picklistValues({ data, error }) {
    if (error) {
      window.console.error(error);
    } else if (data) {
      let { values } = data;
      window.console.log(values);
      this.details.options = values;
    }
  }

  render() {
    switch (this.type) {
      case "multipicklist": {
        return multipicklist;
      }

      case "textarea": {
        return null;
      }
      default:
        return null;
    }
  }

  connectedCallback() {
    if (this.type === "multipicklist") {
      this.details.values = this.value ? this.value.split(";") : [];
    }
  }
}
