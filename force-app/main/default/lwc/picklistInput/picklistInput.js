import { LightningElement, api, wire, track } from "lwc";
import { getPicklistValues } from "lightning/uiObjectInfoApi";

export default class PicklistInput extends LightningElement {
  @api value;
  @api fieldApiName;
  @api recordTypeId;
  @api objectApiName;

  @track options = [];

  @track originalValue;

  get fieldInfo() {
    if (this.fieldApiName && this.objectApiName) {
      return {
        fieldApiName: this.fieldApiName,
        objectApiName: this.objectApiName
      };
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
      this.options = values;
    }
  }

  handleChange({ detail: { value } }) {
    this.dispatchEvent(
      new CustomEvent("selection", { detail: { value, isPicklist: true } })
    );
  }

  @api reset() {
    this.template.querySelector(
      "lightning-combobox"
    ).value = this.originalValue;
  }
  @api updateOriginalValue(value) {
    this.originalValue = value;
  }

  connectedCallback() {
    this.originalValue = this.value;
  }
}
