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
const MIN_COLUMN_WIDTH = "90";
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
  get tileColumns() {
    if (this.tableColumns) {
      return this.tableColumns.filter(({ type }) => type !== "action");
    }
    return [];
  }
  MIN_COLUMN_WIDTH = MIN_COLUMN_WIDTH;

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

  get sharedContainerHeightStyle() {
    if (this.loading || this.records.length > 3) {
      return `min-height: 100px;`;
    }
    return ``;
  }

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
    detail: { rowId, field, value, isReference, isChanged, isInvalid, reset }
  }) {
    this.addRowToResetFuncs({
      rowId,
      field,
      reset,
      isReference,
      called: false
    });
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
        if (isReference) {
          targetRecord[field] = value ? value.Id : "";
          targetRecord[this.childFields[field].relationshipName] = value
            ? value
            : null;
        } else {
          targetRecord[field] = value;
        }
        this.newRecords[targetRecordIndex] = targetRecord;
        this.newRecords = [...this.newRecords];
      }
    }
    this.cellStatusMap = { ...this.cellStatusMap };
  }

  get noScroll() {
    return this.totalRecordsCount <= this.layoutModeLimit;
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
    if (this.hasUnsavedChanges) {
      this.currentAction = "expand";
      this.confirmLoseChanges = true;
    } else {
      this.expand();
    }
  }

  expand() {
    this.modalIsOpen = true;
    this.resetColumnsEdit();
  }

  // TODO: this needs to sync up or just refresh the data table that is behind the modal
  async closeModal({ detail: { isSave } }) {
    if (!isSave && this.hasUnsavedChanges) {
      // pop confirmation modal
      // on cancel do nothing but close that modal
      // on confirm call the same func as below
      this.currentAction = "close";
      this.actionTypeToFunc.close.args = [{ detail: { isSave } }, true];
      this.confirmLoseChanges = true;
    } else {
      await this.commitRecordChange({ detail: { isSave } }, true);
    }
  }

  get isMobileNavigation() {
    return this.layoutMode === 0;
  }

  get showHeader() {
    return this.layoutMode > 0;
  }

  get allowEditModal() {
    return (
      !this.isStandalone &&
      this.layoutMode > 1 &&
      this.records &&
      this.records.length
    );
  }

  get isTileLayout() {
    return this.layoutMode === 1 || this.layoutMode === 2;
  }

  get isTableLayout() {
    return this.layoutMode > 2;
  }

  get tableContainerHeight() {
    let height = `height: ${
      this.isStandalone ? "calc(100vh - 250px)" : "24rem"
    }`;
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

  get canShowViewTable() {
    return !this.modalIsOpen && this.records && this.records.length;
  }

  async fetchIcon(objectName) {
    try {
      let iconList = await getIconURL({
        objectName
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
      window.console.error(e);
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
    // 1: Filter out all columns that the user does not have access to
    // 2: Map the columns into what the datatable needs
    // let containerWidth = this.template
    //   .querySelector(".table-container")
    //   .getBoundingClientRect().width;

    /*     initialWidth: this.getColumnWidth(
            containerWidth,
            available.length,
            fieldDetail.dataType
          ),
          */

    let columns = targetList.columns
      .filter(({ fieldApiName, lookupId }) => {
        let normalizedApiName = fieldApiName;
        if (fieldApiName.includes(".")) {
          normalizedApiName = lookupId.replace(".", "");
        }
        let fielDetails = this.childFields[normalizedApiName];
        if (fielDetails && fielDetails.dataType === "EncryptedString") {
          return false;
        }

        return !!fielDetails;
      })
      .map((col) => {
        let { fieldApiName, lookupId, label } = col;
        let normalizedApiName = fieldApiName;
        if (fieldApiName.includes(".")) {
          normalizedApiName = lookupId.replace(".", "");
        }
        let fieldDetail = this.childFields[normalizedApiName];
        let clone = { ...fieldDetail };
        let isRef = !!fieldDetail.relationshipName;
        delete clone.fieldName;
        return {
          label,
          type: "input",
          typeAttributes: {
            type: "text",
            fieldDetail: clone,
            rowId: { fieldName: "Id" },
            referenceValue: isRef
              ? {
                  fieldName: fieldDetail.relationshipName
                }
              : null,
            referenceIcon: isRef
              ? this.referenceIconMap.find(
                  (icon) => Object.keys(icon)[0] === normalizedApiName
                )[normalizedApiName]
              : null,
            objectApiName: this.childObjectApiName,
            defaultEdit: this.isStandalone || this.modalIsOpen,
            recordTypeId: { fieldName: "RecordTypeId" }
          },
          hideDefaultActions: this.isStandalone || this.modalIsOpen,
          fieldName: normalizedApiName,
          fieldDetail,
          lookupId,
          sortable: fieldDetail.sortable,
          editable: true
        };
      });

    columns = [
      ...columns,
      {
        type: "action",
        typeAttributes: { rowActions: this.actions, menuAlignment: "auto" }
      }
    ];

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
    let sortInfo = this.columnSortInfo;

    let offsetString = `OFFSET ${offset}`;
    let sortString = `ORDER BY ${sortInfo.column} ${
      sortInfo.ascending ? "ASC  NULLS LAST" : "DESC  NULLS LAST"
    }`;
    let limitString = `LIMIT ${this.layoutModeLimit}`;
    // filter out all fields that are not accessible to the current user
    let queryString = `SELECT Id, ${this.relatedListInfo.columns
      .filter(({ fieldApiName, lookupId }) => {
        let normalizedApiName = fieldApiName;
        if (fieldApiName.includes(".")) {
          normalizedApiName = lookupId.replace(".", "");
        }
        let fielDetails = this.childFields[normalizedApiName];
        if (fielDetails && fielDetails.dataType === "EncryptedString") {
          return false;
        }

        return !!fielDetails;
      })
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
    let childRecords = records
      .filter((record) => {
        return !!this.cellStatusMap[record.Id];
      })
      .map((r) => {
        let clone = { ...r };
        delete clone.RecordTypeId;
        return clone;
      });
    return updateChildRecords({ childRecords });
  }

  async commitRecordChange({ detail: { isSave } }, modalTrigger = false) {
    var stylingOnly = false;
    if (isSave) {
      stylingOnly = true;
      this.refreshingTable = true;
      let errors;

      try {
        errors = await this.updateChildRecords(this.newRecords);
      } catch (e) {
        this.resetErrors();
        this.cellStatusMap = {};
        // TODO figure out name and update for lookup values
        this.resetFuncs.forEach((o) => {
          o.reset(false);
          o.called = true;
        });
        this.resetFuncs = this.resetFuncs.filter((o) => !o.called);
        this.modalIsOpen = false;
        this.dispatchEvent(
          new ShowToastEvent({
            title: "Unable to update records",
            message: e.body.message,
            variant: "error"
          })
        );
      }

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
        window.console.log(JSON.stringify(errors, null, 2));

        Object.keys(errors).forEach((id, index) => {
          let errorKeys = Object.keys(errors[id]);
          let fieldName = errorKeys[0];
          let fieldDetails = this.childFields[fieldName];
          let messagePrefix =
            Number(fieldName) === index || !fieldDetails
              ? "Error"
              : fieldDetails.label;
          errorObj.rows[id] = {
            title: `We found ${errorKeys.length} errors`,
            messages: `${messagePrefix}: ${Object.values(errors[id])}`,
            fieldNames: errorKeys
          };
        });
        this.errors = errorObj;

        let interimStatusMap = {};
        for (let rowId of Object.keys(this.cellStatusMap)) {
          if (errors[rowId]) {
            interimStatusMap[rowId] = this.cellStatusMap[rowId];
          }
        }
        this.cellStatusMap = interimStatusMap;

        this.resetFuncs.forEach((o) => {
          if (!errors[o.rowId]) {
            let targetObj = this.newRecords.find((r) => r.Id === o.rowId);
            let rIndex = this.records.findIndex((r) => r.Id === o.rowId);
            this.records[rIndex] = targetObj;
            let newValue = o.isReference
              ? {
                  Id: targetObj[o.field],
                  Name: targetObj[this.childFields[o.field].relationshipName]
                    ? targetObj[this.childFields[o.field].relationshipName].Name
                    : ""
                }
              : targetObj[o.field];
            o.reset(stylingOnly, newValue);
            o.called = true;
          }
        });
        this.resetFuncs = this.resetFuncs.filter((o) => !o.called);
      } else {
        this.resetErrors();
        this.cellStatusMap = {};

        this.resetFuncs.forEach((o) => {
          let targetObj = this.newRecords.find((r) => r.Id === o.rowId);
          let newValue = o.isReference
            ? {
                Id: targetObj[o.field],
                Name: targetObj[this.childFields[o.field].relationshipName]
                  ? targetObj[this.childFields[o.field].relationshipName].Name
                  : ""
              }
            : targetObj[o.field];
          o.reset(stylingOnly, newValue);
          o.called = true;
        });
        this.resetFuncs = this.resetFuncs.filter((o) => !o.called);
        // FILTER OUT RESET FUNCS THAT WERE CALLED
        this.records = [...this.newRecords];
        this.modalIsOpen = false;
      }

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
        o.called = true;
      });
      this.resetFuncs = this.resetFuncs.filter((o) => !o.called);
      this.modalIsOpen = false;
    }
    if (modalTrigger) {
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
    // let el =
    //   this.template.querySelector(".modal-table-container") ||
    //   this.template.querySelector(".table-container");
    // let containerWidth = el.getBoundingClientRect().width;
    this.tableColumns = this.tableColumns.map((detail, _, available) => {
      let clone = { ...detail };
      // if (clone.type === "input") {
      //   clone.initialWidth = this.getColumnWidth(
      //     containerWidth,
      //     available.length,
      //     clone.fieldDetail.dataType
      //   );
      // }
      clone.hideDefaultActions = this.isStandalone || this.modalIsOpen;
      clone.typeAttributes.defaultEdit = this.modalIsOpen || this.isStandalone;
      return clone;
    });
  }

  async getNextRecords() {
    this.loading = true;
    this.currentOffset += this.layoutModeLimit;
    if (this.currentOffset <= 2000) {
      try {
        let nextRecords = await this.getChildRecords(
          this.buildQueryString(this.currentOffset)
        );
        this.canRequestMore = nextRecords.length === this.layoutModeLimit;
        this.records = [...this.records, ...nextRecords];
        this.newRecords = [...this.records];
      } catch (e) {
        window.console.error(e);
      }
    } else {
      this.canRequestMore = false;
      this.dispatchEvent(
        new ShowToastEvent({
          title: "You can only view 2000 records in the Related List Editor",
          variant: "error"
        })
      );
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
      if (this.currentOffset <= 2000) {
        this.getChildRecords(this.buildQueryString(this.currentOffset))
          .then((nextRecords) => {
            t.isLoading = false;

            this.canRequestMore = nextRecords.length === this.layoutModeLimit;
            t.enableInfiniteLoading = this.canRequestMore;
            this.records = [...this.records, ...nextRecords];
            this.newRecords = [...this.records];
          })
          .catch((e) => {
            t.isLoading = false;
            this.canRequestMore = false;
            t.enableInfiniteLoading = false;
            this.dispatchEvent(
              new ShowToastEvent({
                title: "Something went wrong loading more records",
                variant: "error"
              })
            );
          });
      } else {
        t.isLoading = false;
        this.canRequestMore = false;
        t.enableInfiniteLoading = false;
        this.dispatchEvent(
          new ShowToastEvent({
            title: "You can only view 2000 records in the Related List Editor",
            variant: "error"
          })
        );
      }
    }
  }

  navigate(actionName, recordId) {
    if (this.modalIsOpen) {
      this.closeModal({ detail: { isSave: false } });
    }
    // TODO, need to reset all the records here as this doesn't refresh when you navigate

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
    new: {
      func: this.newRecordModal,
      args: []
    },
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
    sort: { func: this.updateColumnSorting, args: [] },
    close: { func: this.commitRecordChange, args: [] },
    refresh: { func: this.requestRefreshedRecords, args: [] },
    expand: { func: this.launchModal, args: [] }
  };

  confirmDiscard({ detail: { isSave } }) {
    if (isSave) {
      this.newRecords = [...this.records];
      this.cellStatusMap = {};
      this.resetFuncs.forEach((o) => {
        o.reset();
        o.called = true;
      });
      this.resetFuncs = this.resetFuncs.filter((o) => !o.called);
      let targetAction = this.actionTypeToFunc[this.currentAction];
      if (targetAction) {
        targetAction.func.apply(this, targetAction.args);
        targetAction.args = [];
      }
      this.resetErrors();
    }
    this.confirmLoseChanges = false;
  }

  requestNewRecordModal() {
    this.currentAction = "new";
    if (this.hasUnsavedChanges) {
      this.confirmLoseChanges = true;
    } else {
      let targetAction = this.actionTypeToFunc[this.currentAction];
      targetAction.func.apply(this, targetAction.args);
    }
  }

  newRecordModal() {
    this.generateNewRecordPromise().then((refresh) => {
      if (refresh) {
        this.requestRefreshedRecords();
      }
    });
  }

  intervalId;
  generateNewRecordPromise() {
    return new Promise((resolve) => {
      this[NavigationMixin.Navigate]({
        type: "standard__objectPage",
        attributes: {
          objectApiName: this.childObjectApiName,
          actionName: "new"
        },
        state: {
          defaultFieldValues: `${this.relationshipField}=${this.recordId}`,
          nooverride: "1",
          // useRecordTypeCheck: "1",
          navigationLocation: "LOOKUP"
        }
      });
      if (this.layoutMode > 1) {
        let originalUrl = window.location.href;
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        this.intervalId = window.setInterval(() => {
          if (window.location.href === originalUrl) {
            resolve(true);
            window.clearInterval(this.intervalId);
          }
        }, 1200);
      } else {
        resolve(false);
      }
    });
  }

  linkNavigate({ detail: { rowId } }) {
    this.currentAction = "view";
    this.actionTypeToFunc.view.args = ["view", rowId];
    if (this.hasUnsavedChanges) {
      this.confirmLoseChanges = true;
    } else {
      let targetAction = this.actionTypeToFunc[this.currentAction];
      targetAction.func.apply(this, targetAction.args);
    }
  }

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
  }

  customSortInfo = null;
  updateColumnSorting(event) {
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
      this.canRequestMore = this.records.length === this.layoutModeLimit;
      t.enableInfiniteLoading = this.canRequestMore;
    });
  }

  get columnSortInfo() {
    if (this.customSortInfo) {
      return this.customSortInfo;
    }

    let sortResponse = this.relatedListInfo.sort[0];
    if (
      sortResponse &&
      this.childFields[sortResponse.column] &&
      this.childFields[sortResponse.column].sortable
    ) {
      return sortResponse;
    }

    return { column: "Name", ascending: true };
  }

  get columnSortDirection() {
    let sortInfo = this.columnSortInfo;
    if (this.relatedListInfo) {
      return sortInfo.ascending ? "asc" : "desc";
    }
    return null;
  }

  get columnSortColumn() {
    let sortInfo = this.columnSortInfo;
    if (this.relatedListInfo) {
      return sortInfo.column;
    }
    return null;
  }

  async deleteChildRecord(childObject) {
    return deleteChildRecord({ childObject });
  }

  //NOTE: this has to delete the record and then refetch all because
  // we have no idea which to record to *add* to the list in replace of the deleted on
  async requestDelete({ detail: { childObject } }) {
    this.loading = true;
    let title = `${childObject.Name} Successfully Deleted`;
    let variant = "success";
    let message = "";
    try {
      await this.deleteChildRecord(childObject);
      await this.requestRefreshedRecords();
    } catch (e) {
      let pageError = e.body.pageErrors ? e.body.pageErrors[0] : null;
      message = pageError ? pageError.message : e.body.message;
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

  refreshRecords() {
    if (this.hasUnsavedChanges) {
      this.currentAction = "refresh";
      this.confirmLoseChanges = true;
    } else {
      this.requestRefreshedRecords();
    }
  }

  // TODO: convert to async function and attempt resue in column sort
  requestRefreshedRecords() {
    this.refreshingTable = true;
    return Promise.all([
      this.getRecordCount(this.buildCountQueryString()),
      this.getChildRecords(this.buildQueryString())
    ]).then(([count, records]) => {
      this.currentOffset = 0;
      this.totalRecordsCount = count;
      this.refreshingTable = false;
      this.records = records;
      this.newRecords = [...this.records];

      this.canRequestMore = records.length === this.layoutModeLimit;
      let table = this.template.querySelector("c-table");
      if (table) {
        table.findElement().scrollTop = 0;
        table.enableInfiniteLoading = this.canRequestMore;
      }
    });
  }

  referenceIconMap = {};
  async connectedCallback() {
    let iconPromises = this.relatedListInfo.columns
      .map(({ fieldApiName, lookupId }) => {
        let normalizedApiName = fieldApiName.includes(".")
          ? lookupId.replace(".", "")
          : fieldApiName;
        let fieldDetail = this.childFields[normalizedApiName] || {};

        let {
          relationshipName,
          referenceToInfos: [ref]
        } = fieldDetail;
        if (relationshipName) {
          if (relationshipName === "Owner") {
            return Promise.resolve({ [normalizedApiName]: "standard:user" });
          }
          return this.fetchIcon(ref.apiName).then((iconName) => {
            return { [normalizedApiName]: iconName };
          });
        }
        return null;
      })
      .filter((p) => !!p);

    let [count, records, iconName, ...referenceIcons] = await Promise.all([
      this.getRecordCount(this.buildCountQueryString()),
      this.getChildRecords(this.buildQueryString()),
      this.fetchIcon(this.childObjectApiName),
      ...iconPromises
    ]);
    this.referenceIconMap = referenceIcons;

    this.tableColumns = this.populateTableColumns(this.relatedListInfo);
    this.totalRecordsCount = count;
    this.iconName = iconName;
    this.records = records;
    this.newRecords = [...this.records];
    this.canRequestMore = this.records.length === this.layoutModeLimit;

    this.loading = false;
  }

  disconnectedCallback() {
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
    }
  }

  getColumnWidth(totalWidth, columnCount, dataType) {
    switch (dataType) {
      case "Address":
      case "ComplexValue":
      case "EncryptedString":
      case "Location":
      case "Base64": {
        return 50;
      }
      case "Currency":
      case "Date":
      case "Int":
      case "DateTime":
      case "Double":
      case "Percent":
      case "Time":
      case "Boolean": {
        return Math.round((totalWidth / columnCount) * 0.75);
      }
      case "Email":
      case "String":
      case "MultiPicklist":
      case "Phone":
      case "Picklist":
      case "Url":
      case "ComboBox": {
        return Math.round(totalWidth / columnCount);
      }
      case "TextArea":
      case "Reference": {
        return Math.round((totalWidth / columnCount) * 1.25);
      }
      default:
        return Math.round(totalWidth / columnCount);
    }
  }
}
