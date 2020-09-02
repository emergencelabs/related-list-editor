import { LightningElement, api } from "lwc";
import formattedTileValue from "./formattedTileValue.html";
import formattedDateTime from "./formattedDateTime.html";
import formattedEmail from "./formattedEmail.html";
import formattedNumber from "./formattedNumber.html";
import formattedPhone from "./formattedPhone.html";
import formattedTime from "./formattedTime.html";
import formattedUrl from "./formattedUrl.html";
import formattedBoolean from "./formattedBoolean.html";
import formattedTextArea from "./formattedTextArea.html";

export default class FormattedTileValue extends LightningElement {
  @api fieldType;
  @api value;
  @api isRichText = false;
  @api precision;
  @api scale;

  details = {};

  render() {
    switch (this.fieldType) {
      case "Boolean": {
        this.details.options = [{ label: "", value: "a" }];
        this.details.value = this.value ? ["a"] : [];
        this.details.name = Math.round(Math.random() * 100);
        return formattedBoolean;
      }
      case "Date":
      case "DateTime": {
        return formattedDateTime;
      }

      case "Currency": {
        this.details.format = "currency";
        return formattedNumber;
      }
      case "Double":
      case "Int": {
        this.details.format = "decimal";
        this.details.precision = this.precision;
        this.details.scale = this.scale;
        return formattedNumber;
      }
      case "Email": {
        return formattedEmail;
      }
      case "TextArea": {
        return formattedTextArea;
      }
      case "Phone": {
        return formattedPhone;
      }
      case "Time": {
        return formattedTime;
      }
      case "Url": {
        return formattedUrl;
      }
      default:
        return formattedTileValue;
    }
  }
  connectedCallback() {
    this.details.isRichText = this.isRichText;
  }
}
