import { LightningElement, api } from "lwc";
import formattedTileValue from "./formattedTileValue.html";
import formattedDateTime from "./formattedDateTime.html";
import formattedEmail from "./formattedEmail.html";
import formattedNumber from "./formattedNumber.html";
import formattedPhone from "./formattedPhone.html";
import formattedTime from "./formattedTime.html";
import formattedUrl from "./formattedUrl.html";

export default class FormattedTileValue extends LightningElement {
  @api fieldType;
  @api value;

  details = {};

  render() {
    switch (this.fieldType) {
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
        return formattedNumber;
      }
      case "Email": {
        return formattedEmail;
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
}
