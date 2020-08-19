@isTest
public with sharing class EditorPicklistControllerTest {
  @IsTest
  static void itGeneratesPicklistValues() {
    VisualEditor.DesignTimePageContext context = new VisualEditor.DesignTimePageContext();
    context.entityName = 'Account';
    EditorPicklistController controller = new EditorPicklistController(context);
    System.assert(controller.getDefaultValue() == null);
    System.assert(controller.getValues() != null);
  }
}
