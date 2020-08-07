import { LightningElement, api, track } from "lwc";
import { ShowToastEvent } from "lightning/platformShowToastEvent";

import getIconURL from "@salesforce/apex/IconService.getIconURL";
import getCount from "@salesforce/apex/ChildRecordService.getCount";
import getChildRecords from "@salesforce/apex/ChildRecordService.getChildRecords";
import deleteChildRecord from "@salesforce/apex/ChildRecordService.deleteChildRecord";

// this required field situation needs to be sorted out for name fields
// if a compound name field is in here and not that one then you can't edit inline?
// also need to filter out owner and some consideration may apply for multi currency here?
const IGNORED_REQUIRED_FIELDS = ["OwnerId"];

export default class Editor extends LightningElement {
  @api layoutMode;
  @api isStandalone = false;
  @api recordId;
  @api objectApiName;
  @api relatedListInfo;
  @api childFields;

  @api childObjectLabel;
  @api childRecordTypeInfo;

  @track iconName;
  @track columnDetails;

  @track loading = true;

  @track records = [];
  @track totalRecordsCount = 0;
  @track canRequestMore = true;

  get totalRecordsCountLabel() {
    if (this.totalRecordsCount > this.layoutModeLimit) {
      return `${this.layoutModeLimit}+`;
    }
    return `${this.totalRecordsCount}`;
  }

  @track modalIsOpen = false;
  launchModal() {
    this.modalIsOpen = true;
  }
  closeModal({ detail: { isSave } }) {
    this.modalIsOpen = false;
  }

  get isMobileNavigation() {
    return this.layoutMode === 0;
  }

  get showHeader() {
    return this.layoutMode > 0;
  }

  get allowEditModal() {
    return !this.isStandalone && this.layoutMode > 1;
  }

  get isTileLayout() {
    return this.layoutMode === 1 || this.layoutMode === 2;
  }

  get requiredFields() {
    if (this.childFields) {
      return Object.values(this.childFields).filter(
        (f) =>
          f.required &&
          f.createable &&
          !IGNORED_REQUIRED_FIELDS.includes(f.apiName)
      );
    }
    return [];
  }

  get requireNewModal() {
    if (this.isTileLayout) {
      return true;
    }
    let missingFields = this.requiredFields
      .map((requiredField) => requiredField.apiName)
      .filter((requiredFieldApiName) => {
        return (
          this.relatedListInfo.columns.filter(
            (columnField) => columnField.name === requiredFieldApiName
          ).length === 0
        );
      });
    return missingFields.length > 0;
  }

  get reasonForNewModal() {
    if (this.requireNewModal && !this.isTileLayout) {
      return `The following required fields are not in the column list: ${this.requiredFields
        .map(({ label }) => {
          return label;
        })
        .join(", ")}`;
    }
    return null;
  }

  get listLabel() {
    if (this.relatedListInfo) {
      return this.relatedListInfo.label;
    }
    return null;
  }
  get childObjectApiName() {
    if (this.relatedListInfo) {
      return this.relatedListInfo.sobject;
    }
    return null;
  }
  get relationshipField() {
    if (this.relatedListInfo) {
      return this.relatedListInfo.field;
    }
    return null;
  }

  async fetchIcon() {
    let iconList = await getIconURL({
      objectName: this.childObjectApiName
    });
    if (iconList.length) {
      let { Url: url } = iconList[0].Icons[0];
      let lastSlashIndex = url.lastIndexOf("/");
      let svgName = url.substring(lastSlashIndex + 1, url.lastIndexOf(".svg"));
      let category = url.substring(
        url.substring(0, lastSlashIndex).lastIndexOf("/") + 1,
        lastSlashIndex
      );
      return `${category}:${svgName}`;
    }
    return "standard:default";
  }

  // TODO: can this be removed in favor of its individual parts?
  populateListInfo(targetList) {
    return {
      listLabel: this.listLabel,
      childObjectApiName: this.childObjectApiName,
      childRecordTypeInfo: null,
      sortDetails: targetList.sort[0],
      relationshipField: this.relationshipField,
      columns: targetList.columns.map((col) => {
        let { fieldApiName, lookupId, label } = col;
        let normalizedApiName = fieldApiName;
        if (fieldApiName.includes(".")) {
          normalizedApiName = lookupId.replace(".", "");
        }
        let fieldDetail = this.childFields[normalizedApiName];
        return {
          label,
          fieldName: fieldApiName,
          fieldDetail,
          lookupId
        };
      })
    };
  }

  get layoutModeLimit() {
    if (this.layoutMode < 3) return 5;
    return 10;
  }

  buildQueryString(offset = 0) {
    let offsetString = `OFFSET ${offset}`;
    let sortString = `ORDER BY ${this.relatedListInfo.sort[0].column} ${
      this.relatedListInfo.sort[0].ascending ? "ASC" : "DESC"
    }`;
    let limitString = `LIMIT ${this.layoutModeLimit}`;
    let queryString = `SELECT Id, ${this.relatedListInfo.columns
      .map((c) => c.fieldApiName)
      .join(", ")} FROM ${this.childObjectApiName} WHERE ${
      this.relationshipField
    } = '${this.recordId}' ${sortString} ${limitString} ${offsetString}`;
    window.console.log(queryString);
    return queryString;
  }

  buildCountQueryString() {
    return `SELECT COUNT() FROM ${this.childObjectApiName} WHERE ${this.relationshipField} = '${this.recordId}'`;
  }

  async getRecordCount(queryString) {
    return getCount({ queryString });
  }

  async getChildRecords(queryString) {
    return getChildRecords({ queryString });
  }

  async getNextRecords({ detail: { offset } }) {
    this.loading = true;
    if (offset <= 2000) {
      try {
        let nextRecords = await this.getChildRecords(
          this.buildQueryString(offset)
        );
        window.console.log(JSON.parse(JSON.stringify(nextRecords)));
        this.canRequestMore = !!nextRecords.length;
        this.records = [this.records, ...nextRecords];
      } catch (e) {
        window.console.error(e);
      }
    } else {
      this.canRequestMore = false;
    }
    this.loading = false;
  }

  async deleteChildRecord(childObject) {
    return deleteChildRecord({ childObject });
  }

  async requestDelete({ detail: { childObject } }) {
    // TODO: update this with record details if possible?
    // also update the failure to include reason if possible
    this.loading = true;
    let title = "Record Deleted";
    let variant = "success";
    try {
      await this.deleteChildRecord(childObject);
      this.records = await this.getChildRecords(this.buildQueryString());
    } catch (e) {
      window.console.error("deletion error:", e);
      title = "Oops! Something went wrong!";
      variant = "error";
    }
    this.loading = false;

    this.dispatchEvent(
      new ShowToastEvent({
        title,
        // message: this.message,
        variant
      })
    );
  }

  async connectedCallback() {
    this.columnDetails = this.populateListInfo(this.relatedListInfo);
    let [count, records, iconName] = await Promise.all([
      this.getRecordCount(this.buildCountQueryString()),
      this.getChildRecords(this.buildQueryString()),
      this.fetchIcon()
    ]);
    this.totalRecordsCount = count;
    this.iconName = iconName;
    this.records = records;
    if (!this.records.length) {
      this.canRequestMore = false;
    }
    this.loading = false;
    window.console.log(JSON.parse(JSON.stringify(this.records)));
  }
}
