import { LightningElement, api, track } from "lwc";
//import { baseNavigation } from "lightning/datatableKeyboardMixins";

export default class InputCell extends LightningElement {
  @api value;

  @api type;
  @api fieldDetail;
  @api rowId;
  @api referenceValue;
  @api objectApiName;
  @api recordTypeId;
  @api defaultEdit = false;

  @track editing = false;
  @track isHovering = false;
  //  slds-grid needs to be added but only when cell is editing
  @track containerClasses = "slds-cell-edit";

  // should this be a getter? i think it makes most sense
  // to have it like this so that it gets set on connected and then never changes
  // a getter will likely be re-evaluated too frequently?s
  @track originalValue;
  @track inputDetails;

  get isBlank() {
    return this.value === undefined;
  }

  // 3 = NotSupported, 2 = Modal, 1 = Field,  0 = editable
  get disableInputReason() {
    if (this.fieldDetail.updateable) {
      //check type details for if is not supported or is modal edit
      return 0;
    }
    return 1;
  }

  get disableInput() {
    return this.disableInputReason >= 1;
  }

  // TODO: consider set to be modal icon for modal type cells
  get accessIconName() {
    return this.disableInputReason >= 1 ? "utility:lock" : "utility:edit";
  }

  get isReference() {
    return !!this.fieldDetail.relationshipName;
  }

  get isRequired() {
    if (this.fieldDetail.dataType === "Boolean") {
      return false;
    }
    return this.fieldDetail.required;
  }

  get isNameField() {
    return this.fieldDetail.nameField;
  }
  get nameLink() {
    return `/lightning/r/${this.rowId}/view`;
  }

  get link() {
    return this.referenceValue
      ? `/lightning/r/${this.referenceValue.Id}/view`
      : null;
  }

  get isBaseInput() {
    return this.inputDetails && this.inputDetails.component === "input";
  }

  get isModalInput() {
    return this.inputDetails && this.inputDetails.component === "modal";
  }
  get isPicklistInput() {
    return this.inputDetails && this.inputDetails.component === "combobox";
  }

  // TODO: what other input types will require the use of detail?
  // and other considerations
  changeInputValue(event) {
    let { target, detail } = event;
    let value;
    if (detail) {
      if (this.fieldDetail.dataType === "Boolean") {
        value = detail.checked;
      } else {
        value = detail.value;
      }
    } else if (target) {
      value = target.value;
    }

    // type coercion in check here as this is always going to be a string
    // even if the original value is a number
    // more consideration will apply for lookups and how certain modal elements
    // are handled - potentially need to extract this logic out for use in multiple
    // functions

    let eventDetail = {
      composed: true,
      bubbles: true,
      cancelable: true,
      detail: {
        rowId: this.rowId,
        field: this.fieldDetail.apiName,
        value,
        isChanged: true,
        isInvalid:
          detail && detail.isPicklist ? false : !target.checkValidity(),
        reset: this.resetInputValue
      }
    };

    if (value != this.value && !(this.isBlank && value === "")) {
      this.containerClasses = this.containerClasses + " slds-is-edited";
      this.dispatchEvent(new CustomEvent("cellvaluechange", eventDetail));
    } else {
      this.containerClasses = "slds-cell-edit";
      eventDetail.detail.isChanged = false;
      this.dispatchEvent(new CustomEvent("cellvaluechange", eventDetail));
    }
  }

  // TODO: adjust this to make it so that you basically can never enter
  // navigation mode
  arrowKeyPress = (event) => {
    let { keyCode } = event;
    if ((keyCode >= 37 && keyCode <= 40) || keyCode === 13) {
      event.stopPropagation();
      // event.preventDefault();
    }
  };
  setKeyOveride() {
    this.addEventListener("keydown", this.arrowKeyPress);
  }
  removeKeyOveride() {
    this.removeEventListener("keydown", this.arrowKeyPress);
  }

  mouseEnter = () => {
    this.isHovering = true;
  };
  mouseLeave = () => {
    this.isHovering = false;
  };

  // TODO: does this need to also find picklists, and if so, it needs to be exposed from container
  resetInputValue = (stylingOnly = false, newOriginalValue) => {
    let componentToSelector = {
      input: "lightning-input",
      combobox: "c-picklist-input"
    };
    let input = this.template.querySelector(
      componentToSelector[this.inputDetails.component]
    );
    if (!stylingOnly) {
      if (input) {
        if (this.inputDetails.component === "combobox") {
          input.reset();
        } else if (this.inputDetails.component === "input")
          input.value = this.originalValue;
      }
    }
    if (newOriginalValue) {
      this.originalValue = newOriginalValue;
      if (this.inputDetails.component === "combobox") {
        input.updateOriginalValue(newOriginalValue);
      }
    }
    this.containerClasses = "slds-cell-edit";
  };

  connectedCallback() {
    this.originalValue = this.value;
    this.editing = this.disableInputReason === 0 ? this.defaultEdit : false;
    this.inputDetails = this.fieldToInput(this.fieldDetail);
    // if editing focus the first available input element

    this.addEventListener("mouseenter", this.mouseEnter);
    this.addEventListener("mouseleave", this.mouseLeave);
    // when the input element recieves focus set the keydown event listener
    // override, when it blurs remove the event listener
  }
  disconnectedCallback() {
    this.removeEventListener("mouseenter", this.mouseEnter);
    this.removeEventListener("mouseleave", this.mouseLeave);
  }

  //need to add all the bad value/message props to these return objects
  // this needs to account for display values as well in likely the same manner as tile does
  fieldToInput(fieldDetail) {
    switch (fieldDetail.dataType) {
      case "Address": {
        // modal: lightning-input-address
        return {
          supported: true,
          component: "modal",
          componentDetails: {}
        };
      }
      case "Base64": {
        // likely going to not be supported?
        return {
          supported: false
        };
      }
      case "Boolean": {
        // this needs to do a special kind of display like because it shows up as 'false'
        // as opposed to as a checkbox
        return {
          supported: true,
          component: "input",
          componentDetails: {
            type: "checkbox",
            checked: this.value,
            required: fieldDetail.required
          }
        };
      }
      case "ComboBox": {
        // custom picklist embed
        return fieldDetail.dataType;
      }
      case "ComplexValue": {
        // likely going to not be supported? like what is this?
        return {
          supported: false
        };
      }
      case "Currency": {
        return {
          supported: true,
          component: "input",
          componentDetails: {
            type: "number",
            formatter: "currency",
            step: "0." + "0".repeat(fieldDetail.scale - 1) + "1",
            max:
              "1" + "0".repeat(fieldDetail.precision - (fieldDetail.scale + 1)),
            required: fieldDetail.required
          }
        };
      }
      // eslint-disable-next-line no-fallthrough
      case "Date":
      case "DateTime": {
        return {
          supported: true,
          component: "input",
          componentDetails: {
            type: "date",
            dateStyle: "short",
            required: fieldDetail.required
          }
        };
      }
      case "Double": {
        return {
          supported: true,
          component: "input",
          componentDetails: {
            type: "number",
            formatter: "",
            step: "0." + "0".repeat(fieldDetail.scale - 1) + "1",
            max:
              "1" + "0".repeat(fieldDetail.precision - (fieldDetail.scale + 1)),
            required: fieldDetail.required
          }
        };
      }
      case "Int": {
        return {
          supported: true,
          component: "input",
          componentDetails: {
            type: "number",
            formatter: "",
            max: "1" + "0".repeat(fieldDetail.precision - 1),
            required: fieldDetail.required
          }
        };
      }
      case "Email": {
        return {
          supported: true,
          component: "input",
          componentDetails: {
            type: "email",
            maxLength: fieldDetail.length,
            required: fieldDetail.required
          }
        };
      }
      case "EncryptedString": {
        return {
          supported: false
        };
      }
      case "Location": {
        // modal: lightning-input-location
        return {
          supported: true,
          component: "modal",
          componentDetails: {}
        };
      }
      case "MultiPicklist": {
        // is this going to a modal with a multipicklist situation?
        return {
          supported: true,
          component: "modal",
          componentDetails: {}
        };
      }
      case "Percent": {
        return {
          supported: true,
          component: "input",
          componentDetails: {
            type: "number",
            formatter: "percent-fixed",
            step: fieldDetail.scale
              ? "0." + "0".repeat(fieldDetail.scale - 1) + "1"
              : "",
            max:
              "1" + "0".repeat(fieldDetail.precision - (fieldDetail.scale + 1)),
            required: fieldDetail.required
          }
        };
      }
      case "Phone": {
        return {
          supported: true,
          component: "input",
          componentDetails: {
            type: "tel",
            maxLength: fieldDetail.length,
            required: fieldDetail.required
          }
        };
      }
      case "Picklist": {
        return {
          supported: true,
          component: "combobox",
          componentDetails: {
            value: this.value,
            fieldApiName: fieldDetail.apiName,
            recordTypeId: this.recordTypeId
          }
        };
      }
      case "Reference": {
        // there could be some complexities to handling changing these values for things like M/D
        return fieldDetail.dataType;
      }
      case "String": {
        return {
          supported: true,
          component: "input",
          componentDetails: {
            type: "text",
            maxLength: fieldDetail.length,
            required: fieldDetail.required
          }
        };
      }
      case "TextArea": {
        // how to distinguish between this and rich-text or should they both
        // use the input-rich-text but with different props?
        return {
          supported: true,
          component: "modal",
          componentDetails: {}
        };
      }
      case "Time": {
        return {
          supported: true,
          component: "input",
          componentDetails: {
            type: "time",
            maxLength: fieldDetail.length,
            required: fieldDetail.required
          }
        };
      }
      case "Url": {
        return {
          supported: true,
          component: "input",
          componentDetails: {
            type: "url",
            required: fieldDetail.required
          }
        };
      }
      default:
        return fieldDetail.dataType;
    }
  }
}
