#!/usr/bin/env node

/**
 * Push plugins to cordovaPlugins array after_plugin_add
 */
var fs = require('fs');
var packageJSON = require('../../package.json');

packageJSON.cordovaPlugins = packageJSON.cordovaPlugins || [];

//Iterate over all installed Cordiva Plugins, and if they are not present
// in the package.json file, then put it there.
process.env.CORDOVA_PLUGINS.split(',').forEach(function (plugin) {
  if(packageJSON.cordovaPlugins.indexOf(plugin) == -1) {
    packageJSON.cordovaPlugins.push(plugin);
  }
});
//Save the packag.json file
fs.writeFileSync('package.json', JSON.stringify(packageJSON, null, 2));
