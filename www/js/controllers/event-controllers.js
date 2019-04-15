/**
 * Created by Nektarios Gioldasis on 18/1/2016.
 */

(function () {
    'use strict';

    /*global angular */
    angular.module('cnextApp.eventControllers', ['cnextApp.eventServices', 'cnextApp.userServices', 'cnextApp.constants', 'cnextApp.systemServices'])

        .controller('EventFilteringCtlr', ['$scope', '$state', '$rootScope', '$http', 'CONST', '$localStorage', 'EventsService', 'CatsService', '$ionicLoading', '$timeout', 'events', 'cats', '$ionicPopover',
            function ($scope, $state, $rootScope, $http, CONST, $localStorage, EventsService, CatsService, $ionicLoading, $timeout, events, cats, $ionicPopover) {
                $scope.eventsService = EventsService;
                var settings = $localStorage.getObjectDefault(CONST.APP_SETTINGS_KEY,CONST.DEFAULT_APP_SETTINGS);
                $scope.filterOptions = {
                    timeFilters: [CONST.TIME_FILTERS.ALL, CONST.TIME_FILTERS.TODAY, CONST.TIME_FILTERS.UPCOMING, CONST.TIME_FILTERS.PAST],
                    browseFilters: [{value: 'category', label: 'BY_CATEGORY'}]
                };
                $scope.showGroupFilters = settings.enableGroupFilters || false;
                $scope.showOnlyTopLevelEvents = settings.showOnlyTopLevelEvents;

                var placeFilter = CONST.PLACE_FILTERS[CONST.DEFAULT_PLACE_FILTER];
                $scope.filterOptions.browseFilters.push(placeFilter);

                $scope.initFilters = function () {
                    $scope.activeFilters = {
                        timeFilter: settings.timeFilter,
                        browseFilter: {
                            value: $scope.filterOptions.browseFilters[1].value,
                            label: $scope.filterOptions.browseFilters[1].label
                        }
                    };
                };
                $scope.initFilters();


                $scope.initData = function () {
                    $scope.allEvents = [];
                    $scope.categories = [];
                    if ($scope.showOnlyTopLevelEvents) {
                        $scope.allEvents = _.filter(events, function (evt) {
                            return evt.parentEventId === '';
                        });
                    } else {
                        angular.copy(events, $scope.allEvents);
                    }
                    angular.copy(cats, $scope.categories);
                    $scope.filteredEvents = [];
                    $scope.places = [];
                };


                /*CatsService.getCategories().then(function(cats){
                 $scope.categories=cats;
                 });*/

                $scope.applyTimeFilter = function () {
                    $scope.initData();
                    $scope.filteredEvents = EventsService.filterEventsByTime($scope.allEvents, $scope.activeFilters.timeFilter.id);
                };


                $scope.calculateOptions = function () {
                    if ($scope.showGroupFilters) {
                        if ($scope.activeFilters.browseFilter.value === 'category') {
                            angular.forEach($scope.filteredEvents, function (evt) {
                                console.log('Working with Event' + evt.id);
                                angular.forEach(evt.categories, function (catId) {
                                    console.log(evt.id + ':' + catId);
                                    var cat = _.findWhere($scope.categories, {id: catId});
                                    if (cat) {
                                        if (cat.events) {
                                            cat.events++;
                                        } else {
                                            cat.events = 1;

                                        }
                                    }
                                });
                            });
                        } else { //byPlace filter is applied
                            angular.forEach($scope.filteredEvents, function (evt) {
                                var placeName = evt.venue[placeFilter.value];
                                var place = _.findWhere($scope.places, {place: placeName});
                                if (place) {
                                    place.events++;
                                } else {
                                    $scope.places.push({place: placeName, events: 1});
                                }
                            });
                        }
                    } else { // show event groups
                        $scope.topLevelEvents = [];
                        if (!$scope.showOnlyTopLevelEvents) {
                            $scope.topLevelEvents = [];
                            var evtHierarchy = EventsService.getEventsHierarchy();
                            var inList={};
                            angular.forEach($scope.filteredEvents,function (evt){
                              if (evt.parentEventId==='' && !inList[evt.id]) {
                                $scope.topLevelEvents.push(evtHierarchy[evt.id]);
                                inList[evt.id] = true;
                                console.log('Top Level event ' +  evt.id + " put in the list while checking " + evt.id);
                              }else if(!inList[evt.parentEventId]){
                                $scope.topLevelEvents.push(evtHierarchy[evt.parentEventId]);
                                inList[evt.parentEventId]=true;
                                console.log('Top Level event ' +  evt.parentEventId + " put in the list while checking " + evt.id);
                              }
                            });

                        } else {
                            $scope.topLevelEvents = [];
                            angular.copy($scope.filteredEvents, $scope.topLevelEvents);
                            angular.forEach($scope.topLevelEvents, function (topLevelEvent) {
                                topLevelEvent.subEvents = [];
                            });
                        }
                    }
                };

                $scope.setFilter = function (filter, filterType) {
                    if (filterType === 'time') {
                        $scope.activeFilters.timeFilter = filter;
                        console.log('TimeFilter set to:');
                        console.log($scope.activeFilters.timeFilter);
                    } else if (filterType === 'browse') {
                        $scope.activeFilters.browseFilter = filter;
                        console.log('BrowseFilter set to:');
                        console.log($scope.activeFilters.browseFilter);
                    }
                    $scope.applyFilters();
                    $scope.timeFilterMenu.hide();
                    $scope.browseFilterMenu.hide();
                };

                $scope.applyFilters = function () {
                    $scope.applyTimeFilter();
                    $scope.calculateOptions();
                };

                $ionicPopover.fromTemplateUrl('templates/partials/timeFilter-menu.html', {
                    scope: $scope
                }).then(function (popover) {
                    $scope.timeFilterMenu = popover;
                });

                $ionicPopover.fromTemplateUrl('templates/partials/groupBy-menu.html', {
                    scope: $scope
                }).then(function (popover) {
                    $scope.browseFilterMenu = popover;
                });


                $scope.$on('$ionicView.afterEnter', function () {
                    var elms = document.getElementsByClassName("title title-center header-item");
                    for (var i = 0; i < elms.length; i++) {
                        elms[i].style.left = "50px";
                        elms[i].style.right = "70px";
                    }
                    console.log('After Enter TimeFilter Value:');
                    console.log($scope.activeFilters.timeFilter);
                    $scope.initFilters();
                    $scope.applyFilters();

                    $rootScope.$broadcast('loading:hide');

                });

                $scope.toggleGroup = function (group) {
                    group.show = !group.show;
                    console.log('toggled');
                };
                $scope.isGroupShown = function (group) {
                    return group? group.show : false;
                };

                $scope.showEvent = function (eventId) {
                    $state.go('app.event', {eventId: eventId});
                };

                /*NOT USED
                Function to order events based on the "distance" from now. Distance from now to their startTime*/
                $scope.timeFromNow = function(event){
                  var now =moment.tz();
                  var evtStart = EventsService.getEventDateTime(event,'start');
                  var evtEnd = EventsService.getEventDateTime(event,'end');
                  var now2EventStart = (now.isBetween(evtStart,evtEnd))? 0: moment.duration(now.diff(evtStart)).asHours();
                  return Math.abs(now2EventStart);
              }

            }])

        .controller('EventsListCtlr', ['$scope', '$rootScope', '$localStorage', '$http', '$state', '$stateParams', 'EventsService', 'CatsService', 'eventsList', 'CONST', function ($scope, $rootScope, $localStorage, $http, $state, $stateParams, EventsService, CatsService, eventsList, CONST) {
            $scope.eventsList = [];
            $scope.eventsService = EventsService;

            $scope.timeFilter = $stateParams.timeFilter;

            angular.copy(eventsList, $scope.eventsList);

            $scope.init = function () {
                $scope.title = ($stateParams.filterType === 'category') ? CatsService.getCategory($stateParams.filterValue).title : $stateParams.filterValue;
                $scope.showOnlyTopLevelEvents = CONST.SHOW_ONLY_TOP_LEVEL_EVENTS;
                var browseSettings = $localStorage.getObjectDefault(CONST.APP_SETTINGS_KEY,{});

                if (browseSettings.showOnlyTopLevelEvents !== undefined) {
                    $scope.showOnlyTopLevelEvents = browseSettings.showOnlyTopLevelEvents;
                }

                var groupedByEvents = _.groupBy($scope.eventsList, function (event) {
                    var parentId = event.parentEventId;
                    if (parentId === '') {
                        return 'topLevel';
                    } else if (!_.findWhere($scope.eventsList, {id: parseInt(parentId)})) {
                        return 'topLevel';
                    } else {
                        return event.parentEventId;
                    }
                });
                if ($scope.showOnlyTopLevelEvents) {
                    angular.forEach(groupedByEvents.topLevel, function (topLevelEvent) {
                        topLevelEvent.subEvents = [];
                        $scope.categoryTopLevelEvents.push(topLevelEvent);
                    });
                } else {
                    angular.forEach(groupedByEvents.topLevel, function (topLevelEvent) {
                        topLevelEvent.show = false;
                        if (groupedByEvents[topLevelEvent.id]) {
                            topLevelEvent.subEvents = groupedByEvents[topLevelEvent.id];
                        } else {
                            topLevelEvent.subEvents = [];
                        }
                        $scope.categoryTopLevelEvents.push(topLevelEvent);
                    });
                }
                ;
                console.log($scope.categoryTopLevelEvents);
            };

            $scope.$on('$ionicView.beforeEnter', function () {
                $scope.categoryTopLevelEvents = [];
                $scope.init();
            });

            $scope.showEvent = function (eventId) {
                $state.go('app.event', {eventId: eventId});
            };

            $scope.$on('$ionicView.afterEnter', function () {
                var elms = document.getElementsByClassName("title title-center header-item");
                for (var i = 0; i < elms.length; i++) {
                    elms[i].style.left = "50px";
                    elms[i].style.right = "70px";
                }

                $rootScope.$broadcast('loading:hide');
            });

            $scope.toggleGroup = function (group) {
                group.show = !group.show;
                console.log('toggled');
            };
            $scope.isGroupShown = function (group) {
                return group.show;
            };

        }])

        .controller('EventCtlr', ['$scope', '$rootScope', '$http', '$state','$filter', '$stateParams', '$translate', 'InfoService', 'UsersService', 'PushService', 'FeedService',
            'EventsService', 'PostsService', 'CommentsService', '$localStorage', '$ionicModal', '$ionicPopover', '$ionicLoading', '$ionicActionSheet', '$ionicPopup', '$timeout', 'CONST', 'event', 'cats', 'dataUtils', 'moment', 'TIMEZONES','$location','$anchorScroll','$ionicScrollDelegate',
            function ($scope, $rootScope, $http, $state,$filter, $stateParams, $translate, InfoService, UsersService, PushService, FeedService, EventsService, PostsService, CommentsService, $localStorage, $ionicModal, $ionicPopover, $ionicLoading, $ionicActionSheet,
                      $ionicPopup, $timeout, CONST, event, cats, dataUtils, moment, TIMEZONES,$location,$anchorScroll,$ionicScrollDelegate) {

                $scope.CONST = CONST; // bind CONST to local scope because it is referenced on HTML expressions...
                $scope.evtService = EventsService;

                $scope.moreKey = $translate.instant('MORE');
                $scope.lessKey = $translate.instant('LESS');
                $scope.data = {
                    event: event,
                    subEvents: [],
                    subEventsByDay:{},
                    categories: cats,
                    isEventInCal: false,
                    timeFilters: [
                        {id: 1, label: 'TODAY_SUB_EVENTS'},
                        {id: 0, label: 'ALL_SUB_EVENTS'},
                        {id: 2, label: 'UPCOMING_SUB_EVENTS'},
                        {id: 3, label: 'PAST_SUB_EVENTS'},
                    ],
                    activeTimeFilter: 0,
                    activeTimeLabel: '',
                    activeCategoryFilter: 0,
                    activeCategoryLabel: ''
                };
                angular.copy($scope.data.event.subEvents, $scope.data.subEvents);

                /*$scope.calculateProgrammeDays = function(){
                  $scope.data.subEventsByDay={};
                    angular.forEach($scope.data.subEvents,function (subEvt) {
                      var day = EventsService.getFormattedEventDateTime(subEvt,'start','MMMM DD');
                      if ($scope.data.subEventsByDay[day]){
                        $scope.data.subEventsByDay[day].push(subEvt);
                      }else{
                        $scope.data.subEventsByDay[day]=[];
                        $scope.data.subEventsByDay[day].push(subEvt);
                      }
                    });
                    console.log ('SubEvents Day by Day:')
                    console.log ($scope.data.subEventsByDay);
                };*/

                $scope.calculateProgrammeDays = function(){
                  $scope.data.subEventsByDay=$scope.data.subEvents.reduce(function(map, subEvt) {
                    //var day = EventsService.getFormattedEventDateTime(subEvt,'start','MMMM DD');
                    var day = subEvt.startDate;
                    map[day] = map[day]? map[day]: [];
                    map[day].push(subEvt);
                    return map;
                  }, {});
                  console.log ('SubEvents Day by Day:')
                  console.log ($scope.data.subEventsByDay);
                };


                $scope.toggleDay = function(day) {
                  if ($scope.isDayShown(day)) {
                    $scope.shownDay = null;
                  } else {
                    $scope.shownDay = day;
                  }
                };
                $scope.isDayShown = function(day) {
                  return $scope.shownDay === day;
                };

                $scope.calculateCategoryFilters = function () {
                    $scope.data.subEventCategories = [];
                    var subEventCategoryIds = [];
                    angular.forEach($scope.data.event.subEvents, function (event) {
                        subEventCategoryIds = dataUtils.arrayUnion(subEventCategoryIds, event.categories, function (v1, v2) {
                            return v1 === v2;
                        });
                    });
                    $scope.data.subEventCategories = _.filter($scope.data.categories, function (cat) {
                        return subEventCategoryIds.indexOf(cat.id) >= 0;
                    });
                };

                $scope.showFilterMenu = function () {
                    $scope.calculateCategoryFilters();
                    $ionicModal.fromTemplateUrl('templates/partials/subEvent-filtering-menu.html', {
                        scope: $scope,
                        animation: 'slide-in-up'
                    }).then(function (modal) {
                        $scope.filterMenu = modal;
                        $scope.filterMenu.show();
                    });
                };

                $scope.closeFilterMenu = function () {
                    if ($scope.filterMenu) {
                        $scope.filterMenu.remove();
                    }
                };

                $scope.setCategoryFilter = function (cat) {
                    $scope.data.activeCategoryFilter = cat.id;
                    $scope.data.activeCategoryLabel = cat.title;
                };

                $scope.applyCategoryFilter = function () {
                    if ($scope.data.activeCategoryFilter !== 0) {
                        $scope.data.subEvents = _.filter($scope.data.subEvents, function (evt) {
                            return evt.categories.indexOf($scope.data.activeCategoryFilter) >= 0;
                        });
                    }
                };

                $scope.getCompiledHtmlDescription = function () {
                  var filtered = $filter('embed')($scope.data.event.description,{link:true, linkTarget:'_blank'});
                  var unescaped = _.unescape(filtered);
                  return unescaped
                };

                $scope.setTimeFilter = function (filter) {
                    $scope.data.activeTimeFilter = filter.id;
                    $scope.data.activeTimeLabel = $translate.instant(filter.label);
                    console.log($scope.data.activeTimeLabel);
                };

                $scope.applyTimeFilter = function () {
                    if ($scope.data.activeTimeFilter === 0) { //All Events
                        angular.copy($scope.data.event.subEvents, $scope.data.subEvents);
                    } else {
                        var now = new Date();
                        if ($scope.data.activeTimeFilter === 1) { // Today Events
                            //Today Events are the events that start today or in the future
                            $scope.data.subEvents = _.filter($scope.data.event.subEvents, function (evt) {
                                var country = evt.venue.country.split(' ').join('_');
                                var evtStartDate = moment.tz(evt.startDate, TIMEZONES[country]);
                                var result = evtStartDate.isSame(now, 'day');
                                return result;
                            });
                        } else if ($scope.data.activeTimeFilter === 2) { //upcoming
                            //Upcoming Events are the events that start today or in the future
                            $scope.data.subEvents = _.filter($scope.data.event.subEvents, function (evt) {
                                //return moment(now).isSameOrBefore(evt.startDate,'day');
                                var country = evt.venue.country;
                                var evtStartDate = moment.tz(evt.startDate, TIMEZONES[country]);
                                var result = evtStartDate.isSameOrAfter(now, 'day');
                                return result;
                            });
                        } else {// past
                            //Past Events are the events that have ended before the current day
                            $scope.data.subEvents = _.filter($scope.data.event.subEvents, function (evt) {
                                //return moment(now).isAfter(evt.startDate,'day');
                                var country = evt.venue.country;
                                var evtEndDate = moment.tz(evt.endDate, TIMEZONES[country]);
                                var result = evtEndDate.isBefore(now, 'day');
                                return result;
                            });
                        }
                    }
                };

                $scope.applyFilters = function () {
                    $scope.closeFilterMenu();
                    $scope.applyTimeFilter();
                    console.log('Filtered Sub Events By time: ' + $scope.data.activeTimeFilter);
                    console.log($scope.data.subEvents);
                    $scope.applyCategoryFilter();
                    $scope.calculateProgrammeDays();
                    console.log('Filtered Sub Events By Category: ' + $scope.data.activeCategoryFilter);
                    console.log($scope.data.subEvents);
                }

                $scope.$on('$ionicView.afterEnter', function () {
                    var elms = document.getElementsByClassName("title title-center header-item");
                    for (var i = 0; i < elms.length; i++) {
                        elms[i].style.left = "50px";
                        elms[i].style.right = "70px";
                    }
                  $rootScope.$broadcast('loading:hide');
                    $scope.calculateProgrammeDays();
                    $scope.calculateCategoryFilters();
                });

                var cUserId = ($scope.user)? $scope.user.id : 0;
                var cUserIssuer = (cUserId > 0) ? $scope.user.issuer : '';

                $scope.fs = FeedService;

                $scope.feed = $scope.fs.initFeed($scope);
                $scope.feed.configure({eventId: $scope.data.event.id},cUserId,cUserIssuer);

                $scope.PostsService = PostsService;

                $scope.feed.cfg.ntfAction = $stateParams.ntfAction || undefined;
                if ($scope.feed.cfg.ntfAction) {
                    $scope.feed.cfg.ntfKey = $stateParams.ntfKey || '';
                    $scope.feed.cfg.ntfHashTag = $stateParams.ntfHashTag || '';
                }
                $scope.onDevice = InfoService.is(CONST.ON_DEVICE);

                $scope.doRefresh = function () {
                    /*$ionicLoading.show(CONST.LOADER_CFG);*/
                    EventsService.reload().then(function () {
                        $scope.data.event = EventsService.getEvent($scope.data.event.id);
                        console.log('Event Data reloaded');
                        PostsService.reload().then(function () {
                          $scope.$broadcast('scroll.refreshComplete');
                          $scope.feed = $scope.fs.initFeed($scope);
                          $scope.feed.configure({eventId: $scope.data.event.id},cUserId,cUserIssuer);
                          $ionicScrollDelegate.resize();
                          /*$ionicLoading.hide();*/
                        }, function () {
                            $scope.$broadcast('scroll.refreshComplete');
                            /*$ionicLoading.hide();*/
                        });
                    }, function () {
                      $scope.$broadcast('scroll.refreshComplete');
                      console.log('Could not reload Event Data');
                      /*$ionicLoading.hide();*/
                    });

                };
                //Get notified when user is blocked, so that the view is reloaded...
                $scope.fs.registerObserverCallback('userBlocked', $scope.doRefresh);

                //Register callback function to stop infiniteScroll
                $scope.fs.registerObserverCallback('feedPageLoaded',function(){
                    $scope.$broadcast('scroll.infiniteScrollComplete');
                });

                $scope.fs.registerObserverCallback('reloadFeed',function(){
                  $scope.feed.resetStatus();
                  $scope.$broadcast('scroll.infiniteScrollComplete');
                  $ionicScrollDelegate.resize();
                  $location.hash('feedStart');
                  $anchorScroll(true);
              });


                //Check if this Event is already in Device's Calendar (only when running on device)
                if ($scope.onDevice) {
                    var dateStr = $scope.data.event.startDate;
                    dateStr = ($scope.data.event.startTime && $scope.data.event.startTime !== '') ? dateStr.concat('T').concat($scope.data.event.startTime) : dateStr;
                    var startDate = new Date(dateStr);

                    dateStr = $scope.data.event.endDate;
                    dateStr = ($scope.data.event.endTime && $scope.data.event.endTime !== '') ? dateStr.concat('T').concat($scope.data.event.endTime) : dateStr;
                    var endDate = new Date(dateStr);

                    var title = $scope.data.event.title;
                    var eventLocation = $scope.data.event.venue.title + ', ' + $scope.data.event.venue.address;
                    var notes = "A Caravan Next Event.";
                    var findSuccess = function (results) {
                        if (results.length > 0) {
                            $scope.data.isEventInCal = true;
                        } else {
                            //Delete any dirty entries in cnextCalendar (localStorage)
                            var cnextCalendar = $localStorage.getObject(CONST.CNEXT_CAL_KEY);
                            delete cnextCalendar[$scope.data.event.id];
                            $localStorage.setObject(CONST.CNEXT_CAL_KEY, cnextCalendar);
                        }
                    };

                    var findError = function (message) {
                        console.log('Could not search in Calendar. Error=' + JSON.stringify(message));
                    };

                    var calOptions = window.plugins.calendar.getCalendarOptions();
                    //If Event is in cnextCalendar (localStorage), then try to find it by ID
                    var cnextCalendar = $localStorage.getObject(CONST.CNEXT_CAL_KEY);
                    if (cnextCalendar[$scope.data.event.id]) {
                        calOptions.id = cnextCalendar[$scope.data.event.id];
                    }
                    window.plugins.calendar.findEventWithOptions(title, eventLocation, notes, startDate, endDate, calOptions, findSuccess, findError);


                    $scope.takeMeThere = function () {
                        var geoCoords = $scope.data.event.venue.latitude + ',' + $scope.data.event.venue.longitude;
                        if (InfoService.is(CONST.OS_KEY, 'Android')) {
                            window.open('geo:0,0?q=' + geoCoords, '_system');
                            return;
                        }
                        if (InfoService.is(CONST.OS_KEY, 'iOS')) {
                            window.open('maps://?q=' + geoCoords, '_system');
                        }
                    };

                    /*Function to Add this Event in Device Calendar (Interactivelly)*/
                    $scope.addToCalendar = function () {

                        /*var startDate = new Date(2015,2,15,18,30,0,0,0); // beware: month 0 = january, 11 = december*/
                        var dateStr = $scope.data.event.startDate;
                        dateStr = ($scope.data.event.startTime && $scope.data.event.startTime !== '') ? dateStr.concat('T').concat($scope.data.event.startTime) : dateStr;
                        var startDate = new Date(dateStr);
                        /*console.log(startDate);*/

                        dateStr = $scope.data.event.endDate;
                        dateStr = ($scope.data.event.endTime && $scope.data.event.endTime !== '') ? dateStr.concat('T').concat($scope.data.event.endTime) : dateStr;
                        var endDate = new Date(dateStr);
                        /*console.log(endDate);*/

                        var title = $scope.data.event.title;
                        var eventLocation = $scope.data.event.venue.title + ', ' + $scope.data.event.venue.address;
                        var notes = "A Caravan Next Event.";
                        var createSuccess = function (message) {
                            $ionicPopup.alert({
                                title: $translate.instant('POP_UP.EVT_2CAL_SUCCESS.TITLE'),
                                template: $translate.instant('POP_UP.EVT_2CAL_SUCCESS.BODY'),
                                cssClass: 'cnextPop'
                            });

                            var cnextCalendar = $localStorage.getObject(CONST.CNEXT_CAL_KEY);
                            if (cnextCalendar[$scope.data.event.id]) {
                                $scope.data.isEventInCal = true;
                                return;
                            }
                            cnextCalendar[$scope.data.event.id] = message; // eventId=calEventId
                            $localStorage.setObject(CONST.CNEXT_CAL_KEY, cnextCalendar);
                            $scope.data.isEventInCal = true;
                        };

                        var createError = function () {
                            $ionicPopup.alert({
                                title: $translate.instant('POP_UP.EVT_2CAL_FAILURE.TITLE'),
                                template: $translate.instant('POP_UP.EVT_2CAL_FAILURE.BODY'),
                                cssClass: 'cnextPop'
                            });
                        };

                        var calOptions = window.plugins.calendar.getCalendarOptions(); // grab the defaults
                        /*window.plugins.calendar.listCalendars(function(res) {
                            calOptions.calendarId = res[0].id;
                            console.log('ListCalendars result:');
                            console.log(res);
                        }, function(res) {
                          console.log('Could not list calendars...');
                        });*/
                        calOptions.allday = false;
                        calOptions.firstReminderMinutes = 120; // default is 60, pass in null for no reminder (alarm)
                        calOptions.secondReminderMinutes = 15;

                        window.plugins.calendar.createEventWithOptions(title, eventLocation, notes, startDate, endDate, calOptions, createSuccess, createError);

                    };

                    $scope.openEventInCalendar = function () {
                        var dateStr = $scope.data.event.startDate;
                        dateStr = ($scope.data.event.startTime && $scope.data.event.startTime !== '') ? dateStr.concat('T').concat($scope.data.event.startTime) : dateStr;
                        var eventDate = new Date(dateStr);

                        var openSuccess = function (message) {
                        };
                        var openError = function () {
                            $ionicPopup.alert({
                                title: $translate.instant('POP_UP.CAL_OPEN_FAILURE.TITLE'),
                                template: $translate.instant('POP_UP.CAL_OPEN_FAILURE.BODY'),
                                cssClass: 'cnextPop'
                            });
                        };
                        window.plugins.calendar.openCalendar(eventDate, openSuccess, openError);
                    };
                }

                //If the User comes in this state inorder to reply to a Push Notification, then call the createPost function
                if ($scope.feed.cfg.ntfAction) {
                    $scope.fs.configurePostEditor($scope.feed);
                }
            }]);
}());
