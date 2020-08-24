import { LightningElement, api } from "lwc";

export default class SlottedModal extends LightningElement {
  @api modalTitle;
  @api saveButtonLabel = "Save";
  @api saveButtonVariant = "brand";
  @api size = "large";
  @api blockSave = false;

  get modalSizingClasses() {
    return `slds-modal slds-fade-in-open slds-modal_${this.size}`;
  }

  cancel() {
    this.close(false);
  }
  save() {
    this.close(true);
  }

  close(isSave) {
    this.dispatchEvent(new CustomEvent("close", { detail: { isSave } }));
  }

  @api getDimensions() {
    let els = [
      this.template.querySelector(".slds-modal__header"),
      this.template.querySelector(".slds-modal__content"),
      this.template.querySelector(".slds-modal__footer")
    ];
    if (!els.includes(null)) {
      let top = els[0].getBoundingClientRect().y;
      let height =
        els[0].clientHeight + els[1].clientHeight + els[2].clientHeight;

      return `height: ${
        height + 4
      }px;top: ${top}px;border-radius: var(--lwc-borderRadiusMedium,0.25rem);`;
    }
    return ``;
  }
}
