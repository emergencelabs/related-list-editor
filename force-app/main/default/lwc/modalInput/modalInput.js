import { LightningElement, api, wire, track } from "lwc";
import { getPicklistValues } from "lightning/uiObjectInfoApi";
import multipicklist from "./multipicklist.html";
import textarea from "./textarea.html";

export default class ModalInput extends LightningElement {
  @api type;
  @api value;
  @api label;
  @api fieldApiName;
  @api recordTypeId;
  @api objectApiName;

  @api maxLength;
  @api required;
  @api isRichText = false;

  @track details = {};
  @track loading = false;

  get richTextValidity() {
    let el = this.template.querySelector("lightning-input-rich-text");
    if (el) {
      return el.value.length > this.maxLength;
    }
    return true;
  }

  get fieldInfo() {
    if (
      this.fieldApiName &&
      this.objectApiName &&
      this.type === "multipicklist"
    ) {
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
    } else if (this.type === "textarea") {
      return this.isRichText
        ? this.template.querySelector("lightning-input-rich-text").value
        : this.template.querySelector("lightning-textarea").value;
    }
    return null;
  }

  @api checkValidity() {
    if (this.type === "textarea") {
      if (this.isRichText) {
        return true;
      }
      return this.template.querySelector("lightning-textarea").checkValidity();
    }
    return true;
  }

  // TODO: dispatch error if something goes wrong here
  @wire(getPicklistValues, {
    recordTypeId: "$recordTypeId",
    fieldApiName: "$fieldInfo"
  })
  picklistValues({ data, error }) {
    this.loading = true;
    if (error) {
      window.console.error(error);
    } else if (data) {
      let { values } = data;
      window.console.log(values);
      this.details.options = values;
    }
    this.loading = false;
  }

  render() {
    switch (this.type) {
      case "multipicklist": {
        return multipicklist;
      }

      case "textarea": {
        return textarea;
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
