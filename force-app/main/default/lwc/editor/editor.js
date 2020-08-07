import { LightningElement, api, track } from "lwc";
import getIconURL from "@salesforce/apex/IconService.getIconURL";
import getChildRecords from "@salesforce/apex/ChildRecordService.getChildRecords";

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

  @track records = [];

  @track modalIsOpen = false;
  launchModal() {
    this.modalIsOpen = true;
  }
  closeModal({ detail }) {
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
    if (this.requireNewModal) {
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

  populateListInfo(targetList) {
    return {
      listLabel: this.listLabel,
      childObjectApiName: this.childObjectApiName,
      childRecordTypeInfo: null,
      sortDetails: targetList.sort[0],
      relationshipField: this.relationshipField,
      columns: targetList.columns.map(({ fieldApiName, lookupId, label }) => {
        let normalizedApiName = fieldApiName;
        if (fieldApiName.includes(".")) {
          normalizedApiName = lookupId.replace(".", "");
        }
        let fieldDetail = this.childFields[normalizedApiName];
        return {
          label:
            fieldDetail.dataType !== "Reference" ? fieldDetail.label : label,
          fieldName: fieldApiName,
          fieldDetail,
          lookupId
        };
      })
    };
  }

  buildQueryString() {
    let sortString = ` ORDER BY ${this.relatedListInfo.sort[0].column} ${
      this.relatedListInfo.sort[0].ascending ? "ASC" : "DESC"
    }`;
    let queryString = `SELECT Id, ${this.relatedListInfo.columns
      .map((c) => c.fieldApiName)
      .join(", ")} FROM ${this.childObjectApiName} WHERE ${
      this.relationshipField
    } = '${this.recordId}'${sortString}`;
    window.console.log(queryString);
    return queryString;
  }

  async getChildRecords(queryString) {
    return getChildRecords({ queryString });
  }

  async connectedCallback() {
    this.columnDetails = this.populateListInfo(this.relatedListInfo);
    let [records, iconName] = await Promise.all([
      this.getChildRecords(this.buildQueryString()),
      this.fetchIcon()
    ]);
    this.iconName = iconName;
    this.records = records;
    window.console.log(JSON.parse(JSON.stringify(this.records)));
  }
}
