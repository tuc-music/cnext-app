/* Created by Nektarios Gioldasis
 Contains all the necessary app-wide Constants
 */

angular.module('cnextApp.constants', [])
  .constant('CONST', {
    DATA_PAGE_SIZE: 10,
    NETWORK_DELAY:200,
    NETWORK_TIMEOUT: 8000,
    USE_DEVICE_UUID:true,
    BACKEND_URL:"https://cnext.tuc.gr/",
    REST_API_URL: 'https://cnext.tuc.gr/api',
    CURRENT_USER_KEY: 'CURRENT_USER',
    SERVICE_PROVIDERS: {
      /*Login to FB with Facebook Connect Plugin (FCP) / OpenFB library (OFB)*/
      FB: {NAME: 'FB', APP_KEY: 'USE_A_VALID_KEY',LOGIN_WITH:'OFB'},
      CN: {NAME: 'CN'},
      GOOGLE: {
        NAME: 'GOOGLE',
        APP_KEY: 'USE_A_VALID_KEY',
        GCM_SENDER_ID: 'USE_A_VALID_ID',
        MAPS_KEY: 'USE_A_VALID_KEY'
      }
    },
    LOADER_CFG: {
      template: '<ion-spinner icon="lines"></ion-spinner>',
      animation: 'fade-in',
      showDelay: 0,
      duration:5000
    },
    TOAST_LONG_MSG:{
      message: '',
      duration: 8000, // short/long/number
      position: "bottom",
      styling: {
        opacity: 0.90, // 0.0 (transparent) to 1.0 (opaque). Default 0.8
        backgroundColor: '#8e1c6c', // make sure you use #RRGGBB. Default #333333
        textColor: '#dfdfdf',
        textSize: 16, // Default is approx. 13.
        cornerRadius: 5, // minimum is 0 (square). iOS default 20, Android default 100
        horizontalPadding: 20, // iOS default 16, Android default 50
        verticalPadding: 20 // iOS default 12, Android default 30
      }
    },
    TOAST_SHORT_MSG:{
      message: '',
      duration: 2000, // short/long/number
      position: "bottom",
      styling: {
        opacity: 0.90, // 0.0 (transparent) to 1.0 (opaque). Default 0.8
        backgroundColor: '#8e1c6c', // make sure you use #RRGGBB. Default #333333
        textColor: '#dfdfdf',
        textSize: 16, // Default is approx. 13.
        cornerRadius: 5, // minimum is 0 (square). iOS default 20, Android default 100
        horizontalPadding: 20, // iOS default 16, Android default 50
        verticalPadding: 20 // iOS default 12, Android default 30
      }
    },
    ON_DEVICE:'onDevice',
    CACHED_EVENTS_KEY: 'OFFLINE_EVENTS',
    CACHED_CATEGORIES_KEY: 'OFFLINE_CATEGORIES',
    CNEXT_CAL_KEY: 'EVENTS_IN_CAL',
    GCM_TOKEN_KEY: 'PUSH_TOKEN',
    APP_SETTINGS_KEY: 'APP_SETTINGS',
    NO_IMG_URL: 'img/no_img.png',
    USER_LOCATION: {LS_KEY: 'USER_LOCATION', DEFAULT: {LAT: 53.563820, LON: 14.828430}},
    GUI_LANGUAGES: [
      {code: 'en', name: 'English'},
      {code: 'el', name: 'Ελληνικά'},
      {code: 'it', name: 'Italiano'},
      {code: 'nl', name: 'Dutch'},
      {code: 'es', name: 'Español'},
      {code: 'de', name: 'Deutsch'},
      {code: 'da', name: 'Dansk'},
      {code: 'pl', name: 'Polski'}
    ],
    DEFAULT_GUI_LANG: 'en',
    DISCLAIMER_ACCEPTED_PREFIX: 'DISCLAIMER_ACCEPTED_BY_',
    NOTIFICATIONS_KEY: 'PUSH_NOTIFICATIONS',
    APP_ID_KEY: 'APP_ID',
    OS_KEY: 'OS',
    APP_VERSION_KEY: 'APP_VERSION',
    TIME_FILTERS:{
      'ALL':{id:0, label:'ALL_EVENTS'},
      'TODAY':{id:1, label:'TODAY_EVENTS'},
      'UPCOMING':{id:2, label:'UPCOMING_EVENTS'},
      'CURRENT':{id:3, label:'CURRENT_EVENTS'},
      'PAST':{id:4, label:'PAST_EVENTS'},
    },
    DEFAULT_PLACE_FILTER: 'country',
    PLACE_FILTERS: {
      country: {value: 'country', label: 'BY_COUNTRY'},
      city: {value: 'city', label: 'BY_CITY'}
    },
    LBS: {
      TESTING_KEY:'lbsTesting',
      NOTIFICATIONS_KEY: 'LBS_NOTIFICATIONS',
      NUM_OF_MEASURES:3,
      TRACK_MODES: {
        M: 'monitoring',
        R: 'ranging'
      },
      PROXIMITY: {
        UNKNOWN:{NUM:'0', LEX:'UNKNOWN'},
        CLOSE: {NUM: '1', LEX: 'CLOSE'},
        IN: {NUM: '2', LEX: 'IN'},
        OUT: {NUM: '3', LEX: 'OUT'}
      },
    },
    NTFS:{
      LBS:['lbsCnfrm','lbsMsg','quiz','mc-quiz'],
      STORABLE:['alert','reqPst'],
      LINKABLE:['alert','reqPst','openSettings'],
      CONFIRMABLE:['reqPst','openSettings','digest','lbsCnfrm'],
      DEFERRED:['lbsCnfrm','alert','reqPst']
    },
    DEFAULT_APP_SETTINGS:{
      version:1.24,
      "lbsSettings":{
        "usePolyLine":true,
        "lbsTesting":false,
        "allow":false,
        "gps":{
          "allow":false
        },
        "bcn": {
          "allow": false,
          "track": "monitoring",
          "range_when_detect": false
        }
      },
      "pushSettings":{
        "receive":true,
        "show":true
      },
      "gui_language":"en",
      "enableGroupFilters":false,
      "placeFilter":"country",
      "timeFilter":{
        "id":2,
        "label":"UPCOMING_EVENTS"
      },
      "showOnlyTopLevelEvents":true
    }
  })
  .constant('TIMEZONES', {
    The_Netherlands: "Europe/Amsterdam",
    Andorra: "Europe/Andorra",
    Greece: "Europe/Athens",
    Ireland: "Europe/Dublin",
    Serbia: "Europe/Belgrade",
    Germany: "Europe/Berlin",
    Slovakia: "Europe/Bratislava",
    Belgium: "Europe/Brussels",
    Romania: "Europe/Bucharest",
    Hungary: "Europe/Budapest",
    Denmark: "Europe/Copenhagen",
    Gibraltar: "Europe/Gibraltar",
    Finland: "Europe/Helsinki",
    Turkey: "Europe/Istanbul",
    Ukraine: "Europe/Kiev",
    Portugal: "Europe/Lisbon",
    Slovenia: "Europe/Ljubljana",
    United_Kingdom: "Europe/London",
    Luxembourg: "Europe/Luxembourg",
    Spain: "Europe/Madrid",
    Malta: "Europe/Malta",
    Belarus: "Europe/Minsk",
    Monaco: "Europe/Monaco",
    Russia: "Europe/Moscow",
    Cyprus: "Europe/Nicosia",
    Norway: "Europe/Oslo",
    France: "Europe/Paris",
    Montenegro: "Europe/Podgorica",
    Czech_Republic: "Europe/Prague",
    Latvia: "Europe/Riga",
    Italy: "Europe/Rome",
    San_Marino: "Europe/San_Marino",
    Bosnia_Herzegovina: "Europe/Sarajevo",
    FYROM: "Europe/Skopje",
    Bulgaria: "Europe/Sofia",
    Sweden: "Europe/Stockholm",
    Estonia: "Europe/Tallinn",
    Albania: "Europe/Tirane",
    Vatican_City: "Europe/Vatican",
    Austria: "Europe/Vienna",
    Lithuania: "Europe/Vilnius",
    Poland: "Europe/Warsaw",
    Croatia: "Europe/Zagreb",
    Switzerland: "Europe/Zurich"
  })
  .constant('angularMomentConfig', {
    timezone: 'Europe/Athens'
  });



