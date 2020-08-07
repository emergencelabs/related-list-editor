# Functionality Overview

## Supported Objects & Configuration

### Supported Parent Objects

The supported parent Objects (Object types whose record pages can use the Editor) are going to be all Objects supported by the [User Interface API Developer Guide](https://developer.salesforce.com/docs/atlas.en-us.uiapi.meta/uiapi/ui_api_get_started_supported_objects.htm).

### Supported Child Objects

Supported Child Objects are defined by what Child Objects Salesforce allows for a given Parent Object. The only valid 'Related Lists' will be what is present on the current 'Page Layout' for the Parent Object. This is a subset of the Objects supported by the [User Interface API Developer Guide](https://developer.salesforce.com/docs/atlas.en-us.uiapi.meta/uiapi/ui_api_get_started_supported_objects.htm). !!what is this list??!!

See [Editor Picklist Controller](#Editor-Picklist-Controller) for more information on how we attempt to ensure the user can only choose valid child options. However, since a supported Child Object may not be on the Page Layout the topmost client side Component will display an 'error' state if either an invalid object or a valid object not on the page layout is selected. Note that the only way to determine if a valid or invalid Child Object is on the page layout is to still make the REST API Request for the Describe of the Page Layout.

### Column Configuration

The columns displayed for a given Related List (regardless of display format) are determined by the columns included in the Related List in the Page Layout. !!How are these columns determined by SF??!! The system level information for these columns (readonly, etc) is respected in the client side editor as it is returned as part of the REST API Page Layout Describe.

!!column widths need to be addressed someowhere in the client side docs!!
!!FLA is an item here as well, with regards to respecting it on the client side - as far as I know the REST API call is made as the current User so ideally it will return back the isAccessible, etc info for that given user!!

### List Buttons (Not Supported)

At this point all list buttons are ignored and not supported in the editor.

## Form Factors

### Desktop

- Large real estate = click to edit + option to open in modal
  - view all?
- Small real estate = tile list, view all, open in modal

### Mobile (Phone & Tablet)

- tile view + view all (tile view still)

# Project Scripts

?worth including?

# Namespace & Packaging Org

The registered namespace is `rle` and is linked to our main Emergence SF instance (our dev hub). The packaging org is called 'Related List Editor 2.0' and the username for the user is myles+rle2@emergencelabs.io

# Scratch Org Definitions

## Developer

`developer-scratch-def.json` is the scratch definition file for the Partner Developer edition scratch org. This is used for primary development.

## Professional with Features

`professional-plus-scratch-def.json` is the definition file for a professional edition org for testing compatability. There are a few key features enabled in this file to test for unique combinations:

- ["API", "AuthorApex", "DebugApex", "RecordTypes"]

## Professional without Features

`professional-scratch-def.json` is the definition file for a professional edition org for testing compatability. There are no features here and no API access.

# Professional Edition API Access

[Salesforce Documentation on PE/GE API Access](https://developer.salesforce.com/docs/atlas.en-us.packagingGuide.meta/packagingGuide/dev_packages_api_access.htm). It relies on 'connected app consumer' whitelisting and an API token which can be requested once the app passes security review. This connected app will live in the packaging org.

[Accessing the REST API in Group and Professional Editions](https://developer.salesforce.com/docs/atlas.en-us.packagingGuide.meta/packagingGuide/dev_packages_rest_api_access.htm).
Connected App Details:

- The uncertainty here is how to modify the API call such that it uses the consumer information

The approach taken here is documented in the [Winter '19 Release Notes](https://releasenotes.docs.salesforce.com/en-us/winter19/release-notes/rn_apex_streamline_api_calls.htm?edition=&impact=)

# Group Edition Record Type Considerations

Do we want to support Group/Essentials? If so, we may need to take the 'extension' package approach? Although more research is required.
https://developer.salesforce.com/docs/atlas.en-us.packagingGuide.meta/packagingGuide/dev_packages_ge_pe_scenarios.htm

# Application Components

## Apex Classes

### Editor Picklist Controller

Builds a list of options using the describe of the Object the current Lightning Page is for. First, getting all Child Relationships then filtering them to only children that can be accessed and created, and that have a name. The default value for the options is always set to `null` to ensure the field begins blank. Each option's label is the Child Object's plural label (that way if it's changed in an org it's represented properly) separated by a dash from the Relationship Field. The value of each option is a JSON string with the following keys:

- parentObject (api name)
- childObject (api name)
- relationshipField (api name)
- childObjectPluralLabel

The fact that this is mandatory and how the selection gets input into the LWC component hierarchy is defined in the [LWC - Related List Editor Container](#Related-List-Editor-Container) component definition.

!!include information about whitelisting as a further attempt to reduce the options as well as to ensure certain valid objects that are not supported, either because of lack of UI API support or because not feasible (e.g. Attachments).!!

### VF Page Controller for REST API Access

!!how we do know what api version to use for this and for LWC? can it just be whatever is latest when we release??!!

This is a standard Apex Class used as a VisualForce Page Controller. The only public property on the class is to store the response from the REST API call to allow the VF page to access it. Once available on the VF page it is posted as a message to the parent window, more details found in [Visualforce Page REST Call Embed details](#REST-Call-Embed). Additionally, see [Security Considerations](#Security-Considerations) around message posting. More information on accessing the REST API and associated considerations can be found in [Professional Edition API Access](#Professional-Edition-API-Access). The endpoint accessed is the layout describe page for a given Object. The layout describe endpoint must end with a Record Type Id if the Object in question has Record Types. !!The API Response is different depending on if a Record Type Id is included - which makes me wonder if we should just always include it by of the default record type if there isn't one available!! More details on determining the Record Type Id (or lack thereof) for the current record is provided in [Some LWC Doc?](#replace-me).

There are three variable pieces of information included in the endpoint URL which are passed to the Apex Class by way of URL parameters on the VF Page:

- API Version (parameter: 'v')
- Object Name (parameter: 'n')
- Record Type Id (parameter: 'r')

### Icon Service

A simple class with a singular Aura Enabled method that uses SOQL to query the `Icons` and `TabDefinition` tables to find the appropriate svg url for a given Object API Name. However, the returned value is a List of `TabDefinition` which contains a full SVG URL (as well as some extraneous information). If the list is not empty the SVG URL has to be parsed to produce the proper string lookup format to use the SLDS icon library. !!As it stands right now this parsing is done on the LWC side because it's technically a change in data shape the front end needs and its easier to do in JS, but maybe this should change!! If there is no icon for a given object (which is the case if there's no 'Tab' setup) or !!if there is any issue properly parsing the SVG URL!! then the default fallback Object icon is used.

### Record Type Service

Another simple class with a singular Aura Enabled method that accepts an Object API Name and a Record Id. It uses this information to build up a query string that contains the column 'RecordTypeId'. This query is made treating the results as a generic SObject to ensure all supported Object types work.

The query may be successful but the value of the 'RecordTypeId' field may be blank as it is possible to have Record Types set up but not assigned for each and every record. If the value is `null` then this record's Record Type Id is the default/master Record Type Id. This is found (only if no query exception and the field is null) by describing the Object and looping over all the possible RecordTypeInfo's until the one with the 'Developer Name' of 'Master' is found (this developer name cannot be changed so it is a sound approach, the only way it would need to be changed is if SF changes it at the System level).

If the Object in question does not have Record Types than this throws an `System.QueryException` error which is specifically caught. If caught, the default record type is returned just as described above.

!!It seems as if the master record type id is the same across all objects and all instances???!!

!!there's the possibility that this is better acquired on the LWC side through a OOB @wire method given the considerations outlined in [VF Page Controller for REST API Access](VF-Page-Controller-for-REST-API-Access)!!

### Child Record Service

This Class has 2-3 AuraEnabled methods (TBD based on updating and inserting differentation).

#### Fetching Records

Fortunately generic SObjects and specific SObjects (e.g. Contact) are all returned to the LWC caller as POJOs so retrieving the child records can be executed with a query string returning a list of generic SObjects.

**Query String Details**
The query string is currently being built up on the client side (LWC) and contains the following key parts:

- Columns
  - This is returned as part of the layout details received from the REST API
- Table Name (Child Object API Name)
- Filter Criteria (Relationship Field + Parent Record Id)
- Sort Criteria
  - Optional
  - This is returned as part of the layout details received from the REST API
- Limits
  - !!what is the deal with limits here for display and fetching more? I think it changes based on the context, for example the data table will be infinite scroll and start with more visible than the tile view will!!

For Query String Security Considerations see [Security Considerations](#Security-Considerations). !!what would doing this string build up server side look like? shit?!!

#### Updating Records

The current theory here is that sending POJOs of the updated Objects to the Class can have them simply use the `update` db statement without any need to cast or modify the Object server side.
!!ensuring that fields that are read-only in the column set dont get modified is a client side responsibility but I think for safety a server side check may also be in order - this could also apply to newly created records with FLS shit?!!

#### Inserting Records

TBD.

## Visualforce Page

### API Call Embed

VF page iframed in makes REST API call to get page layout information, posts it to the LWC that contains and renders the iframe. This iframe is created for each 'Related List Editor' parent component that is added to the Lightning Page. At this point this doesn't cause concern about an excess of iframes on the page as you simply can't add _that_ many lists to the page. Additionally the VF page uses url params to determine what to pass to the REST API request so each list needs it's own call.

## Aura Component

### View All List Container (needs better name)

This is the component that is URL addressable and is used for 2 purposes:

- Allowing a button to be added to regular list views to 'edit' in a standalone page without changing the functionality on the Lightning Page for that record
- Viewing All records when on Mobile or Desktop small real estate

It's sole purpose is to be navigable via a URL and depending on certain pieces of info render out the same LWC hierarchy as might exist elsewhere.

On mobile its still a tile layout but with more records displayed and on desktop it is the 'table inline edit view'.

It relies on the Record Id of the target record as well as !!a maybe changing amount of information about the list depending on which LWC it renders!!
!!what is the deal with limits here for display and fetching more?!!
!!also wtf is going on with the navigation issues here as well as the 'new' button issue??!!

## Lightning Web Components

### Related List Editor Container

(likely going to be named 'Related List Editor'). This is where all the XML configuration lives specifying the form factors, establishing the relationship to the picklist controller, etc.

Small screen real estate either flexiPageRegionWidth of 'small' or device being mobile (tablet or phone) will cause the rendering to be a 'tile view' of the records. Limited to X? displayed initially with a 'View all' button that will take you to the larger list. How the larger list is handled on mobile in cases of

**Error States**

1. Bad list selection or unavailable on Page Layout or List Parse Error
2. Suggest new browser usage or cookie clearing?

!! should likely use a custom error boundary in combination with a custom render method to match up error codes with error renders - we can then somehow log these errors so we can keep track of them!!

**Component Configuration**

    <targets>
            <target>lightning__RecordPage</target>
      </targets>
      <targetConfigs>
          <targetConfig targets="lightning__RecordPage">
              <property label="Related List" name="listSelection" type="String" datasource="apex://editorPicklistValues" />
              <supportedFormFactors>
                  <supportedFormFactor type="Large" />
                  <supportedFormFactor type="Small" />
              </supportedFormFactors>
          </targetConfig>
      </targetConfigs>

**Lightning Page Picklist Selection Handling**
For more details on the options and production of the JSON string see [Editor Picklist Controller](#Editor-Picklist-Controller). Errors caught here render error state #1.

**VisualForce Page URL Generation**
Using the `window.location.origin` to parse out the 'My Domain' value along with standard VF Page URL structure to build up a dynamic URL for a given org.

!!this I believe is the same approach used in the 'Success Desk' implementation which we have seen used without issues so I believe it's relatively battle tested but not 100%!!
!!theres also I think a concern here that needs to be error handlewd that was highlighted with success desk and iframe rendering issues with cookies or something, it was a Cupanion user that experienced it!!

Errors caught here render error state #2.

**Child Object Info**
Acquired using the OOB @wire of 'getObjectInfo' with the Child Object API Name. Within the returned `data` there is a `fields` array of all fields and associated details for the Child Object.

!!need to consider this message posting race condition with childObjectInfo wire - likely going to be that the parent component gets the posted message and gives it to a child which wires up the childObjectInfo as its not needed in any case where theres a list error - although fetching these sequentially as opposed to concurrently is not great for load times!!

**Page Layout Desribe API Response Parsing**
When the component is mounted it attaches an event listener to the window to listen for the message from the iframed in VF page. The message is passed a JSON string so parsing (and error handling) is required.

Example responses for both with and without record types can be found in `/api-response-examples/`

!!the response contains a 'limitRows' value for each related list so we may want to use this? although maybe not!!

1. The target related list needs to be found in the Array at the 'relatedLists' key and this can be done by comparing each list entry's 'sobject' and 'field' keys to the Child Object API name and the Relationship Field.
2. Extracted from the target related list:
   - sortDetails : Object
     - Keys for 'column' : String (Field API Name) and 'ascending' : Boolean
   - columns : Array<Object>
     - This determines the columns that will be rendered out for each child record and the field API name is used to lookup the field details from the Child Object Info.
     - If the column is for a lookup/reference field then a normalization of the api name needs to occur if its an OOB lookup/reference. User created reference fields follow standard naming conventions and will match properly in the lookup.
       - This is done by a check of if the field API name contains a '.' and removing it.

**???**
There are two categories of data that are used throughout the component hierarchy:

- From API
  - sortDetails : Object
  - columns : Array<Object>
- From Component
  - label : String
    - The label to displayed on the component for the Child Object. This is the plural label of the Child Object.
  - object : String
    - The API Name of the Child Object.
  - relationshipField : String
    - The API Name of the relationship field between Parent and Child Object.
  - recordTypeId : String
    - The Child Object record Type Id? !!what is this used for? creating?!!
    - !!begs a good question about child record type creation issues!!
  - requiredFields : Array<Object>
    - The child object info includes the list of all child object fields and this is a filtered list of all fields that are 'required' and 'creatable'. The assumption is that if a field is 'required' but not 'creatable' then it is a system-level field.
  - iconName : String
    - A string matching the format expected by the `lightning-icon` base component
    - Discussed in [Component Ref?](#replace-me) and [Icon Service](#Icon-Service)

See [Security Considerations](#Security-Considerations) for considerations around message posting.

**Layout Info**
import FORM_FACTOR from "@salesforce/client/formFactor";

- Large — A desktop client.
- Medium — A tablet client.
- Small — A phone client.

@api flexipageRegionWidth;

- SMALL
- MEDIUM
- LARGE

### ???

the form factor can be found anywhere but the page region width is only given to the topmost component in the
hierarchy and passing it down all the levels kind of sucks but

# Security Considerations

- Messages posted from iframed VF page to containing LWC
- Query strings generated for querying the related records
  - This likely shouldn't cause any issues as it's not user generated. However it may be best to still sanitize the strings once they're provided to the Apex class for making the query.
- Field level and object level security
  - https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_classes_with_security_enforced.htm?search_text=System.QueryException
- User Permission considerations? Will someone's ability to 'Edit' a lightning page be what we can entirely piggy back on? That plus the fact that all columns, etc are controlled by regular page layout functionality?
