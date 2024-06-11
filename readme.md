
# Cb Voter Widget

A widget for external teams to use to show a sample Voter Widget that redirects to voter .org

## How to setup and generate build files.

Use Node 18+

Run "npm install" to install node modules

Use "npm run build" to generate the build files. This will generate a file called cb-vote-widget.js located in /docs of the project.

This file will be is how the widget will be accessed as a web component.

We will also consider the ability to have the widget exported as an html-tag under id as well.


## How to setup the widget on your own site.

Grab the cb-vote-widget.js from out hosted location or put it with your local files.

In your index.html or jsx file, include
<cb-vote partnerid="PARTNERID" campaigncode="CAMPAIGNCODE"> </cb-vote> in the location you will want to show the widget.

You will also need to include the script under the scripts tags such as <script src="./cb-vote-widget.js"> </script>

See the sample index.html under /docs for an example file.

### Parameters

- partnerid: Optional. The partner id that will be used to track the partner that is using the widget. However, this is need to be able to track the data that is being sent to the voter.org site and is highly recommended.
- campaigncode: Optional. Campaign code provided if any to track the campaign that is being run.