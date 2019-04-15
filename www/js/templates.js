angular.module("templates", []).run(["$templateCache", function($templateCache) {$templateCache.put("event.html","<ion-view class=\"feed-entries-view\">\n  <ion-nav-title>\n    <span>{{event.title}}</span>\n  </ion-nav-title>\n  <ion-content>\n    <!-- Refresh to get the new posts -->\n    <ion-refresher pulling-text=\"Pull to refresh...\" on-refresh=\"doRefresh()\">\n    </ion-refresher>\n\n    <div class=\"entries-list\">\n      <!--<div ng-repeat=\"entry in feed.entries\" class=\"list card entry-item\">\n        <div class=\"entry-heading item item-text-wrap\">\n          <h2 class=\"entry-title\" ng-bind-html=\"entry.title | rawHtml\"></h2>\n          <p class=\"entry-author\">\n            Published <span am-time-ago=\"entry.publishedDate\"></span>\n          </p>\n        </div>\n        <div class=\"entry-content item item-text-wrap\">\n          <p class=\"entry-excerpt\" ng-bind-html=\"entry.contentSnippet | rawHtml\"></p>\n          <div class=\"entry-actions row\">\n            <div class=\"actions col col-center col-66\">\n              <a class=\"button button-icon icon ion-bookmark\" ng-click=\"bookmarkPost(entry)\"></a>\n            </div>\n            <div class=\"read-more col col-center col-33\">\n              <a class=\"button button-small button-block button-assertive\" href=\"#\" ng-click=\"readMore(entry.link)\">\n                Read more\n              </a>\n            </div>\n          </div>\n        </div>\n      </div>-->\n    </div>\n  </ion-content>\n</ion-view>\n");
$templateCache.put("events.html","<ion-view class=\"category-feeds-view\">\n    <ion-nav-title>\n        <span>{{categoryTitle}}</span>\n    </ion-nav-title>\n    <ion-content>\n        <div class=\"list category-feeds\">\n            <a ng-repeat=\"event in eventsList\" class=\"item item-icon-right\" ui-sref=\"app.event({categoryId: categoryId, eventId: event.id})\">\n                <img class=\"thumbnail\" ng-src=\"{{event.icon}}\"/>\n                <div>\n                  <span class=\"title\">{{event.title}}</span>\n                  <p class=\"description\">{{event.shortDescription}}</p>\n                  <p class=\"info\">{{event.startDate}}, {{event.startTime}} @ {{event.venue.name}}, {{event.venue.city}}</p>\n                </div>\n                <i class=\"icon ion-arrow-right-b\"></i>\n            </a>\n        </div>\n    </ion-content>\n</ion-view>\n");
$templateCache.put("home.html","<ion-view class=\"feeds-categories-view\">\n  <ion-nav-buttons side=\"left\">\n    <button menu-toggle=\"left\" class=\"button button-icon icon ion-navicon\"></button>\n  </ion-nav-buttons>\n  <ion-nav-title>\n    <span>CaravaNNext Events</span>\n  </ion-nav-title>\n  <ion-content>\n    <div class=\"row categories-list\">\n      <div ng-repeat=\"category in allEvents\" class=\"col col-50\">\n        <a class=\"feed-category\" ui-sref=\"app.events({categoryId: category.id})\">\n          <img class=\"category-image\" ng-src=\"{{category.image}}\"/>\n          <div class=\"category-bg\"></div>\n          <span class=\"category-title\">{{category.title}}</span>\n        </a>\n      </div>\n    </div>\n  </ion-content>\n</ion-view>\n");
$templateCache.put("side-menu.html","<ion-side-menus enable-menu-with-back-views=\"false\">\n    <ion-side-menu-content class=\"post-size-14px\">\n        <ion-nav-bar class=\"bar app-top-bar\">\n            <ion-nav-back-button>\n            </ion-nav-back-button>\n            <ion-nav-buttons side=\"left\">\n                <button class=\"button button-icon button-clear ion-navicon\" menu-toggle=\"left\">\n                </button>\n            </ion-nav-buttons>\n        </ion-nav-bar>\n        <ion-nav-view name=\"mainApplication\"></ion-nav-view>\n    </ion-side-menu-content>\n\n    <ion-side-menu side=\"left\" class=\"main-menu\" expose-aside-when=\"large\">\n        <ion-content>\n            <ion-list>\n                <ion-item class=\"heading-item item item-avatar\" nav-clear menu-close ui-sref=\"app.profile\">\n                    <img ng-src=\"https://s3.amazonaws.com/uifaces/faces/twitter/brynn/128.jpg\">\n                    <h2 class=\"greeting\">Hi Brynn</h2>\n                    <p class=\"message\">Welcome back</p>\n                </ion-item>\n                <ion-item class=\"item-icon-left\" nav-clear menu-close ui-sref=\"app.bookmarks\">\n                    <i class=\"icon ion-bookmark\"></i>\n                    <h2 class=\"menu-text\">Saved for later</h2>\n                </ion-item>\n                <ion-item class=\"item-icon-left\" nav-clear menu-close ui-sref=\"app.feeds-categories\">\n                    <i class=\"icon ion-radio-waves\"></i>\n                    <h2 class=\"menu-text\">Feeds</h2>\n                </ion-item>\n                <ion-item class=\"item-icon-left\" nav-clear menu-close ui-sref=\"app.wordpress\">\n                    <i class=\"icon ion-social-wordpress\"></i>\n                    <h2 class=\"menu-text\">Wordpress</h2>\n                </ion-item>\n                <ion-item class=\"item-icon-left\" nav-clear menu-close ui-sref=\"app.layouts\">\n                    <i class=\"icon ion-wand\"></i>\n                    <h2 class=\"menu-text\">Layouts</h2>\n                </ion-item>\n                <ion-item class=\"item-icon-left\" nav-clear menu-close ui-sref=\"app.miscellaneous\">\n                    <i class=\"icon ion-asterisk\"></i>\n                    <h2 class=\"menu-text\">Miscellaneous</h2>\n                </ion-item>\n                <ion-item class=\"item-icon-left\" nav-clear menu-close ui-sref=\"app.forms\">\n                    <i class=\"icon ion-document\"></i>\n                    <h2 class=\"menu-text\">Forms</h2>\n                </ion-item>\n                <ion-item class=\"item-icon-left\" nav-clear menu-close ui-sref=\"app.settings\">\n                    <i class=\"icon ion-gear-a\"></i>\n                    <h2 class=\"menu-text\">Settings</h2>\n                </ion-item>\n\n            </ion-list>\n        </ion-content>\n    </ion-side-menu>\n</ion-side-menus>\n");}]);