/* Created by Nektarios Gioldasis */
(function () {
  'use strict';

  /*global angular */
  angular.module('cnextApp.eventServices', [])
    .factory('EventsService', ['$rootScope', '$http', '$q', '$filter','CONST', 'dataUtils', '$localStorage', 'NetworkService', 'TIMEZONES', 'orderByFilter',
      function ($rootScope, $http, $q, $filter, CONST, dataUtils, $localStorage, NetworkService, TIMEZONES, orderByFilter) {

        var evtFac = {},
          eventsData;
        var eventsHierarchy = {};

        /*
         * Function used to extract the start/end DateTime of an event as a moment in event's place time zone.
         * */
        evtFac.getEventDateTime = function(evt, dtType){
          var country = evt.venue.country.split(' ').join('_');
          /*console.log('eventTimeZone:[' +evt.id + ']: ' + TIMEZONES[country]);*/
          var evtDate = dtType==='start'? moment.tz(evt.startDate + ' ' + evt.startTime, TIMEZONES[country]):
            moment.tz(evt.endDate + ' ' + evt.endTime, TIMEZONES[country]);
          return evtDate;
        };

        evtFac.getFormattedEventDateRange = function (evt){
          var evtStart = evtFac.getEventDateTime(evt,'start');
          var evtEnd =  evtFac.getEventDateTime(evt,'end');
          if (evtStart.get('month')===evtEnd.get('month')){
            if (evtStart.get('date')===evtEnd.get('date')){
              return evtStart.format('DD MMMM') + ' ' + evtStart.format('YYYY');
            }else {
              return evtStart.format('DD') + ' - ' + evtEnd.format('DD MMMM') + ' ' + evtStart.format('YYYY');
            }
          }else{
            return evtStart.format('DD MMMM') + ' - ' + evtEnd.format('DD MMMM') + ' ' + evtStart.format('YYYY');
          }
        };

        evtFac.getFormattedEventDateTime = function (evt,dtType,pattern){
          var evtDateTime = evtFac.getEventDateTime(evt,dtType);
          return evtDateTime.format(pattern);
        };

         /*
         * Function used to construct the events Hierarchy (Events containing SubEvents)
         * Assumes that events have been fetched
         * */
        var buildEventsHierarchy = function () {
          var groupedByEvents = _.groupBy(eventsData, function (event) {
            var parentId = event.parentEventId;
            if (parentId === '') {
              return 'topLevel';
            } else if (!_.findWhere(eventsData, {id: parseInt(parentId)})) {
              return 'topLevel';
            } else {
              return event.parentEventId;
            }
          });
          angular.forEach(groupedByEvents.topLevel, function (topLevelEvent) {
            topLevelEvent.show = false; //used for collapse/expand in GUI
            if (!groupedByEvents[topLevelEvent.id]) {
              topLevelEvent.subEvents = [];
            } else {
              topLevelEvent.subEvents = groupedByEvents[topLevelEvent.id];
            }
            eventsHierarchy[topLevelEvent.id] = topLevelEvent;
          });
        };

        /*Function used to load event data
        * It tries to load from the server
        * If cannot, then tries to load them from $localStorage
        * If there are no offline events in $localStorage, then returns empty array*/
        evtFac.fetchEvents = function(){
          console.log('Events Requested from Server...');
          return $http.get(CONST.REST_API_URL + '/events', {timeout: CONST.NETWORK_TIMEOUT})
            .then(
              function (res) { // success network op
                var apiResponse = res.data;
                if (apiResponse.success) {
                  console.log('Events Fetched from Server...');
                  eventsData = apiResponse.data;
                  buildEventsHierarchy();
                  $localStorage.setObject(CONST.CACHED_EVENTS_KEY, {lastUpdated: new Date, data: eventsData});
                  return eventsData;
                }
              },
              function (res) { // error handling
                console.log('EventsService http request rejected!!!');
                if ($localStorage.hasEntry(CONST.CACHED_EVENTS_KEY)) {
                  eventsData = $localStorage.getObject(CONST.CACHED_EVENTS_KEY).data;
                  buildEventsHierarchy();
                  console.log('Events Fetched from $localStorage...');
                  return eventsData;
                }
                return [];
              });
        };

        /*Function used to identify if events have been feetched*/
        evtFac.isResolved = function(){
          return eventsData? true:false;
        };

        evtFac.reload = evtFac.fetchEvents;

        /*
        * Local Function used to filter eventsData by time and type(category or country).
        * It is used by evtFac functions.
        * @timeFilter: number (0:ALL,1:TODAY,2:UPCOMING,3:PAST) the timeFilter
        * @typeFilter string (country/category)
        * @typeValue  string the country or the category filter value
        * If no filter is passed, then all events are returned
        * Assumes that event data have been fetched
        * */
        var filterEventsByTimeAndType = function (timeFilter, typeFilter, typeValue) {
          var toDay = function () {
            var now = new Date();
            return new Date(now.getFullYear(), now.getMonth(), now.getDate());
          };

          timeFilter = timeFilter || 0;
          typeFilter = typeFilter || 'ALL';
          //console.log('Filtering Events with arguments: ' + timeFilter + ', ' + typeFilter + ': ' + typeValue);
          //UPCOMING EVENTS
          var timeFilteredEvents = evtFac.filterEventsByTime(eventsData, timeFilter);

          if (typeFilter === 'ALL') {
            return timeFilteredEvents;
          } else if (typeFilter === 'category') {
            return _.filter(timeFilteredEvents, function (event) {
              return event.categories.indexOf(parseInt(typeValue)) >= 0;
            });
          } else {
            return _.filter(timeFilteredEvents, function (event) {
              return event.venue[typeFilter] === typeValue;
            });
          }
        };

        /*Function used to filter the provided eventsList by Time
        * @events: the array with the events to be filtered, if null the eventsData will be filtered
        * @timeFilter: number (0:ALL,1:TODAY,2:UPCOMING,3:PAST) the timeFilter
        * @onlyTopLevel: true/false to indicate if only top level events are needed.
        * UPCOMING and PAST filters are inclusive (i.e. today events are returned)
        * Assumes that event data have been fetched
        * */
        evtFac.filterEventsByTime = function (events, timeFilter,onlyTopLevel) {
          var filteredEvents = [];
          if (events===null){
            events = eventsData;
          }
          if (timeFilter === 0) { //All Events
            if (onlyTopLevel) {
              return _.filter(eventsData,function(evt){return evt.parentEventId===''});
            }else{
              angular.copy(events, filteredEvents);
            }
          } else {
            var now = moment();
            if (timeFilter === 1) { // Today Events
              /*Today Events are the events that they are active today
               * That is: (they have started or start today) AND (they have not finished yet or Finish Today).*/
              filteredEvents = _.filter(events, function (evt) {

                var evtStartDate = evtFac.getEventDateTime(evt,'start');
                var evtEndDate = evtFac.getEventDateTime(evt,'end');
                var result = (onlyTopLevel)? evtStartDate.isSameOrBefore(now, 'day') && evtEndDate.isSameOrAfter(now, 'day') && (evt.parentEventId==='') :evtStartDate.isSameOrBefore(now, 'day') && evtEndDate.isSameOrAfter(now, 'day');
                return result;
              });
            } else if (timeFilter === 2) { //upcoming
              //Upcoming Events are the events that start this minute or in future
              filteredEvents = _.filter(events, function (evt) {
                var evtStartDate = evtFac.getEventDateTime(evt, 'start');
                var result = (onlyTopLevel) ? evtStartDate.isSameOrAfter(now, 'minute') && evt.parentEventId === '' : evtStartDate.isSameOrAfter(now, 'minute');
                return result;
              });
            }else if(timeFilter===3){
              //Get events that happen right now (not just today) (i.e. have started and haven't finish yet
              filteredEvents = _.filter(events, function (evt) {
                var evtStartDate = evtFac.getEventDateTime(evt, 'start');
                var evtEndDate = evtFac.getEventDateTime(evt,'end');
                var result = (onlyTopLevel) ? evtStartDate.isSameOrBefore(now, 'minute') && evtEndDate.isSameOrAfter(now, 'minute') && evt.parentEventId === '' : evtStartDate.isSameOrBefore(now, 'minute') && evtEndDate.isSameOrAfter(now, 'minute');
                return result;
              });
            } else {// past
              //Past Events are the events that have ended before the current day
              filteredEvents = _.filter(events, function (evt) {
                var evtEndDate = evtFac.getEventDateTime(evt,'end');
                var result = (onlyTopLevel)? evtEndDate.isBefore(now, 'minute') && evt.parentEventId==='' : evtEndDate.isBefore(now, 'minute');
                return result;
              });
            }
          }
          return filteredEvents;
        }

        /*
        * Function used to get the Event that happens right now.
        * If more than one events happen right now, the first one is returned.
        * @topLevel: if true, then only top level events are considered...
        * Assumes that event data have been fetched
        * */
        evtFac.getHappeningNowEvent = function (topLevel) {
          /*var now = moment('2016-09-03 20:30:00');*/
          var now = moment();
          var nowEvents = _.filter(eventsData, function (evt) {
            var country = evt.venue.country.split(' ').join('_');
            var evtStartDate = moment.tz(evt.startDate + ' ' + evt.startTime, TIMEZONES[country]);
            var evtEndDate = moment.tz(evt.endDate + ' ' + evt.endTime, TIMEZONES[country]);
            var result;
            if (topLevel) {
              result = evtStartDate.isSame(evtEndDate, 'day') && evtStartDate.isSameOrBefore(now) && evtEndDate.isSameOrAfter(now) && evt.parentEventId!=='';
            }else{
              result = evtStartDate.isSame(evtEndDate, 'day') && evtStartDate.isSameOrBefore(now) && evtEndDate.isSameOrAfter(now);
            }
            return result;
          });
          return nowEvents[0];
        };

        /*
        * Function used to get the first Upcoming Event in a time period.
        * @period: an array in the form [1,'days/weeks/months/years']
        * @first: true/false to indicate that only one should be returned
        * @topLevel: tru/false to indicate that only top level events are considered
        * Events are searched in both startDate and StartTime properties...
        * Assumes that event data have been fetched
        * */
        evtFac.getUpcomingEvents = function (period, first, topLevel) {
          /*var now = moment('2016-10-03 19:30:00');*/
          var now = moment();
          if (period) {
            var periodEnd = moment().add(period[0], period[1]);
          }
          var upcomingEvents = _.filter(eventsData, function (evt) {
            var country = evt.venue.country.split(' ').join('_');
            var evtStartDate = moment.tz(evt.startDate + ' ' + evt.startTime, TIMEZONES[country]);
            /*var evtEndDate = moment.tz(evt.endDate+ ' ' +evt.endTime,TIMEZONES[country]);*/
            var result;
            if (period) {
              result = (topLevel)? evtStartDate.isAfter(now) && evtStartDate.isBefore(periodEnd) && evt.parentEventId==='' : evtStartDate.isAfter(now) && evtStartDate.isBefore(periodEnd) ;
            } else {
              result = (topLevel)? evt.parentEventId==='' && evtStartDate.isAfter(now) : evtStartDate.isAfter(now);
            }
            return result;
          });
          upcomingEvents = orderByFilter(upcomingEvents, ['startDate', 'startTime']);
          if (first && upcomingEvents.length>0){
              return [upcomingEvents[0]];
          }
          return upcomingEvents;
        };

        /*
         * Function used to get the Latest Past Event in a time period.
         * @period: an array in the form [1,'days/weeks/months/years']
         * @topLevel: tru/false to indicate that only top level events are considered
         * Events are searched in both endDate and endTime properties...
         * Assumes that event data have been fetched
         * */
        evtFac.getLatestPastEvent = function (period,topLevel) {
          /*var now = moment('2016-09-03 19:30:00');*/
          var now = moment();
          if (period) {
            var periodStart = moment().subtract(period[0], period[1]);
          }
          var pastEvents = _.filter(eventsData, function (evt) {
            var country = evt.venue.country.split(' ').join('_');
            var evtEndDate = moment.tz(evt.endDate + ' ' + evt.endTime, TIMEZONES[country]);
            var result;
            if (period) {
              result = (topLevel)? evtEndDate.isBefore(now) && evtEndDate.isAfter(periodStart) && evt.parentEventId!=='' : evtEndDate.isBefore(now) && evtEndDate.isAfter(periodStart);
            } else {
              result = (topLevel)? evtEndDate.isBefore(now) && evt.parentEventId!=='' : evtEndDate.isBefore(now);
            }
            return result;
          });
          pastEvents = orderByFilter(pastEvents, ['-startDate', '-startTime']);
          return pastEvents[0];
        };

        /*
         * Function used to get the closest (past or upcoming) Event at the time of use.
         * @topLevel: tru/false to indicate that only top level events are considered
         * Assumes that event data have been fetched
         * */
        evtFac.getClosestEvent = function (onlyTopLevel) {

          var now = moment();
          var eventDateDiffsFromNow =[];
          angular.forEach(eventsData,function(evt){
            if ((onlyTopLevel && evt.parentEventId==='') || !onlyTopLevel ) {
              var country = evt.venue.country.split(' ').join('_');
              var evtStartDate = moment.tz(evt.startDate + ' ' + evt.startTime, TIMEZONES[country]);
              var evtEndDate = moment.tz(evt.endDate + ' ' + evt.endTime, TIMEZONES[country]);
              var dateDiff;
              if (evtEndDate.isBefore(now)) {
                dateDiff = Math.abs(evtEndDate.diff(now, 'days'));
              } else if (!evtStartDate.isBefore(now)) {
                dateDiff = Math.abs(evtStartDate.diff(now, 'days'));
              } else {
                dateDiff = 0;
              }
              eventDateDiffsFromNow.push({evtId: evt.id, days: dateDiff});
            }
          });
          return _.min(eventDateDiffsFromNow,'days');
        };


        /*
         * Function used to filter by time and type(category or country) and get eventsData.
         * @timeFilter: number (0:ALL,1:TODAY,2:UPCOMING,3:PAST) the timeFilter
         * @typeFilter string (country/category)
         * @typeValue  string the country or the category filter value
         * Assumes that event data have been fetched
         * If no filter is passed, then all events are returned*/
        evtFac.getEvents = function (timeFilter, typeFilter, typeValue) {
          var deferred = $q.defer();
          if (eventsData) {
            deferred.resolve(filterEventsByTimeAndType(timeFilter, typeFilter, typeValue));
            return deferred.promise;
          } else {
            deferred.resolve([]);
          }
          return deferred.promise;
        };

        /*
         * Function used to get a specific Event
         * @eventId: the id of the requested event
         * Assumes that event data have been fetched
         */
        evtFac.getEvent = function (eventId) {
          var response = {};
          if (eventsData) {
            var result = _.findWhere(eventsData, {id: parseInt(eventId)});
            if (result) {
              var subEvents = [];
              angular.forEach(eventsData, function (evt) {
                if (evt.parentEventId != "" && evt.parentEventId == result.id) {
                  subEvents.push({
                    id: evt.id,
                    title: evt.title,
                    icon: evt.icon,
                    startDate: evt.startDate,
                    startTime: evt.startTime,
                    endDate: evt.endDate,
                    endTime: evt.endTime,
                    venue: evt.venue,
                    categories: evt.categories
                  });
                }
              });
              angular.copy(result, response);
              response['subEvents'] = subEvents;
              if (response.parentEventId && response.parentEventId != '') {
                var parent = _.findWhere(eventsData, {id: parseInt(response.parentEventId)});
                response.parentEventTitle = parent.title;
                response.parentEventTitleHtml = ' @ <a href="#/app/events/' + parent.id + '">' + parent.title + '</a>';
              } else {
                response.parentEventTitle = '';
                response.parentEventTitleHtml = '';
              }
            }
          }
          return response;
        };

        /*
         * Function used to get an array of all events but with few attributes
         * At each event, an array with the sub event ids is generated.
         * Assumes that event data have been fetched
         * */
        evtFac.getAllEventTitles = function () {
          var evtTitles = [];
          angular.forEach(eventsData, function (evt) {
            var subEvents = [];
            if (eventsHierarchy.hasOwnProperty(evt.id)) {
              angular.forEach(eventsHierarchy[evt.id].subEvents, function (subEvt) {
                subEvents.push(subEvt.id);
              });
            }
            evtTitles.push({
              id: evt.id,
              parentEventId: evt.parentEventId,
              title: evt.title,
              startDate: evt.startDate,
              startTime: evt.startTime,
              endDate: evt.startDate,
              endTime: evt.startTime,
              city: evt.venue.city,
              country: evt.venue.country,
              subEventIds: subEvents
            });
          });
          return evtTitles;
        };

        /*
        * Function used to get the event hierarchy
        * Assumes that event data have been fetched, and hierarchy has been built*/
        evtFac.getEventsHierarchy = function () {
          return eventsHierarchy;
        };

        return evtFac;
      }])

    .factory('EventAlertsService',['$q', '$translate', 'CONST', 'dataUtils', '$localStorage', 'EventsService',
      function ($q, $translate, CONST, dataUtils, $localStorage, EventsService) {

        var evtAlertsFac={};
        /*
         * Local function used to create an event reminder object for a given upcoming event
         * @nextEvent the event for which the reminder will be produced
         * EventReminders are in the form {evtId,msg}
         * */
        var createEventReminder = function (nextEvent) {
          var now = moment.tz();
          var today = now.toDate();
          var reminderKey = today.getFullYear() + '-' + today.getMonth() + '-' + today.getDate();
          var reminders = $localStorage.getObjectDefault("reminders", {events: {}});
          if (!_.contains(reminders.events[nextEvent.id], reminderKey)) {
            var evtStart = EventsService.getEventDateTime(nextEvent, 'start');
            var evtEnd = EventsService.getEventDateTime(nextEvent, 'end');
            var now2Start = moment.duration(evtStart.diff(now)).asHours();
            var msg;
            if (now2Start > 0) {
              var dateDiff = evtStart.fromNow();
              msg = '<span>'+ $translate.instant('THE_EVENT') + ' <strong class="calm">"' + nextEvent.title + '"</strong> ' + $translate.instant('STARTS')+ ' ' + dateDiff + '.</span>';
              return {
                reminderType: 'event',
                subEventsFilter: CONST.TIME_FILTERS.ALL,
                key: reminderKey,
                evtId: nextEvent.id,
                msg: msg
              };
            }
            if (now2Start < 0) {
              var dateDiff = evtStart.from(now);
              msg = '<span>'+ $translate.instant('THE_EVENT') + ' <strong class="calm">"' + nextEvent.title + '"</strong> '+ $translate.instant('STARTED') + ' '  + dateDiff + '.</span>';
              return {
                reminderType: 'event',
                subEventsFilter: CONST.TIME_FILTERS.UPCOMING,
                key: reminderKey,
                evtId: nextEvent.id,
                msg: msg
              };
            }
            if (now2Start === 0) {
              var hoursToEvent = evtStart.diff(now, 'hours');
              var dateDiff = evtStart.from(now);
              if (hoursToEvent < 0 && hoursToEvent) {
                msg = '<span>'+ $translate.instant('THE_EVENT') + ' <strong class="calm">"' + nextEvent.title + '"</strong> is starting right now.</span>';
                return {
                  reminderType: 'event',
                  subEventsFilter: CONST.TIME_FILTERS.UPCOMING,
                  key: reminderKey,
                  evtId: nextEvent.id,
                  msg: msg
                };
              }
            }
          }
          return undefined;
        };

        /*
         * Function used to get event reminders for upcoming events in a time period
         * @period: time perios in the form [x,'days/weeks/months/years']
         * @first: true/false to indicate that only one reminder (the first) is needed
         * @topLevel: true/false to indicate that only top level events are considered
         * EventReminders are in the form {evtId,msg}
         * */
        evtAlertsFac.getEventReminders = function (period, first, onlyTopLevel) {
          var deferred = $q.defer();
          var reminders = [];
          /*1. Get in Progress Top (timeFilter=3 for events that are happening right now) Level Events*/
          var inProgressTopLevelEvents = EventsService.filterEventsByTime(null, 3, onlyTopLevel);

          /*2. Get Upcoming Top Level Events. params must be: period, false, true */
          var upcomingEvents = EventsService.getUpcomingEvents(period, false, true);

          /* Concat arrays and remove duplicates*/
          var eventsToRemind = dataUtils.arrayUnion(inProgressTopLevelEvents, upcomingEvents, function (evt1, evt2) {
            return evt1.id === evt2.id;
          });
          if (first && eventsToRemind.length>0){
            reminders.push(createEventReminder(eventsToRemind[0]));
          }else{
            angular.forEach(eventsToRemind, function (evt) {
              var reminder = createEventReminder(evt);
              if (reminder) {
                reminders.push(reminder);
              }
            });
            deferred.resolve(reminders);
          }
          return deferred.promise;
        };

        return evtAlertsFac;
      }])

    .factory('CatsService', ['$rootScope', '$http', '$q', 'CONST', 'dataUtils', '$localStorage', 'NetworkService', function ($rootScope, $http, $q, CONST, dataUtils, $localStorage, NetworkService) {

      var catsFac = {},
        catsData;

      /* Function used to load categories data
       * It tries to load from the server
       * If cannot, then tries to load them from $localStorage
       * If there are no offline categories in $localStorage, then returns empty array
       * */
      catsFac.fetchCategories = function () {
        return $http.get(CONST.REST_API_URL + '/categories', {timeout: CONST.NETWORK_TIMEOUT})
            .then(function (res) { // success network op
                  var apiResponse = res.data;
                  if (apiResponse.success) {
                    catsData = apiResponse.data;
                    $localStorage.setObject(CONST.CACHED_CATEGORIES_KEY, {lastUpdated: new Date, data: catsData});
                    console.log('Categories fetched...');
                    return catsData;
                  } else {
                    if ($localStorage.hasEntry(CONST.CACHED_CATEGORIES_KEY)) {
                      catsData = $localStorage.getObject(CONST.CACHED_CATEGORIES_KEY).data;
                      console.log('Cats Fetched from $localStorage...');
                      return catsData;
                    }
                    return [];
                  }
                },
                function (res) {
                  console.log('CategoriesService http request rejected!!!');
                  if ($localStorage.hasEntry(CONST.CACHED_CATEGORIES_KEY)) {
                    catsData = $localStorage.getObject(CONST.CACHED_CATEGORIES_KEY).data;
                    console.log('Cats Fetched from $localStorage...');
                    return catsData;
                  }
                  return [];
                });
      }

      /*
      * Function used by controllers to get Categories
      * If not present, categories are fethced from server or localStorage
      * using the fetchCategories function
      * */
      catsFac.getCategories = function () {
        var deferred = $q.defer();
        if (catsData) {
          deferred.resolve(catsData);
          return deferred.promise;
        } else if (NetworkService.isOnline()) {
          return catsFac.fetchCategories();
        } else {
          if ($localStorage.hasEntry(CONST.CACHED_CATEGORIES_KEY)) {
            catsData = $localStorage.getObject(CONST.CACHED_CATEGORIES_KEY).data;
            deferred.resolve(catsData)
          } else {
            deferred.resolve([]);
          }
          return deferred.promise;
        }
      };

      /*
       * Function used by controllers to get a specific category
       * @categoryId: the id of the requested category
       * Assumes category data
       * */
      catsFac.getCategory = function (categoryId) {
        if (catsData) {
          var result = _.findWhere(catsData, {id: parseInt(categoryId)});
          return result;
        } else {
          return {};
        }
      };

      return catsFac;
    }]);
}())

