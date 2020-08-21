global class EditorPicklistController extends VisualEditor.DynamicPickList {
  String entityName;
  List<Map<String, String>> relatedListOptions;

  global EditorPicklistController(VisualEditor.DesignTimePageContext context) {
    this.entityName = context.entityName;
    this.relatedListOptions = new List<Map<String, String>>();

    SObjectType parentObjectType = Schema.getGlobalDescribe()
      .get(context.entityName);
    DescribeSObjectResult parentObjectDescribe = parentObjectType.getDescribe();
    List<Schema.ChildRelationship> childRelationships = parentObjectDescribe.getChildRelationships();

    for (Schema.ChildRelationship childRelationship : childRelationships) {
      SObjectType childObjectType = childRelationship.getChildSObject();
      DescribeSObjectResult childObjectDescribe = childObjectType.getDescribe();
      if (
        childObjectDescribe.isAccessible() &&
        childObjectDescribe.isCreateable() &&
        childObjectDescribe.name != ''
      ) {
        for (
          Schema.SObjectField fieldObj : childObjectDescribe.fields.getMap()
            .values()
        ) {
          Schema.DescribeFieldResult field = fieldObj.getDescribe();

          if (
            field.isNameField() &&
            field.getType() != Schema.DisplayType.REFERENCE
          ) {
            relatedListOptions.add(
              new Map<String, String>{
                'childPluralLabel' => childObjectDescribe.getLabelPlural(),
                'relationshipFieldLabel' => childRelationship.getField()
                  .getDescribe()
                  .getLabel(),
                'objectName' => childObjectDescribe.getName(),
                'relationshipFieldName' => childRelationship.getField()
                  .getDescribe()
                  .getName()
              }
            );
            break;
          }
        }
      }
    }
  }

  global override VisualEditor.DataRow getDefaultValue() {
    return null;
  }

  global override VisualEditor.DynamicPickListRows getValues() {
    VisualEditor.DynamicPickListRows picklistOptions = new VisualEditor.DynamicPickListRows();
    for (Map<String, String> option : relatedListOptions) {
      String json =
        '{' +
        '"parentObject": ' +
        '"' +
        this.entityName +
        '"' +
        ', "childObject": ' +
        '"' +
        option.get('objectName') +
        '"' +
        ', "relationshipField": ' +
        '"' +
        option.get('relationshipFieldName') +
        '"' +
        ', "childObjectPluralLabel": ' +
        '"' +
        option.get('childPluralLabel') +
        '"' +
        '}';

      String picklistOptionLabel = option.get('childPluralLabel');
      // ' - ' +
      // option.get('relationshipFieldLabel');
      if (picklistOptionLabel != 'Opportunity Product') {
        VisualEditor.DataRow child = new VisualEditor.DataRow(
          picklistOptionLabel,
          json
        );
        picklistOptions.addRow(child);
      }
    }
    return picklistOptions;
  }
}
