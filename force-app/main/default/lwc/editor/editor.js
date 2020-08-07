import { LightningElement, api, track } from "lwc";
import getIconURL from "@salesforce/apex/IconService.getIconURL";

export default class Editor extends LightningElement {
  @api layoutMode;
  @api isStandalone = false;
  @api recordId;
  @api objectApiName;
  @api relatedListInfo;
  @api childFields;

  @api childRecordTypeInfo;

  @track iconName;

  get isMobileNavigation() {
    return this.layoutMode === 0;
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

  // make not async anymore
  populateListInfo(targetList) {
    return {
      listLabel: this.listLabel,
      childObjectApiName: this.childObjectApiName,
      childRecordTypeInfo: null,
      sortDetails: targetList.sort[0],
      requiredFields: Object.values(this.childFields).filter(
        (f) => f.required && f.createable
      ),
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

  async connectedCallback() {
    this.iconName = await this.fetchIcon();
    window.console.log(this.populateListInfo(this.relatedListInfo));
  }
}
