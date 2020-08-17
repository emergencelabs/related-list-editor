import { LightningElement, api, track } from "lwc";
import { NavigationMixin } from "lightning/navigation";
import { ShowToastEvent } from "lightning/platformShowToastEvent";

import getIconURL from "@salesforce/apex/IconService.getIconURL";
import getCount from "@salesforce/apex/ChildRecordService.getCount";

import getRecordTypeIdForList from "@salesforce/apex/RecordTypeService.getRecordTypeIdForList";

import getChildRecords from "@salesforce/apex/ChildRecordService.getChildRecords";
import updateChildRecords from "@salesforce/apex/ChildRecordService.updateChildRecords";
import deleteChildRecord from "@salesforce/apex/ChildRecordService.deleteChildRecord";

// this required field situation needs to be sorted out for name fields
// if a compound name field is in here and not that one then you can't edit inline?
// also need to filter out owner and some consideration may apply for multi currency here?
const IGNORED_REQUIRED_FIELDS = ["OwnerId"];

export default class Editor extends NavigationMixin(LightningElement) {
  @api layoutMode;
  @api isStandalone = false;
  @api recordId;
  @api objectApiName;
  @api relatedListInfo;
  @api childFields;

  @api childObjectLabel;
  @api childRecordTypeInfo;

  @track iconName;
  @track tableColumns;

  @track loading = true;

  @track records = [];
  @track newRecords = [];

  @track totalRecordsCount = 0;
  @track canRequestMore = true;
  @track currentOffset = 0;

  @track cellStatusMap = {};
  resetFuncs = [];

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

  get showTableControls() {
    return this.hasUnsavedChanges && !this.modalIsOpen;
  }

  // TODO: evaluate if save should be disabled if there are no edits at all
  // for when in expanded modal view
  get blockSave() {
    return Object.values(this.cellStatusMap).some((f) =>
      Object.values(f).some((i) => i.isInvalid)
    );
  }

  get blockModalSave() {
    return this.blockSave || !this.hasUnsavedChanges;
  }

  addRowToResetFuncs(resetFunc) {
    let indexOfExisting = this.resetFuncs.findIndex(
      (o) => o.rowId === resetFunc.rowId && o.field === resetFunc.field
    );
    if (indexOfExisting >= 0) {
      this.resetFuncs[indexOfExisting] = resetFunc;
    } else {
      this.resetFuncs.push(resetFunc);
    }
  }

  newDraftValue({
    detail: { rowId, field, value, isChanged, isInvalid, reset }
  }) {
    this.addRowToResetFuncs({ rowId, field, reset });
    let cell = this.cellStatusMap[rowId];
    if (cell) {
      cell[field] = { isChanged, isInvalid };
    } else {
      this.cellStatusMap[rowId] = { [field]: { isChanged, isInvalid } };
    }
    if (!isInvalid) {
      let targetRecordIndex = this.newRecords.findIndex((r) => r.Id === rowId);
      let targetRecord =
        targetRecordIndex >= 0
          ? { ...this.newRecords[targetRecordIndex] }
          : null;
      if (targetRecord) {
        targetRecord[field] = value;
        this.newRecords[targetRecordIndex] = targetRecord;
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

  get backdropStyleString() {
    let parentModal = this.template.querySelector(
      "c-slotted-modal.parent-modal"
    );
    let style = "";
    if (parentModal) {
      style = parentModal.getDimensions();
    }
    window.console.log({ style });
    return style;
  }

  // TODO: likely need to call the confirmation here on cancel
  // if has unsaved changes
  // this means that the confirmation modal needs to know what method to call after
  // it would be way better to do it as a promise but
  @track modalIsOpen = false;
  launchModal() {
    this.modalIsOpen = true;
    this.resetColumnsEdit();
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

  get tableContainerHeight() {
    let height = `height: ${this.isStandalone ? "25" : "15"}rem`;
    if (this.totalRecordsCount < this.layoutModeLimit) {
      height = "height:100%;";
    }
    return `${height};border-top-left-radius: 0px; border-top-right-radius: 0px; border-top: none;`;
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

  get missingRequiredFields() {
    return this.requiredFields.filter(({ apiName, dataType }) => {
      return (
        this.relatedListInfo.columns.filter(
          (columnField) => columnField.fieldApiName === apiName
        ).length === 0 && dataType !== "Boolean"
      );
    });
  }

  get requireNewModal() {
    if (this.isTileLayout) {
      return true;
    }
    return this.missingRequiredFields.length > 0;
  }

  get reasonForNewModal() {
    if (this.requireNewModal && !this.isTileLayout) {
      return `The following required fields are not in the column list: ${this.missingRequiredFields
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
    try {
      let iconList = await getIconURL({
        objectName: this.childObjectApiName
      });
      if (iconList.length) {
        let { Url: url } = iconList[0].Icons[0];
        let lastSlashIndex = url.lastIndexOf("/");
        let svgName = url.substring(
          lastSlashIndex + 1,
          url.lastIndexOf(".svg")
        );
        let category = url.substring(
          url.substring(0, lastSlashIndex).lastIndexOf("/") + 1,
          lastSlashIndex
        );
        return `${category}:${svgName}`;
      }
      return "standard:default";
    } catch (e) {
      // TODO: look more into this possible error, for logging, etc
      return "standard:default";
    }
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

  populateTableColumns(targetList) {
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
          objectApiName: this.childObjectApiName,
          defaultEdit: this.isStandalone || this.modalIsOpen,
          recordTypeId: { fieldName: "RecordTypeId" }
        },
        fieldName: fieldApiName,
        fieldDetail,
        lookupId,
        sortable: fieldDetail.sortable,
        editable: true
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
    return columns;
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
    return queryString;
  }

  buildCountQueryString() {
    return `SELECT COUNT() FROM ${this.childObjectApiName} WHERE ${this.relationshipField} = '${this.recordId}'`;
  }

  async getRecordCount(queryString) {
    return getCount({ queryString });
  }

  // TODO: need to remove the 'RecordTypeId' column from records before updates
  // and for create as well?
  // its confirmed that master record type id is the same across all ojbjects and orgs
  // so it could be left off here in those cases where there's no record types but then
  // it creates some branching paths for when it does exist, TBD
  // record type id cant be added to the column list thankfully
  async getChildRecords(queryString) {
    // NOTE: unfortunately these cannot run in parrallel as the recordTypeMap requires the Ids
    let childRecords = await getChildRecords({ queryString });
    let recordTypeMap = await getRecordTypeIdForList({
      objectApiName: this.childObjectApiName,
      recordIds: childRecords.map((r) => r.Id)
    });
    return childRecords.map((r) => {
      let clone = { ...r };
      clone.RecordTypeId = recordTypeMap[r.Id] || recordTypeMap.Default;
      return clone;
    });
  }

  async updateChildRecords(records) {
    let childRecords = records.map((r) => {
      let clone = { ...r };
      delete clone.RecordTypeId;
      return clone;
    });
    return updateChildRecords({ childRecords });
  }

  async commitRecordChange({ detail: { isSave } }) {
    var stylingOnly = false;
    if (isSave) {
      stylingOnly = true;
      this.refreshingTable = true;
      let errors = await this.updateChildRecords(this.newRecords);

      let commitAttemptCount = Object.keys(this.cellStatusMap).length;
      let title = `${commitAttemptCount} records successfully updated`;
      let variant = "success";
      let message = "";

      let errorCount = Object.keys(errors).length;
      if (errorCount) {
        if (errorCount === commitAttemptCount) {
          title = `${errorCount} records were unable to be updated`;
          variant = "error";
        } else {
          title = `${
            commitAttemptCount - errorCount
          } of ${commitAttemptCount} records successfully updated`;
          variant = "warning";
        }
        message = `Details on the ${errorCount} unsaved records are available in the table`;

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
            o.reset(
              stylingOnly,
              this.newRecords.find((r) => r.Id === o.rowId)[o.field]
            );
          }
        });
      } else {
        this.resetErrors();
        this.cellStatusMap = {};
        this.resetFuncs.forEach((o) => {
          o.reset(
            stylingOnly,
            this.newRecords.find((r) => r.Id === o.rowId)[o.field]
          );
        });
        this.modalIsOpen = false;
      }
      this.records = [...this.newRecords];
      this.dispatchEvent(
        new ShowToastEvent({
          title,
          message,
          variant
        })
      );
      this.refreshingTable = false;
    } else {
      this.resetErrors();
      this.newRecords = [...this.records];

      this.cellStatusMap = {};
      this.resetFuncs.forEach((o) => {
        o.reset(stylingOnly);
      });
      this.modalIsOpen = false;
    }
    this.resetColumnsEdit();
    return !this.hasErrors;
  }

  resetErrors() {
    this.errors = {
      rows: {}
    };
  }
  resetColumnsEdit() {
    this.tableColumns = this.tableColumns.map((detail) => {
      let clone = { ...detail };
      clone.typeAttributes.defaultEdit = this.modalIsOpen || this.isStandalone;
      return clone;
    });
  }

  async getNextRecords({ detail: { offset } }) {
    this.loading = true;
    if (offset <= 2000) {
      try {
        let nextRecords = await this.getChildRecords(
          this.buildQueryString(offset)
        );
        this.canRequestMore = nextRecords.length === this.layoutModeLimit;
        this.records = [...this.records, ...nextRecords];
        this.newRecords = [...this.records];
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
          this.newRecords = [...this.records];
        }
      );
    }
  }

  navigate(actionName, recordId) {
    this[NavigationMixin.Navigate]({
      type: "standard__recordPage",
      attributes: {
        recordId,
        actionName
      }
    });
  }

  @track refreshingTable = false;
  @track confirmLoseChanges = false;

  get confirmLose() {
    return this.confirmLoseChanges && this.currentAction !== "delete";
  }

  get confirmLoseDelete() {
    return this.confirmLoseChanges && this.currentAction === "delete";
  }

  get confirmDeleteModalTitle() {
    return `Delete ${this.childObjectLabel}`;
  }
  get confirmDeleteButtonLabel() {
    if (this.hasUnsavedChanges) {
      return "Delete & Discard Changes";
    }
    return "Delete";
  }

  currentAction = null;
  actionTypeToFunc = {
    view: {
      func: this.navigate,
      args: []
    },
    edit: {
      func: this.navigate,
      args: []
    },
    delete: {
      func: this.requestDelete,
      args: []
    },
    sort: { func: this.updateColumnSorting, args: [] }
  };

  confirmDiscard({ detail: { isSave } }) {
    this.confirmLoseChanges = false;
    if (isSave) {
      this.cellStatusMap = {};
      this.resetFuncs.forEach((o) => {
        o.reset();
      });
      let targetAction = this.actionTypeToFunc[this.currentAction];
      targetAction.func.apply(this, targetAction.args);
      targetAction.args = [];
    }
  }

  // TODO: set this up
  // also need to get a confirmation modal for if any of the options and
  // has unsaved changes
  // could create a map of actiontype to function so that
  // when this has to pop the modal we can just store the actionType
  // and then once chosen either clear type and if confirm call actionType func

  handleRowAction(event) {
    const { value } = event.detail.action;
    const row = event.detail.row;
    let needsConfirmation = value === "delete" || this.hasUnsavedChanges;
    this.currentAction = value;
    this.actionTypeToFunc[value].args = [value, row.Id];
    if (needsConfirmation) {
      this.confirmLoseChanges = true;
      if (value === "delete") {
        this.actionTypeToFunc[value].args = [{ detail: { childObject: row } }];
      }
    } else {
      let targetAction = this.actionTypeToFunc[this.currentAction];
      targetAction.func.apply(this, targetAction.args);
    }

    // window.console.log(JSON.parse(JSON.stringify(action)));
    // window.console.log(JSON.parse(JSON.stringify(row)));
  }

  // TODO: need to potentially modify the layoutModeLimit as well as the table container height
  // if standalone desktop
  customSortInfo = null;
  updateColumnSorting(event) {
    // TODO: this same concept will apply for clicking new
    if (this.hasUnsavedChanges) {
      this.currentAction = "sort";
      this.actionTypeToFunc.sort.args = [event];
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
      this.newRecords = [...this.records];
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

  async deleteChildRecord(childObject) {
    return deleteChildRecord({ childObject });
  }

  async requestDelete({ detail: { childObject } }) {
    this.loading = true;
    let title = `${childObject.Name} Successfully Deleted`;
    let variant = "success";
    let message = "";
    try {
      await this.deleteChildRecord(childObject);
      this.records = await this.getChildRecords(this.buildQueryString());
      this.newRecords = [...this.records];
    } catch (e) {
      let pageError = e.body.pageErrors[0];
      message = pageError ? pageError.message : "";
      //window.console.error("deletion error:", e);
      title = `Something went wrong deleting ${childObject.Name}`;
      variant = "error";
    }
    this.loading = false;

    this.dispatchEvent(
      new ShowToastEvent({
        title,
        message,
        variant
      })
    );
  }

  async connectedCallback() {
    this.tableColumns = this.populateTableColumns(this.relatedListInfo);
    let [count, records, iconName] = await Promise.all([
      this.getRecordCount(this.buildCountQueryString()),
      this.getChildRecords(this.buildQueryString()),
      this.fetchIcon()
    ]);
    this.totalRecordsCount = count;
    this.iconName = iconName;
    this.records = records;
    this.newRecords = [...this.records];
    if (!this.records.length) {
      this.canRequestMore = false;
    }
    this.loading = false;
    window.console.log(JSON.parse(JSON.stringify(this.records)));
  }
}
