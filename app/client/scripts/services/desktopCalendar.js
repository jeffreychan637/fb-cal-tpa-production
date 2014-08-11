'use strict';
/*global $:false */

/**
 * This factory is used for initializing the calendar of events in the widget.
 *
 * @author Jeffrey Chan
 */

angular.module('fbCal').factory('desktopCalendar', function ($wix, $rootScope) {

  /**
   * This function initializes the calendar in the widget with the provided 
   * event data. It also sets up the navigation buttons and makes the border
   * an appropiate width based on the user's settings.
   *
   * To start the calendar, you need to provide:
   *   The path to the template files
   *   The event data
   *
   * Optionally you can provide:
   *   1. A function on what to do after each event load. The commented out code
   *      right now is a function to build an event list. This feature is never
   *      used but can be created by simply commenting this code and the 
   *      corresponding line (also commented out) in the widget HTML file
   *   2. A function to call after the view is loaded (Reloads happen when the
   *      user navigates to anther month). Right now the function just tells the
   *      DOM element what the month the Calendar is on so it can display it
   *      to the user.
   * 
   * @param  {Array} eventData The events to be placed on the calendar
   */
  var setup = function(eventData) {
    var processedData = processEventData(eventData);
    var calendar = $("#calendar").calendar(
        {
           tmpl_path: "client/views/tmpls/",
           events_source: processedData,
            // onAfterEventsLoad: function(events) {
            //   if(!events) {
            //     return;
            //   }
            //   var list = $('#eventlist');
            //   list.html('');

            //   $.each(events, function(key, val) {
            //     $(document.createElement('li'))
            //       .html('<a href="' + val.url + '">' + val.title + '</a>')
            //       .appendTo(list);
            //   });
            // },
            onAfterViewLoad: function(view) {
              $('#current-view').text(this.getTitle());
            }
          });
    $('.btn-group button[data-calendar-nav]').each(function() {
      var $this = $(this);
      $this.click(function() {
        calendar.navigate($this.data('calendar-nav'));
        $wix.setHeight($('#desktop').outerHeight());
      });
    });
    var borderStyle = {'border-bottom-width' :  '1px',
                       'border-bottom-color' : '#eee',
                       'border-bottom-style' : 'solid',
                       'margin-bottom' : '10px'
                      };
    $('#header').css(borderStyle);
  };

  /**
   * Proceses the event data so it is usuable by the calendar. This calendar
   * only accepts events with times provided in milliseconds. It also sets the
   * color of the event on the calendar based on user preferences.
   * 
   * @param  {Array} events List of events to be processed
   * @return {Array}        List of processed events
   */
  var processEventData = function(events) {
    var processedEvents = [];
    var processedEvent;
    for (var i = 0; i < events.length; i++) {
      processedEvents[i] = {};
      processedEvents[i].id = events[i].id;
      processedEvents[i].title = events[i].name;
      processedEvents[i].url = '#';
      //Deal with weird times and events with no end times
      processedEvents[i].start = new Date(events[i].start_time).getTime();
      if (events[i].end_time) {
        processedEvents[i].end = new Date(events[i].end_time).getTime();
      } else {
        processedEvents[i].end = new Date(events[i].start_time).getTime();
      }
      if (events[i].eventColor) {
        processedEvents[i].color = events[i].eventColor;
      } else {
        processedEvents[i].color = '#0088CB';
      }
    }
    return processedEvents;
  };

  return {
    setup: setup
  };
});
