import { LightningElement, api, track } from "lwc";
import { ShowToastEvent } from "lightning/platformShowToastEvent";

import getIconURL from "@salesforce/apex/IconService.getIconURL";
import getCount from "@salesforce/apex/ChildRecordService.getCount";
import getChildRecords from "@salesforce/apex/ChildRecordService.getChildRecords";
import updateChildRecords from "@salesforce/apex/ChildRecordService.updateChildRecords";
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
  @track newRecords = [];

  @track totalRecordsCount = 0;
  @track canRequestMore = true;
  @track currentOffset = 0;

  @track cellStatusMap = {};
  resetFuncs = new Set();

  @track errors = {
    rows: {}
  };
  get hasErrors() {
    return Object.keys(this.errors.rows).length !== 0;
  }

  get hasUnsavedChanges() {
    return Object.values(this.cellStatusMap).some((f) =>
      Object.values(f).some((i) => i.isChanged)
    );
  }

  // TODO: evaluate if save should be disabled if there are no edits at all
  // for when in expanded modal view
  get blockSave() {
    return Object.values(this.cellStatusMap).some((f) =>
      Object.values(f).some((i) => i.isInvalid)
    );
  }

  newDraftValue({
    detail: { rowId, field, value, isChanged, isInvalid, reset }
  }) {
    this.resetFuncs.add({ rowId, field, reset });
    let cell = this.cellStatusMap[rowId];
    if (cell) {
      cell[field] = { isChanged, isInvalid };
    } else {
      this.cellStatusMap[rowId] = { [field]: { isChanged, isInvalid } };
    }
    if (!isInvalid) {
      let targetRecord = this.newRecords.find((r) => r.Id === rowId);
      if (targetRecord) {
        targetRecord[field] = value;
      }
    }
    this.cellStatusMap = { ...this.cellStatusMap };
  }

  get totalRecordsCountLabel() {
    if (this.totalRecordsCount > this.layoutModeLimit) {
      return `${this.layoutModeLimit}+`;
    }
    return `${this.totalRecordsCount}`;
  }

  // TODO: likely need to call the confirmation here on cancel
  // if has unsaved changes
  // this means that the confirmation modal needs to know what method to call after
  // it would be way better to do it as a promise but
  @track modalIsOpen = false;
  launchModal() {
    this.modalIsOpen = true;
    this.columnDetails = {
      ...this.columnDetails,
      columns: this.columnDetails.columns.map((detail) => {
        let clone = { ...detail };
        clone.typeAttributes.defaultEdit = this.modalIsOpen;
        return clone;
      })
    };
  }
  // TODO: this needs to sync up or just refresh the data table that is behind the modal
  async closeModal({ detail: { isSave } }) {
    await this.commitRecordChange({ detail: { isSave } });
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

  get isTableLayout() {
    return this.layoutMode > 2;
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

  // TODO: you can add disabled: true to disable an action
  // although it doesnt seem you can make this change on a per-row basis??
  actions = [
    {
      label: "View",
      value: "view",
      iconName: "utility:preview"
    },
    { label: "Edit", value: "edit", iconName: "utility:edit" },
    { label: "Delete", value: "delete", iconName: "utility:delete" }
  ];

  // TODO: can this be removed in favor of its individual parts?
  populateListInfo(targetList) {
    let columns = targetList.columns.map((col) => {
      let { fieldApiName, lookupId, label } = col;
      let normalizedApiName = fieldApiName;
      if (fieldApiName.includes(".")) {
        normalizedApiName = lookupId.replace(".", "");
      }
      let fieldDetail = this.childFields[normalizedApiName];
      let clone = { ...fieldDetail };
      delete clone.fieldName;
      return {
        label,
        type: "input",
        typeAttributes: {
          type: "text",
          fieldDetail: clone,
          rowId: { fieldName: "Id" },
          referenceValue: fieldDetail.relationshipName
            ? {
                fieldName: fieldDetail.relationshipName
              }
            : null,
          objectApiName: this.objectApiName,
          defaultEdit: this.isStandalone || this.modalIsOpen
          // recordTypeId: this.listInfo.recordTypeId,
        },
        fieldName: fieldApiName,
        fieldDetail,
        lookupId,
        sortable: fieldDetail.sortable
      };
    });
    if (this.isTableLayout) {
      columns = [
        ...columns,
        {
          type: "action",
          typeAttributes: { rowActions: this.actions, menuAlignment: "auto" }
        }
      ];
    }
    return {
      listLabel: this.listLabel,
      childObjectApiName: this.childObjectApiName,
      childRecordTypeInfo: null,
      sortDetails: this.customSortInfo
        ? this.customSortInfo
        : this.relatedListInfo.sort[0],
      relationshipField: this.relationshipField,
      columns
    };
  }

  get layoutModeLimit() {
    if (this.layoutMode < 3) return 5;
    return 10;
  }

  // TODO: this is going to need to store the ORDER BY and OFFSET (maybe, TBD on if table sorting can reset it)
  // in state so that it can persist with whatever the latest sort is for infinite scroll
  // and also allow sort to change
  buildQueryString(offset = 0, customSortString = null) {
    let sortInfo = this.customSortInfo
      ? this.customSortInfo
      : this.relatedListInfo.sort[0];
    let offsetString = `OFFSET ${offset}`;
    let sortString = `ORDER BY ${sortInfo.column} ${
      sortInfo.ascending ? "ASC  NULLS LAST" : "DESC  NULLS LAST"
    }`;
    let limitString = `LIMIT ${this.layoutModeLimit}`;
    let queryString = `SELECT Id, ${this.relatedListInfo.columns
      .map((c) => c.fieldApiName)
      .join(", ")} FROM ${this.childObjectApiName} WHERE ${
      this.relationshipField
    } = '${this.recordId}' ${
      customSortString !== null ? customSortString : sortString
    } ${limitString} ${offsetString}`;
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

  async updateChildRecords(records) {
    return updateChildRecords({ childRecords: records });
  }

  async commitRecordChange({ detail: { isSave } }) {
    var stylingOnly = false;
    if (isSave) {
      stylingOnly = true;
      this.refreshingTable = true;
      let errors = await this.updateChildRecords(this.newRecords);
      if (Object.keys(errors).length) {
        let errorObj = {
          rows: {}
        };
        Object.keys(errors).forEach((id) => {
          errorObj.rows[id] = {
            title: `We found ${Object.keys(errors[id]).length} errors`,
            messages: Object.values(errors[id]),
            fieldNames: Object.keys(errors[id])
          };
        });
        this.errors = errorObj;
        this.cellStatusMap = Object.keys(this.cellStatusMap)
          .filter((id) => !!errors[id])
          .map((id) => {
            return this.cellStatusMap[id];
          });
        this.resetFuncs.forEach((o) => {
          if (!errors[o.rowId]) {
            o.reset(stylingOnly);
          }
        });
      } else {
        this.resetErrors();
        this.cellStatusMap = {};
        this.resetFuncs.forEach((o) => {
          o.reset(stylingOnly);
        });
        this.modalIsOpen = false;
      }

      this.records = this.newRecords;
      this.refreshingTable = false;
    } else {
      this.resetErrors();
      this.newRecords = this.records;
      this.cellStatusMap = {};
      this.resetFuncs.forEach((o) => {
        o.reset(stylingOnly);
      });
      this.modalIsOpen = false;
      this.resetColumnsEdit();
    }
    return !this.hasErrors;
  }

  resetErrors() {
    this.errors = {
      rows: {}
    };
  }
  resetColumnsEdit() {
    this.columnDetails = {
      ...this.columnDetails,
      columns: this.columnDetails.columns.map((detail) => {
        let clone = { ...detail };
        clone.typeAttributes.defaultEdit = this.modalIsOpen;
        return clone;
      })
    };
  }

  // TODO: fix this to use the internal currentOffset state versus sending in event
  // sort also resets the currentOffset back to 0
  async getNextRecords({ detail: { offset } }) {
    this.loading = true;
    if (offset <= 2000) {
      try {
        let nextRecords = await this.getChildRecords(
          this.buildQueryString(offset)
        );
        this.canRequestMore = nextRecords.length === this.layoutModeLimit;
        this.records = [...this.records, ...nextRecords];
        this.newRecords = this.records;
      } catch (e) {
        window.console.error(e);
      }
    } else {
      this.canRequestMore = false;
    }
    this.loading = false;
  }

  // NOTE: data table event handlers cannot be async for some reason???
  // TODO: need to add the 2000 record offset blocking
  loadMoreRecords(event) {
    if (this.canRequestMore) {
      let t = event.target;
      t.isLoading = true;

      this.currentOffset += this.layoutModeLimit;
      this.getChildRecords(this.buildQueryString(this.currentOffset)).then(
        (nextRecords) => {
          t.isLoading = false;
          this.canRequestMore = nextRecords.length === this.layoutModeLimit;
          t.enableInfiniteLoading = this.canRequestMore;
          this.records = [...this.records, ...nextRecords];
          this.newRecords = this.records;
        }
      );
    }
  }

  @track refreshingTable = false;
  @track confirmLoseChanges = false;
  columnSortingEvent = null;
  confirmDiscard({ detail: { isSave } }) {
    this.confirmLoseChanges = false;
    if (isSave) {
      this.cellStatusMap = {};
      this.resetFuncs.forEach((o) => {
        o.reset();
      });
      this.updateColumnSorting(this.columnSortingEvent);
      this.columnSortingEvent = null;
    }
  }
  // TODO: need to potentially modify the layoutModeLimit as well as the table container height
  // if standalone desktop
  customSortInfo = null;
  updateColumnSorting(event) {
    // TODO: this same concept will apply for clicking new
    // TODO: why when sort does it not clear out changes? if the same row is still onscreen
    if (this.hasUnsavedChanges) {
      this.columnSortingEvent = event;
      this.confirmLoseChanges = true;
      return;
    }
    let fieldName = event.detail.fieldName;
    let sortDirection = event.detail.sortDirection;
    // assign the latest attribute with the sorted column fieldName and sorted direction
    let t = event.target || this.template.querySelector("c-table");
    t.findElement().scrollTop = 0;
    t.sortedBy = fieldName;
    t.sortedDirection = sortDirection;
    this.customSortInfo = {
      column: fieldName,
      ascending: sortDirection === "asc"
    };
    this.currentOffset = 0;
    this.refreshingTable = true;
    let sortString = `ORDER BY ${fieldName} ${sortDirection.toUpperCase()} NULLS LAST`;
    this.getChildRecords(
      this.buildQueryString(this.currentOffset, sortString)
    ).then((records) => {
      this.refreshingTable = false;
      this.records = records;
      this.newRecords = this.records;
      this.canRequestMore = !!this.records.length;
      t.enableInfiniteLoading = this.canRequestMore;
    });
  }

  get columnSortDirection() {
    let sortInfo = this.customSortInfo
      ? this.customSortInfo
      : this.relatedListInfo.sort[0];
    if (this.relatedListInfo) {
      return sortInfo.ascending ? "asc" : "desc";
    }
    return null;
  }

  get columnSortColumn() {
    let sortInfo = this.customSortInfo
      ? this.customSortInfo
      : this.relatedListInfo.sort[0];
    if (this.relatedListInfo) {
      return sortInfo.column;
    }
    return null;
  }

  // TODO: set this up
  // also need to get a confirmation modal for if any of the options and
  // has unsaved changes
  handleRowAction(event) {
    const action = event.detail.action;
    const row = event.detail.row;
    //     switch (action.name) {
    //         case 'show_details':
    //             alert('Showing Details: ' + JSON.stringify(row));
    //             break;
    //         case 'delete':
    //             const rows = this.data;
    //             const rowIndex = rows.indexOf(row);
    //             rows.splice(rowIndex, 1);
    //             this.data = rows;
    //             break;
    // }
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
      this.newRecords = this.records;
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
    this.newRecords = this.records;
    if (!this.records.length) {
      this.canRequestMore = false;
    }
    this.loading = false;
    window.console.log(JSON.parse(JSON.stringify(this.records)));
  }
}
