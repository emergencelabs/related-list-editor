({
  onPageReferenceChange: function (cmp, evt, helper) {
    let pageReference = cmp.get("v.pageReference");
    let recordId = pageReference.state.c__recordId;
    cmp.set("v.recordId", recordId);
    let childObject = pageReference.state.c__childObject;
    cmp.set("v.childObject", childObject);
    let parentObject = pageReference.state.c__parentObject;
    cmp.set("v.parentObject", parentObject);
    let relationshipField = pageReference.state.c__relationshipField;
    cmp.set("v.relationshipField", relationshipField);
    cmp.set("v.listSelection", {
      parentObject,
      childObject,
      relationshipField
    });

    window.console.log($A.get("$Browser.formFactor"));
    if ($A.get("$Browser.formFactor") === "DESKTOP") {
      cmp.set("v.showBackButton", true);
    } else {
      cmp.set("v.showBackButton", false);
    }
  },
  reInit: function (cmp, event, helper) {
    $A.get("e.force:refreshView").fire();
  },
  backToRecord: function (cmp, event) {
    window.console.log("navigating!!!");
    let navEvt = $A.get("e.force:navigateToSObject");
    navEvt.setParams({
      recordId: cmp.get("v.recordId")
    });
    window.console.log("rec id!!!", cmp.get("v.recordId"));
    navEvt.fire();
  }
});
