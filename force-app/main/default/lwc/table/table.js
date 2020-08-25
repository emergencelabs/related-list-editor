import { api } from "lwc";
import { loadStyle } from "lightning/platformResourceLoader";
import LightningDatatable from "lightning/datatable";
import CellStyling from "@salesforce/resourceUrl/CellStyling";

import input from "./input.html";

export default class Table extends LightningDatatable {
  static customTypes = {
    input: {
      template: input,
      // standardCellLayout: true,
      // Provide template data here if needed
      typeAttributes: [
        "type",
        "fieldDetail",
        "rowId",
        "referenceValue",
        "objectApiName",
        "recordTypeId",
        "defaultEdit",
        "referenceIcon"
      ]
    }
  };

  @api noScroll = false;

  // this same element needs overflow: unset; nevermind fucking sucks
  // might need height: 100% set though
  // but the element also gets reset everytime anything like column width changes
  @api findElement() {
    return this.template.querySelector(".slds-scrollable_y");
  }

  connectedCallback() {
    super.connectedCallback();
    // a promise but nothing to do once resolved
    loadStyle(this, CellStyling).then(() => {
      this.findElement().style.paddingBottom = "45px";
      // if (this.noScroll) {
      //   // window.console.log("no scroll");
      //   // this.findElement().style.overflow = "unset";
      // }
    });
  }
}
