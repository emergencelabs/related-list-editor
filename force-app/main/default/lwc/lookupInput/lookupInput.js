import { LightningElement, api, track } from "lwc";
import search from "@salesforce/apex/LookupController.search";

export default class LookupInput extends LightningElement {
  @api required;
  @api iconName;
  @api objectApiName;
  @api initialValue;

  @track currentValue;

  get value() {
    return this.currentValue;
  }

  changeSelection({ detail: [newSelection] }) {
    window.console.log(newSelection);
    // let id = newSelection;
    // if (id) {
    //   this.currentValue = {
    //     id,
    //     sObjectType: this.initialValue.sObjectType,
    //     title: this.initialValue.title,
    //     icon: this.initialValue.icon
    //   };
    // }
    let isBlank = !newSelection;
    let value = isBlank ? "" : newSelection.Id;
    let refName = isBlank ? "" : newSelection.Name;
    this.dispatchEvent(
      new CustomEvent("selection", {
        detail: {
          value,
          refName,
          isPicklist: true
        }
      })
    );
  }

  lookupSearch({ target, detail: { searchTerm } }) {
    window.console.log(searchTerm);
    search({
      searchTerm,
      objectApiName: this.objectApiName,
      iconName: this.iconName
    })
      .then((results) => {
        target.setSearchResults(results);
      })
      .catch((error) => {
        window.console.error(error);
      });
  }

  @api getValue() {
    let selectionList = this.template.querySelector("c-lookup").getSelection();
    if (selectionList.length > 0 && selectionList[0]) {
      return selectionList[0];
    }
    return {};
  }

  @api reset() {
    this.template.querySelector("c-lookup").selection = this.resetValue;
  }

  @api updateOriginalValue(value) {
    this.resetValue = {
      id: value.Id,
      title: value.Name,
      sObjectType: this.objectApiName,
      icon: this.iconName
    };
  }
  resetValue = null;
  connectedCallback() {
    this.currentValue = this.initialValue;
    this.resetValue = this.initialValue;
  }
}