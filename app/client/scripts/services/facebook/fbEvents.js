'use strict';
/*global FB:false, $:false */

/**
 * This factory handles all dealings with Facebook events on the client side.
 *
 * Facebook Terminology:
 * A post is a status on a feed on an event on Facebook.
 * A comment is a comment to a status on Facebook.
 *
 * @author Jeffrey Chan
 */

angular.module('fbCal').factory('fbEvents', function ($log, $q) {

  /**
   * Gets the user ID of the user and then if successful get the event data.
   * This function is called by the settings panel if getting the user's access
   * token on settings load was successful. Now, it attempts to get the event
   * data with the access token to save this work from being done by the server.
   * If it fails or gets the data for the wrong user, the server is called
   * to get the data.
   * 
   * @return {Object} A promise to return the user ID and the event data
   */
  var getUserEventDetails = function() {
    var deferred = $q.defer();
    FB.api('/me', function(response) {
      if (response && !response.error) {
        getAllEvents(deferred, response.id);
      } else {
        deferred.reject();
      }
    });
    return deferred.promise;
  };

  var commentIdRegex = /\/([0-9_]+)\/comments/;
  var afterRegex = /after=([0-9a-zA-Z=]+)/;
  var untilRegex = /until=([0-9a-zA-Z]+)/;


/**
 * Sets up the time parameter needed to get all user events and then calls the 
 * functions to get all events with the time parameter. The time parameter tells
 * the event getter function how far back to look for events. Right now, we are
 * searching for all events created by the user starting from 3 months ago to
 * anytime in the future. This number can be increased or decreased depending
 * on the developer's preference and best judgement.
 * 
 * @param  {Object} deferred A promise object
 * @param  {String} userId   The ID of the user. It is passed along from the
 *                           function calling it and will be returned through
 *                           the promise to the original function in the
 *                           settings controller that is getting the event data.
 *                           The ID is not used in this function.
 */
  var getAllEvents = function(deferred, userId) {
    var curTime = Math.round(new Date().getTime() / 1000);
    var secondsInThreeMonths = 60 * 60 * 24 * 90;
    var threeMonthsAgo = (curTime - secondsInThreeMonths).toString();
    var finalEvents = [];
    getEventsData(threeMonthsAgo, userId, deferred, finalEvents, '');
  };

  /**
   * Gets event data for the user and fulfills the promise if successful.
   *
   * Because Facebook does not return all the user's events in one API call
   * (limited to 25 max per call), we have to use the paging data returned by
   * the first call to make the next few calls. Thus, this function is
   * recursive and keeps running until Facebook does not return any paging data
   * signifying that we have reached the end. It continually fills the
   * finalEvents array with the data it gets from each page. When done, it sends
   * the finalEvents array through the promise.
   * 
   * @param  {Number} seconds     The amount of seconds to go back in time when
   *                              looking for user events.
   * @param  {String} userId      The ID of the user we are getting events for.
   *                              It is not used here, only passed back in the
   *                              successful promise response.
   * @param  {Object} deferred    The Promise Object
   * @param  {Array} finalEvents 
   * @param  {String} pagingData  Data needed by the Facebook SDK telling it
   *                              which page of event data to retrieve
   */
  var getEventsData = function(seconds, userId, deferred, finalEvents, pagingData) {
    FB.api('/me/events/created?since=' + seconds + pagingData, function(response) {
      if (response && !response.error) {
        finalEvents = $.merge(finalEvents, response.data);
        if (response.paging) {
          if (response.paging.cursors) {
            if (response.paging.cursors.after) {
              pagingData = '&after=' + response.paging.cursors.after;
              getEventsData(seconds, userId, deferred, finalEvents, pagingData);
            } else {
              deferred.resolve({data: finalEvents, userId: userId});
            }
          } else {
            var next = response.paging.next;
            var afterPattern = next.match(afterRegex);
            if (afterPattern) {
              pagingData = '&' + afterPattern[0];
              getEventsData(seconds, userId, deferred, finalEvents, pagingData);
            } else {
              var untilPattern = next.match(untilRegex);
              if (untilPattern) {
                pagingData = '&' + untilPattern[0];
                getEventsData(seconds, userId, deferred, finalEvents, pagingData);

              } else {
                $log.error('Regex is not working');
                deferred.reject();
              }
            }
          }
        } else {
          deferred.resolve({data: finalEvents, userId: userId});
        }
      } else {
        deferred.reject();
      }
    });
  };

  /**
   * Parses the given Facebook URL looking for the paging data.
   * 
   * The paging data will eventually be sent to be used by the server.
   * This function will be used by the modal and because it is open to the
   * visitor, all work getting event data is done on the server
   * (exception: visitor interactions with event (e.g. posting, liking)).
   * 
   * @param  {String} url         The Facebook URL to parse
   * @param  {String} gettingFeed Whether or not we are getting more statuses.
   *                              If not, we are getting comments and thus
   *                              must also parse the comment ID from the URL.
   *                              That work is done by calling another function.
   * @return {Object}             An object containing the data parsed from the
   *                              URL.
   */
  var parseUrl = function(url, gettingFeed) {
    var commentId;
    var afterPattern = url.match(afterRegex);
    if (afterPattern) {
      if (gettingFeed) {
        return {after : afterPattern[1]};
      } else {
        commentId = parseCommentId(url);
        if (commentId) {
          return {id : commentId, after : afterPattern[1]};
        }
      }
    } else {
      var untilPattern = url.match(untilRegex);
      if (untilPattern) {
        if (gettingFeed) {
          return {until : untilPattern[1]};
        } else {
          commentId = parseCommentId(url);
          if (commentId) {
            return {id : commentId, until : untilPattern[1]};
          }
        }
      } else {
        $log.error('Could not parse Url for Paging Data');
      }
    }
  };

  /**
   * Parses the URL for the comment ID. As hinted in the previous function
   * (parseURL), this comment ID is needed by the server to get more comments
   * for a status the site visitor is interested in.
   * 
   * @param  {String} url The URL to parse
   * @return {String}     The parsed comment ID; if not available, the function
   *                      throws an error.
   */
  var parseCommentId = function(url) {
    var commentIdPattern = url.match(commentIdRegex);
    if (commentIdPattern) {
      return commentIdPattern[1];
    } else {
      $log.error('Could not parse Url for Comment ID');
    }
  }; 

  /**
   * Gets the RSVP status of the user.
   *
   * This function is called by the modal once the Facebook SDK is done
   * initializing and if we were able to succesfully get the visitor's
   * access token. Otherwise, the default status shown to the user is "RSVP".
   * 
   * @param  {String} eventId The event we are getting the user's RSVP status
   *                          for
   * @return {Object}         Promise to return the user's RSVP status
   */
  var getRsvpStatus = function(eventId) {
    var deferred = $q.defer();
    FB.api('/fql',
          {
            'q' : 'SELECT rsvp_status FROM event_member WHERE eid = ' + eventId + ' AND uid=me()'
          }, 
          function(response) {
            if (response && !response.error) {
              var rsvp_status = response.data[0].rsvp_status;
              if (rsvp_status === 'attending') {
                deferred.resolve('Going');
              } else if (rsvp_status === 'maybe') {
                deferred.resolve('Maybe');
              } else if (rsvp_status === 'declined') {
                deferred.resolve('Declined');
              } else {
                deferred.resolve('RSVP');
              }
            } else {
              deferred.resolve('RSVP');
            }
          });
    return deferred.promise;
  };

  /**
   * This function is used to share the event on Facebook. It's called when
   * the user clicks to share the event via Facebook.
   * 
   * @param  {String} eventId The event ID of the event to be shared
   */
  var shareEvent = function(eventId) {
    FB.ui({
           method: 'share',
           href: 'https://www.facebook.com/events/' + eventId,
          }, function() {});
  };

  var rsvp = ['attending', 'maybe', 'declined']; 

  /**
   * Processes the passed in Facebook action that the site visitors wants to do
   * by calling the appropriate action function.
   * 
   * @param  {String} action  The action the user wants to perform
   * @param  {String} id      The event ID of the event we are performing the
   *                          action on unless we are commenting. Then, it is
   *                          the id of the status we are commenting on.
   * @param  {String} message If posting/commenting, this is the message the
   *                          user wants to post/comment.
   * @return {Object}         Promise to return whether the Facebook action was
   *                          successful. For posts and comments, the
   *                          post/comment object is returned so that it can
   *                          shown in the modal.
   */
  var processInteraction = function(action, id, message) {
    var deferred = $q.defer();
    if (rsvp.indexOf(action) >= 0) {
      changeAttendingStatus(action, id, deferred);
    } else if (action === 'post') {
      post(id, deferred, message, true);
    } else if (action === 'like' || action === 'likeComment') {
      like(id, deferred, true);
    } else if (action === 'unlike' || action === 'unlikeComment') {
      like(id, deferred, false);
    } else if (action === 'comment') {
      post(id, deferred, message, false);
    } else {
      deletePost(id, deferred);
    }
    return deferred.promise;
  };

  /**
   * Posts to Facebook either a comment to a status or a post to the feed.
   * 
   * @param  {String} id       If posting, this is the event ID of the event
   *                           whose feed we are posting to. If commenting, it
   *                           is the id of the status we are commenting on.
   * @param  {Object} deferred Promise Object - If sucessful, the promise is
   *                           fulfilled by getting the comment/post data from
   *                           Facebook and then returning that data.
   * @param  {String} message  The message to be posted/commented
   * @param  {Boolean} post    Whether or not we are posting. If not, we are
   *                           commenting
   */
  var post = function(id, deferred, message, post) {
    var link;
    if (post) {
      link = '/feed';
    } else {
      link = '/comments';
    }
    FB.api('/' + id + link,
           'POST',
           {
              'message': message
           },
           function(response) {
             if (response && !response.error) {
               FB.api("/" + response.id,
                      function(response) {
                        if (response && !response.error) {
                          deferred.resolve(response);
                        } else {
                          deferred.reject();
                        }
                      });
             } else {
               deferred.reject();
             }
           });
  };

  /**
   * This deletes the post/comment the visitor wants removed from Facebook.
   * 
   * @param  {String} id       The ID of the post/comment to be deleted
   * @param  {Object} deferred The Promise Object - We return whether or not
   *                           the promise has been successfully fulfilled.
   */
  var deletePost = function(id, deferred) {
    FB.api('/' + id,
           'DELETE',
           function (response) {
            if (response && !response.error) {
              deferred.resolve(true);
            } else {
              deferred.reject();
            }
          });
  };

  /**
   * This function handles all liking/unliking of posts and comments.
   * 
   * @param  {String} id       The ID of the object to be liked.
   * @param  {Object} deferred The Promise Object - We return whether or not the
   *                           promise has been successfully fulfulled.
   * @param  {Boolean} like    Whether or not we are liking. If not, we are
   *                           unliking.
   */
  var like = function(id, deferred, like) {
    var method;
    if (like) {
      method = 'POST';
    } else {
      method = 'DELETE';
    }
    FB.api('/' + id + '/likes',
           method,
           function (response) {
             if (response && !response.error) {
               deferred.resolve(true);
             } else {
               deferred.reject();
             }
           });

  };

  /**
   * This function handles all the changing of the visitor's RSVP status
   * to an event.
   * 
   * @param  {String} action   The RSVP status the visitor wants to change to.
   * @param  {String} id       The event that the visitor is changing her RSVP
   *                           status to.
   * @param  {Object} deferred The Promise Object - We return whether or not the
   *                           promise has been successfully fulfilled.
   */
  var changeAttendingStatus = function(action, id, deferred) {
    FB.api('/' + id + '/' + action,
           'POST',
           function(response) {
             if (response && !response.error) {
               deferred.resolve(true);
             } else {
               deferred.reject();
             }
           });
  };

  return {
    shareEvent: shareEvent,
    getUserEventDetails: getUserEventDetails,
    processInteraction: processInteraction,
    getRsvpStatus: getRsvpStatus,
    parseUrl: parseUrl
  };
});