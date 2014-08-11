'use strict';

/**
 * This factory is used for processing all kinds of information from the modal,
 * mostly regarding data from Facebook.
 *
 * @author Jeffrey Chan
 */

angular.module('fbCal').factory('processor', function ($sanitize, $sce, messages) {

    /**
     * Processes the event description by replacing new lines with <br> so
     * that it can be rendered in the modal as HTML. Also sanitizes it to
     * make sure only HTML compatible characters are used. Lastly, it lets
     * AngularJS know that this text is trusted so it can be rendered.
     * 
     * @param  {String} description Event description from Facebook
     * @return {String}             Processed event description
     */
    var processDesciption = function(description) {
      var processedDescription;
      if (description) {
        processedDescription = description.replace(/\r?\n/g, "<br>");
        processDesciption = $sanitize(processedDescription);
        $sce.trustAsHtml(processDesciption);
      }
      return processDesciption;
    };

    /**
     * Processes the event time into a visitor friendly format that depends on
     * whether or not the event is across multiple days.
     * 
     * @param  {string} start_time The time the event starts
     * @param  {string} end_time   The time the event ends
     * @return {Object}            An object containing the main time to display
     *                             to the user as well as a longer more
     *                             informative time to display. The longer time
     *                             is only displayed for multi-day events.
     */
    var processTime = function(start_time, end_time) {
      var startTime = new Date(start_time);
      var startHour = startTime.toLocaleTimeString().toLowerCase();
      startHour = startHour.replace(/:\d\d /, "");
      var startDateString = startTime.toLocaleDateString();
      var startDayString = startTime.toString().replace(/ .+/, ", ");
      var shortTime;
      var longTime;
      if (end_time) {
        var endTime = new Date(end_time);
        var endHour = endTime.toLocaleTimeString().toLowerCase();
        endHour = endHour.replace(/:\d\d /, "");
        if (isSameDay(startTime, endTime)) {
          shortTime = startDayString + startDateString + " at " +
                             startHour + "-" + endHour;
        } else {
          var endDateString = endTime.toLocaleDateString();
          var endDayString = endTime.toString().replace(/ .+/, ", ");
          shortTime = startDayString + startDateString + " - " + endDayString + endDateString;
          longTime = startDayString + startDateString + " at " + startHour +
                            " to " + endDayString + endDateString + " at " +
                            endHour;
        }
      } else {
        shortTime = startDayString + startDateString + " at " +
                           startHour;
      }
      return {shortTime : shortTime, longTime : longTime};
    };

    /**
     * Returns whether or not two times are on the same day.
     * 
     * @param  {Object}  a First Date Object to compare
     * @param  {Object}  b Second Date Object to compare
     * @return {Boolean}   Whether or not the two times are on the same day
     */
    var isSameDay = function(a, b) {
      return (a.getDate() === b.getDate() &&
              a.getMonth() === b.getMonth() &&
              a.getFullYear() === b.getFullYear());
    };

    /**
     * Processes the venue for an event into a visitor friendly format.
     * 
     * @param  {Object} venue The venue object for the event from Facebook
     * @return {String}       Formatted venue information
     */
    var processVenue = function(venue) {
      var formattedVenue;
      if (venue && (venue.street || venue.city ||
                              venue.state || 
                              venue.country)) {
        formattedVenue = venue.street + ", " + venue.city + 
                         ", " + venue.state + ", " +
                         venue.country + " " + venue.zip;
        formattedVenue = formattedVenue.replace(/, undefined/, "")
                                       .replace(/undefined, /, "")
                                       .replace(/undefined/, "")
                                       .replace(/ $/, "")
                                       .replace(/, $/, "");
      }
      return formattedVenue;
    };

    /**
     * Processes the guest statistics from Facebook.
     * 
     * @param  {Object} guestObject The guest data from Facebook
     * @return {Object}             The processes guest statistics
     */
    var processGuests = function(guestObject) {
      var stats = guestObject.data[0];
      stats.attending_count = processNumber(stats.attending_count);
      stats.unsure_count = processNumber(stats.unsure_count);
      stats.not_replied_count = processNumber(stats.not_replied_count);
      return stats;
    };

    /**
     * Processes large numbers so that they can be represented using a
     * max of 3 characters (so they fit well in the modal).
     * 
     * @param  {Number} number Number to be processed
     * @return {String}        Processed version of number
     */
    var processNumber = function(number) {
      if (number >= 100000) {
        number = (number/1000000).toString().substring(0, 3);
        var index = number.indexOf(".");
        if (!(index === 0 || index === 1)) {
          number = number.substring(0, 2);
        } 
        number += "M";
      } else if (number >= 1000) {
        number = (number/1000).toString().substring(0, 3);
        var decimal = number.indexOf(".");
        if (!(decimal === 0 || decimal === 1)) {
          number = number.substring(0, 2);
        } 
        number += "K";
      }
      return number;
    };

    /**
     * Pulls the important data from a Facebook post object into a friendly
     * status object that the modal can display.
     * 
     * @param  {Object} data Post object from Facebook
     * @return {Object}      Processed status object
     */
    var processStatus = function(data) {
      var status = { picture : data.picture,
                     name: data.from.name,
                     link: data.link,
                     linkName: data.name,
                     caption: data.caption,
                     description : data.description,
                     id: data.id
                   };
      status = processActions(status, data);
      return status;
    };

    /**
     * Continues the process of gathering the data from a Facebook post object
     * into a status object that the modal can display.
     *
     * Initially, only a max of 5 statuses are displayed on the feed. If the
     * user would like, she can click to view more replies as well as pull more
     * from the server if the client knows there is another page of comments to
     * get.
     * 
     * @param  {Object} status Status object being processed
     * @param  {Object} data   Facebook post object
     * @return {Object}        Processed status object
     */
    var processActions = function(status, data) {
      var postTime = new Date(data.created_time);
      status.time = postCreatedTime(postTime);
      status.message = $sanitize(data.message.replace(/\r?\n/g, "<br>"));
      $sce.trustAsHtml(status.message);
      if (data.actions) {
        for (var i = 0; i < data.actions.length; i++) {
          if (data.actions[i].name === 'Like') {
            status.like = data.actions[i].link;
          } else if (data.actions[i].name === 'Comment') {
            status.comment = data.actions[i].link;
          }
        }
      }
      if (data.likes) {
        status.numberLikes = data.likes.data.length;
      } else {
        status.numberLikes = 0;
      }
      if (data.sharedposts) {
        status.numberShares = data.sharedposts.data.length;
      } else {
        status.numberShares = 0;
      }
      status.comments = [];
      status.extraComments = [];
      if (data.comments) {
        status = processAllComments(status, data.comments);
      }
      return status;
    };

    /**
     * Processes all the comments in a Facebook post object into a status
     * object the modal can display.
     * 
     * Initially, only a max of 5 comments are displayed on each status. If the
     * user would like, she can click to view more replies as well as pull more
     * from the server if the client knows there is another page of comments to
     * get.
     * 
     * @param  {Object} status   Status object being processed
     * @param  {Object} comments Comments object from Facebook post object
     * @return {Object}          Processed status object
     */
    var processAllComments = function(status, comments) {
      var data = comments.data;
      if (data) {
        for (var j = 0; j < data.length; j++) {
          var comment = processComments(data[j]);
          if (status.comments.length < 5 || j < 5) { 
            status.comments.push(comment);
          } else {
            status.extraComments.push(comment);
          }
        }
      } else {
        status.more = false;
      }
      if (comments.paging) {
        if (comments.paging.next) {
            status.more = comments.paging.next;
        } else {
          status.more = false;
        }
      } else {
        status.more = false;
      }
      if (status.more || status.extraComments.length > 0) {
        status.repliesMessage = 'Show more replies';
      } else {
        status.repliesMessage = "";
      }
      return status;
    };

    /**
     * Processes individual comments from a Facebook post object into a comment
     * object that can be added to an array of comments which will be an
     * attribute of a status object. 
     *
     * The important information from the comments are pulled and the message
     * is sanitized and marked as trustworthy for Angular to render.
     * 
     * @param  {Object} data Individaul comment object from Facebook post object
     * @return {Object}      New processed comment object
     */
    var processComments = function(data) {
      var comment = {id : data.id,
                     can_remove : data.can_remove,
                     numberLikes : data.like_count,
                     name: data.from.name,
                     time: postCreatedTime(new Date(data.created_time))
                    };
      if (data.message) {
        comment.message = $sanitize(data.message.replace(/\r?\n/g, "<br>"));
        $sce.trustAsHtml(comment.message);
      }
      return comment;
    };

    /**
     * Given a post time, it returns a visitor friendly post time.
     * 
     * @param  {String} time The time from a post or comment object from
     *                       Facebook
     * @return {String}      The visitor friendly version of the post time
     */
    var postCreatedTime = function(time) {
      var today = new Date();
      if (isSameDay(today, time)) {
        if (today.getHours() - time.getHours()) {
           return (today.getHours() - time.getHours()).toString() + ' hours ago';
        } else if (today.getMinutes() - time.getMinutes()) {
          return (today.getMinutes() - time.getMinutes()).toString() + ' minutes ago';
        } else {
          return 'Just now';
        }
      } else {
        return time.toLocaleString().replace(/:\d\d /, '').toLowerCase();
      }
    };

    var errorTypes = ['facebook', 'facebook login', 'load'];
    
    /**
     * Given a type of message, this function sets up a modal object with the
     * correct attributes so the appropriate modal can be displayed to the
     * user.
     *
     * This is referring to a message modal on top of the widget's modal.
     * 
     * @param  {String} type  The reason for showing the modal representing the
     *                        current situation
     * @return {Object}       The processed Modal object with the correct
     *                        attributes for the situation 
     */
    var processModal = function(type) {
      var modal = { messageTitle : '',
                    messageBody : '',
                    modalButton : '',
                    showLink : false,
                    permissionError : false
                  };
      if (errorTypes.indexOf(type) >= 0) {
        modal.messageTitle = messages.errorModal.title;
        modal.messageBody = messages.errorModal.message;
        modal.modalButton = messages.errorModal.modalButton;
      } else if (type === 'link') {
        modal.messageTitle = messages.linkModal.title;
        modal.showLink = true;
      }
        else if (type === 'wait') {
        modal.messageTitle = messages.waitModal.title;
        modal.messageBody = messages.waitModal.message;
        modal.modalButton = messages.waitModal.modalButton;
      } else {
        modal.permissionError = true;
        modal.messageTitle = messages.permissionModal.title;
        modal.modalButton = messages.permissionModal.modalButton;
        switch(type) {
          case 'declined permission':
            modal.messageBody = messages.permissionModal.declinedPermissionMessage;
            break;
          case 'declined':
            modal.messageBody = messages.permissionModal.declinedMessage;
            break;
          case 'not logged in':
            modal.messageBody = messages.permissionModal.notLoggedInMessage;
        }
      }
      return modal;
    };

    return {
      processDesciption : processDesciption,
      processTime : processTime,
      processVenue : processVenue,
      processGuests : processGuests,
      processStatus : processStatus,
      processAllComments : processAllComments,
      processComments : processComments,
      processModal : processModal
    };
});