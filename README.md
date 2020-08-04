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

# Component Layout

## Visualforce Page

VF page iframed in makes REST API call to get page layout information, posts it to the LWC that contains and renders the iframe. This iframe is created for each 'Related List Editor' parent component that is added to the Lightning Page. At this point this doesn't cause concern about an excess of iframes on the page as you simply can't add _that_ many lists to the page. Additionally the VF page uses url params to determine what to pass to the REST API request so each list needs it's own call.

Small screen real estate either flexiPageRegionWidth of 'small' or device being mobile (tablet or phone) will cause the rendering to be a 'tile view' of the records. Limited to X? displayed initially with a 'View all' button that will take you to the larger list. How the larger list is handled on mobile in cases of

## Standalone URL Addressable Component

This acts as its own page for 'View All' with small real estate or mobile. On mobile its still a tile layout but with more records displayed and on desktop it is the 'table inline edit view'.

Thinking about it as a big ass form.

# Security Considerations

- Messages posted from iframed VF page to containing LWC
- Query strings generated for querying the related records
  - This likely shouldn't cause any issues as it's not user generated. However it may be best to still sanitize the strings once they're provided to the Apex class for making the query.
