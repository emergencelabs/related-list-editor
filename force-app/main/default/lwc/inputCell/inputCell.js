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
  @api referenceIcon;
  @api referenceNameField;
  @api referenceLabel;

  @track editing = false;
  @track isHovering = false;
  //  slds-grid needs to be added but only when cell is editing
  @track containerClasses = "slds-cell-edit";

  // should this be a getter? i think it makes most sense
  // to have it like this so that it gets set on connected and then never changes
  // a getter will likely be re-evaluated too frequently?s
  @track originalValue;
  @track inputDetails;

  // TODO: need to block modal save if the value is empty but the field is required?
  // worst case it can be solved by server side
  @track modalValue;
  @track modalIsOpen = false;
  launchModalEdit() {
    this.modalIsOpen = true;
  }
  closeModalEdit({ detail: { isSave } }) {
    if (isSave) {
      let modalInput = this.template.querySelector("c-modal-input");
      if (modalInput) {
        let isValid = true;
        if (this.inputDetails.componentDetails.type === "textarea") {
          isValid = modalInput.checkValidity();
        }
        if (isValid) {
          let value = modalInput.getValue();
          this.modalValue = value;
          this.inlinedValue = value;
          this.changeInputValue({
            detail: { value, isPicklist: true }
          });
          this.modalIsOpen = false;
        }
      }
    } else {
      this.modalIsOpen = false;
    }
  }

  get isBlank() {
    return this.value === undefined;
  }

  // 3 = NotSupported, 2 = Modal, 1 = Field,  0 = editable
  // FLS check for if the field can be updated by the current user
  overrideDisable;
  get disableInputReason() {
    if (this.overrideDisable) {
      return 3;
    }
    if (this.inputDetails && !this.inputDetails.supported) {
      return 2;
    }
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
  get hoverIconStyle() {
    return this.disableInputReason >= 1
      ? "pointer-events: none;cursor:not-allowed"
      : "";
  }

  @track latestReferenceValue;
  get currentReferenceValue() {
    if (this.latestReferenceValue) {
      return this.latestReferenceValue;
    }
    return this.referenceValue;
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
    if (this.rowId && !this.rowId.includes("javascript")) {
      return `/lightning/r/${this.rowId}/view`;
    }
    return null;
  }

  get link() {
    return this.currentReferenceValue &&
      this.currentReferenceValue.Id &&
      !this.currentReferenceValue.Id.includes("javascript")
      ? `/lightning/r/${this.currentReferenceValue.Id}/view`
      : null;
  }

  get linkLabel() {
    if (this.link) {
      return this.currentReferenceValue[this.referenceLabel];
    }
    return null;
  }

  navigateToLookup(event) {
    event.preventDefault();
    this.navigateToRecord(null, this.currentReferenceValue.Id);
  }

  navigateToRecord(event, lookupId) {
    let rowId = lookupId || this.rowId;
    if (event) {
      event.preventDefault();
    }
    this.dispatchEvent(
      new CustomEvent("linknavigate", {
        composed: true,
        bubbles: true,
        cancelable: true,
        detail: { rowId }
      })
    );
  }

  @track inlinedValue;
  get innerValue() {
    if (this.inlinedValue !== undefined) return this.inlinedValue;
    return this.value;
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
  // TODO: how will this work if its the M/D or lookup that has created this relationship?
  // when a value changes I don't re-collect the records
  // potentially can make that field locked
  get isLookupInput() {
    return this.inputDetails && this.inputDetails.component === "reference";
  }

  get lookupObjectApiName() {
    if (this.fieldDetail.referenceToInfos) {
      return this.fieldDetail.referenceToInfos[0].apiName;
    }
    return null;
  }

  // TODO: how to re-build this for reset, etc
  // this needs to not hardcode name? what does the object look like
  // if the lookup object has no explicity named 'Name' field
  originalLookupValue = null;
  get lookupValue() {
    if (
      this.currentReferenceValue &&
      Object.keys(this.currentReferenceValue).length
    ) {
      return {
        id: this.currentReferenceValue.Id,
        sObjectType: this.lookupObjectApiName,
        title: this.currentReferenceValue[this.referenceNameField],
        icon: this.referenceIcon
      };
    }
    return null;
  }

  // TODO: what other input types will require the use of detail?
  // and other considerations
  changeInputValue(event) {
    let { target, detail } = event;
    let value;
    if (detail) {
      if (this.fieldDetail.dataType === "Boolean") {
        value = detail.checked;
      } else if (detail.refName) {
        value = { Id: detail.value, Name: detail.refName };
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
        isReference: this.isLookupInput,
        value,
        isChanged: true,
        isInvalid:
          detail && detail.isPicklist ? false : !target.checkValidity(),
        reset: this.resetInputValue
      }
    };

    if (this.isReference) {
      let hasOriginal = !!this.originalLookupValue;
      let hasNew = !!value.Id;

      if (
        (hasOriginal && !hasNew) ||
        (!hasOriginal && hasNew) ||
        (hasOriginal &&
          (this.originalLookupValue.Id || this.originalLookupValue.id) !==
            value.Id)
      ) {
        this.setContainerClasses("slds-is-edited");
      } else {
        this.setContainerClasses();
        eventDetail.detail.isChanged = false;
      }
    } else if (value != this.originalValue && !(this.isBlank && value === "")) {
      this.setContainerClasses("slds-is-edited");
    } else {
      this.setContainerClasses();
      eventDetail.detail.isChanged = false;
    }
    this.dispatchEvent(new CustomEvent("cellvaluechange", eventDetail));
  }

  setContainerClasses(append) {
    this.containerClasses = `slds-cell-edit ${
      this.isRequired && this.editing ? "slds-grid" : ""
    } ${append ? append : ""}`;
  }

  get containerCursorStyle() {
    return `${
      this.disableInput || this.editing
        ? "padding: 5px 10px;min-height: calc(var(--lwc-heightInput, 1.875rem) + (1px * 2));"
        : "padding: 5px 10px;min-height: calc(var(--lwc-heightInput, 1.875rem) + (1px * 2));cursor:pointer"
    }`;
  }

  // TODO: adjust this to make it so that you basically can never enter
  // navigation mode
  arrowKeyPress = (event) => {
    let { keyCode } = event;
    if ((keyCode >= 37 && keyCode <= 40) || keyCode === 13) {
      event.stopPropagation();
      if (keyCode === 13 && this.defaultEdit) {
        this.dispatchEvent(
          new CustomEvent("enterpress", {
            composed: true,
            bubbles: true,
            cancelable: true,
            detail: { rowId: this.rowId, field: this.fieldDetail.apiName }
          })
        );
      }
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

  focusInnerElement() {
    let input = this.template.querySelector(
      this.componentToSelector[this.inputDetails.component]
    );
    if (input.focus) {
      input.focus();
    }
  }

  componentToSelector = {
    input: "lightning-input",
    combobox: "c-picklist-input",
    modal: "c-modal-input",
    reference: "c-lookup-input"
  };
  resetInputValue = (stylingOnly = false, newOriginalValue) => {
    this.editing = this.disableInput ? false : this.defaultEdit;
    let input = this.template.querySelector(
      this.componentToSelector[this.inputDetails.component]
    );
    this.inlinedValue = undefined;

    if (!stylingOnly) {
      if (this.inputDetails.component === "reference") {
        if (this.originalLookupValue) {
          this.latestReferenceValue = {
            Id: this.originalLookupValue.id || this.originalLookupValue.Id,
            Name:
              this.originalLookupValue.title || this.originalLookupValue.Name
          };
        } else {
          this.latestReferenceValue = {
            Id: "",
            Name: ""
          };
        }
      }

      if (input) {
        if (
          this.inputDetails.component === "combobox" ||
          this.inputDetails.component === "reference"
        ) {
          input.reset();
        } else if (this.inputDetails.component === "input") {
          if (this.fieldDetail.dataType === "Boolean") {
            input.checked = this.originalValue;
          } else {
            input.value = this.originalValue;
            input.reportValidity();
          }
        }
      } else if (this.inputDetails.component === "modal") {
        this.modalValue = this.originalValue;
      }
    }
    if (newOriginalValue) {
      this.originalValue = newOriginalValue;
      if (this.latestReferenceValue) {
        this.latestReferenceValue = newOriginalValue;
        this.originalLookupValue = newOriginalValue;
      }
      if (
        (this.inputDetails.component === "combobox" ||
          this.inputDetails.component === "reference") &&
        input
      ) {
        input.updateOriginalValue(newOriginalValue);
      } else if (this.inputDetails.component === "modal") {
        this.modalValue = newOriginalValue;
      }
    }
    this.setContainerClasses();
    window.removeEventListener("mousedown", this.handler);
  };

  handler = (e) => {
    if (!e._isInTemplate) {
      let isValid = true;
      let input = this.template.querySelector("lightning-input");
      if (input) {
        isValid = input.checkValidity();
      }
      if (this.editing && isValid) {
        if (!this.isModalInput) {
          let value = this.getValueFromInput();
          if (this.isLookupInput) {
            this.inlinedValue = value.title;
            this.latestReferenceValue = { Id: value.id, Name: value.title };
          } else {
            this.inlinedValue = value;
          }
        }
        this.editing = false;
        this.setContainerClasses(
          this.containerClasses.includes("slds-is-edited")
            ? "slds-is-edited"
            : ""
        );
        window.removeEventListener("mousedown", this.handler);
        this.template.removeEventListener("mousedown", this.templateHandler);
      }
    }
  };

  templateHandler = (e) => {
    if (this.editing) {
      e._isInTemplate = true;
    }
  };

  inlineEdit = () => {
    if (!this.editing && !this.disableInput) {
      this.editing = true;
      this.setContainerClasses(
        this.containerClasses.includes("slds-is-edited") ? "slds-is-edited" : ""
      );
      if (this.isModalInput) {
        this.launchModalEdit();
      }

      this.template.addEventListener("mousedown", this.templateHandler);
      window.addEventListener("mousedown", this.handler);
    }
  };

  getValueFromInput() {
    let cmp = this.template.querySelector(
      this.componentToSelector[this.inputDetails.component]
    );
    if (this.fieldDetail.dataType === "Boolean") {
      return cmp.checked;
    } else if (this.isPicklistInput || this.isLookupInput) {
      return cmp.getValue();
    }
    cmp.blur();
    return cmp.value;
  }

  renderedCallback() {
    if (this.editing && !this.defaultEdit) {
      let inputEl = this.template.querySelector("lightning-input");
      if (inputEl) {
        inputEl.focus();
      }
    }
  }

  connectedCallback() {
    if (this.defaultEdit) {
      this.dispatchEvent(
        new CustomEvent("registercell", {
          composed: true,
          bubbles: true,
          cancelable: true,
          detail: {
            rowId: this.rowId,
            field: this.fieldDetail.apiName,
            focus: this.focusInnerElement.bind(this)
          }
        })
      );
    }

    if (
      this.fieldDetail.relationshipName === "Owner" ||
      (this.referenceValue && this.referenceLabel !== this.referenceNameField)
    ) {
      this.overrideDisable = true;
    }

    this.originalValue = this.value;

    this.modalValue = this.value;
    this.originalLookupValue = this.currentReferenceValue
      ? {
          id: this.currentReferenceValue.Id,
          sObjectType: this.lookupObjectApiName,
          title: this.currentReferenceValue.Name,
          icon: this.referenceIcon
        }
      : null;
    this.inputDetails = this.fieldToInput(this.fieldDetail);

    this.editing = this.disableInput ? false : this.defaultEdit;
    // if editing focus the first available input element

    this.addEventListener("mouseenter", this.mouseEnter);
    this.addEventListener("mouseleave", this.mouseLeave);
    // when the input element recieves focus set the keydown event listener
    // override, when it blurs remove the event listener
    this.template.addEventListener("dblclick", this.inlineEdit);
    this.setContainerClasses();
  }
  disconnectedCallback() {
    if (this.defaultEdit) {
      this.dispatchEvent(
        new CustomEvent("unregistercell", {
          composed: true,
          bubbles: true,
          cancelable: true,
          detail: {
            rowId: this.rowId,
            field: this.fieldDetail.apiName
          }
        })
      );
    }
    this.removeEventListener("mouseenter", this.mouseEnter);
    this.removeEventListener("mouseleave", this.mouseLeave);
    this.template.removeEventListener("dblclick", this.inlineEdit);
  }

  //need to add all the bad value/message props to these return objects
  // this needs to account for display values as well in likely the same manner as tile does
  fieldToInput(fieldDetail) {
    if (fieldDetail.controllerName) {
      return {
        supported: false
      };
    }
    switch (fieldDetail.dataType) {
      case "Address": {
        // address is not supported as only its individual items can be added to the column set
        return {
          supported: false
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
        let isCalculated = fieldDetail.calculated;
        let wholeNumberStep = fieldDetail.scale === 0;
        return {
          supported: true,
          component: "input",
          componentDetails: {
            type: "number",

            formatter: "",
            step:
              isCalculated || wholeNumberStep
                ? undefined
                : "0." + "0".repeat(fieldDetail.scale - 1) + "1",

            max: String(Number("1" + "0".repeat(fieldDetail.precision)) - 1),
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
            max: String(Number("1" + "0".repeat(fieldDetail.precision)) - 1),
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
        // location is a compound field that requires both latitude, and longitude
        // to be present in the column set and/or have a value to be saved
        // as they're added independently to the columns this value will never show up
        // so they're treated as Double fields
        // we can discuss if they're worth allowing to edit and just having the error exist
        // see 'Double' compoundComponentName restriction
        return {
          supported: false
        };
      }
      case "MultiPicklist": {
        // is this going to a modal with a multipicklist situation?
        return {
          supported: true,
          component: "modal",
          componentDetails: {
            type: "multipicklist",
            value: this.value,
            label: fieldDetail.label,
            fieldApiName: fieldDetail.apiName,
            recordTypeId: this.recordTypeId,
            objectApiName: this.objectApiName,
            required: fieldDetail.required
          }
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
        return {
          supported: true,
          component: "reference",
          componentDetails: {
            value: this.value,
            fieldApiName: fieldDetail.apiName
            // TODO
          }
        };
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
          componentDetails: {
            type: "textarea",
            maxLength: fieldDetail.length,
            required: fieldDetail.required
          }
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
