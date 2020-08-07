import { api } from "lwc";
import LightningDatatable from "lightning/datatable";

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
        "isModal"
      ]
    }
  };

  // this same element needs overflow: unset; nevermind fucking sucks
  // might need height: 100% set though
  // but the element also gets reset everytime anything like column width changes
  @api findElement() {
    return this.template.querySelector(".slds-scrollable_y");
  }
}
