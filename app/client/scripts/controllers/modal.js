'use strict';
/*global $:false, location:false */

/**
 * This is the Controller of the Modal. It is the main file that sends
 * info to be displayed on the DOM to the user and calls different functions
 * across different files to do so.
 *
 * @author Jeffrey Chan
 */

angular.module('fbCal')
  .controller('ModalCtrl', function ($scope, $q, $timeout, $window, eventId,
                                     server, fbSetup, fbEvents, modalFbLogin,
                                     processor) {
    /**
     * Passed in from the server on page load, this is the event ID of the
     * event this modal will display.
     * @type {[type]}
     */
    $scope.eventId = eventId;

    /**
     * The info about the current event.
     * @type {Object}
     */
    var eventInfo = {};

    /**
     * The current feed object that we are working with. Changes as the visitor
     * forces us to pull more feed from Facebook on the server side. 
     * @type {Object}
     */
    var feedObject = {};

    /**
     * Current Feed being displayed to visitor. By clicking "Get more feed",
     * they can get any extra feed or pull more feed from the server.
     * @type {Array}
     */
    $scope.feed = [];
    $scope.extraFeed = [];

    /**
     * Link from Facebook to the next page of the feed
     * @type {String}
     */
    var nextFeed = '';
    /**
     * Whether or not we are getting more feed right now.
     * @type {Boolean}
     */
    var notGettingMoreFeed = true;

    /**
     * The current error being shown to the user
     * @type {String}
     */
    var curErrorType = '';

    /**
     * The parameters for the current Facebook interaction the user is trying
     * to make. It is stored so in case of errors, the program can offer a
     * "Try again" option to retry to evaluate their request.
     * @type {Object}
     */
    var interactionParams = {};

 
    $scope.rsvpStatus = 'RSVP';

    /**
     * This watches for when the Facebook SDK is ready for use. On ready, it
     * tries to get the RSVP status of the user and sets that to the current
     * RSVP status. On failures, the status is just set to "RSVP".
     */
    var watchFb = $scope.$watch(function() {
                    return fbSetup.getFbReady();
                  }, function() {
                      if (fbSetup.getFbReady()) {
                        watchFb();
                        fbEvents.getRsvpStatus($scope.eventId)
                        .then(function(response) {
                          $scope.rsvpStatus = response;
                        });
                      }
                  });

    /**
     * This function pulls up the modal that will allow the user to share the
     * event to her own Facebook account.
     *
     * If the Facebook SDK isn't ready yet, then a modal asking for the user to
     * wai appears. 
     */
    $scope.shareFbEvent = function() {
      if (fbSetup.getFbReady()) {
        fbEvents.shareEvent($scope.eventId);
      } else {
        interactionParams.action = 'share';
        $scope.showModal('wait');
      }
    };

    /**
     * This function sets up the user design settings for the modal to most
     * of the modal elements.
     *
     * This function does not apply the settings to the feed elements. The
     * directives handle that, because at the time this function is run those
     * feed elements don't exist in the DOM yet.
     */
     var setSettings = function() {
      $('.app').css('border-width', $scope.settings.modalBorderWidth + 'px');
      $('#header').css('border-width', $scope.settings.modalBorderWidth + 'px');
      $('.block').css('border-width', $scope.settings.modalBorderWidth + 'px');

      $('#header').css('border-radius', $scope.settings.modalCorners + 'px');
      $('.block').css('border-radius', $scope.settings.modalCorners + 'px');
     };

    /**
     * Processes all the event info from Facebook (except for the feed). Once
     * processing is done, the loading message disappears and the event details
     * are displayed to the user.
     */
    var processEventInfo = function() {
      $scope.id = eventInfo.id;
      $scope.name = eventInfo.name;
      $scope.owner = eventInfo.owner.name;
      $scope.ownerId = eventInfo.owner.id;
      $scope.description = processor.processDesciption(eventInfo.description);
      if ($scope.description) {
        $scope.displayDescription = true;
      }
      processTime();
      processLocation();
      $scope.displayModal = true;
    };

    /**
     * Processes the time of the Facebook event. Once done processing, the
     * height of the boxes for the time and the RSVP/Share buttons are
     * adjusted so they match in height.
     */
    var processTime = function() {
      if (eventInfo.start_time) {
        var times = processor.processTime(eventInfo.start_time,
                                          eventInfo.end_time);
        $scope.shortTime = times.shortTime;
        $scope.longTime = times.longTime;
      } else {
        $scope.shortTime = 'No time specified';
      }
      $timeout(function() {
        if ($($window).width() > 760) {
          if ($('#time').outerHeight() > $('#rsvp').outerHeight()) {
            $('#rsvp').outerHeight($('#time').outerHeight());
          } else {
            $('#time').outerHeight($('#rsvp').outerHeight());
          }
        }
      }, 500);
    };

    /**
     * Processes the location and venue for the event.
     */
    var processLocation = function() {
      if (eventInfo.location) {
        $scope.location = eventInfo.location;
        $scope.venue = processor.processVenue(eventInfo.venue);
      } else {
        $scope.location = "No location specified";
      }
    };

    /**
     * Adds the cover photo into the modal and adjusts the header height to
     * display the photo. The title text is also given a dark background so
     * it can be shown against the photo.
     * 
     * @param  {Object} coverObject Cover photo object from Facebook
     */
    var processCover = function(coverObject) {
      if (coverObject.cover && coverObject.cover.source) {
        var cover = coverObject.cover;
        var height = 296 + ($scope.settings.modalBorderWidth * 2);
        var cssClass = {'background-image' : 'url(' + cover.source + ')',
                        'height' : height + 'px',
                        'background-position' : cover.offset_x + '% ' +
                                                cover.offset_y + '%'
                       };
        $('#header').css(cssClass);
        $('#heading').addClass('dark-background');
        // $('heading').css({'border-radius': $scope.settings.modalCorners + 'px'});
      }
    };

    /**
     * Processes the guest statatics from Facebook. Once done processing, the
     * height of the boxes for the guest statistics and the location are
     * adjusted so they match in height.
     * 
     * @param  {Object} guestObject Guest object from Facebook.
     * @return {[type]}             [description]
     */
    var processGuests = function(guestObject) {
      if (guestObject.data) {
        $scope.stats = processor.processGuests(guestObject);
      } else {
        $scope.guestFailed = true;
      }
      $timeout(function() {
        if ($($window).width() > 760) {
          if ($('#location').outerHeight() > $('#guests').outerHeight()) {
            $('#guests').outerHeight($('#location').outerHeight());
          } else {
            $('#location').outerHeight($('#guests').outerHeight());
          }
        }
      }, 100);
    };

    /**
     * Processes the feed of the event from Facebook. Each individual status and
     * comment on status is processed by various functions in the processor.js
     * file. Once done, the "Loading feed" message is hidden and the feed is
     * displayed.
     */
    var processFeed = function() {
      $scope.loadMoreFeed = false;
      if (feedObject.paging && feedObject.paging.next) {
        nextFeed = feedObject.paging.next;
        $scope.moreFeedMessage = "Show more posts";
      } else {
        nextFeed = false;
        $scope.moreFeedMessage = "";
      }
      var data = feedObject.data;
      if (data) {
        for (var i = 0; i < data.length; i++) {
          if (data[i].message) {
            var status = processor.processStatus(data[i]);
            if ($scope.feed.length < 5 || i < 5) {
              $scope.feed.push(status);
            } else {
              $scope.extraFeed.push(status);
            }
          }
        }
        if ($scope.extraFeed.length > 0) {
          $scope.moreFeedMessage = "Show more posts";
        }
      } else {
        $scope.moreFeedMessage = "";
        nextFeed = false;
      }
      $scope.displayFeed = true;
    };

    /**
     * Gets more comments to a Facebook status. If there are extra comments
     * that were initally hidden away (only a max of 5 comments are shown
     * initially), they are shown first. If the user wants to see more and
     * Facebook has provided a link to the next page of comments, this
     * function makes a call to the server to get that next page. If there are
     * more pages after that, this stores the link to the next page.
     * 
     * @param  {Number} index The index of the status in the event feed array
     *                        that we are getting more comments for.
     */
    $scope.showMoreReplies = function(index) {
      if (!$scope.feed[index].gettingReplies) {
        $scope.feed[index].gettingReplies = true;
        $scope.feed[index].repliesMessage = 'Getting more replies';
        if ($scope.feed[index].extraComments.length > 0) {
          $scope.feed[index].comments = $scope.feed[index].comments.concat($scope.feed[index].extraComments);
          $scope.feed[index].extraComments = [];
          if (!$scope.feed[index].more) {
            $scope.feed[index].repliesMessage = '';
          } else {
            $scope.feed[index].repliesMessage = 'Show more replies';
          }
           $scope.feed[index].gettingReplies = false;
        } else if ($scope.feed[index].more) {
          var params = fbEvents.parseUrl($scope.feed[index].more, false);
          server.getModalFeed(params, 'comments', $scope.eventId)
            .then(function(response) {
              $scope.feed[index] = processor.processAllComments($scope.feed[index], response);
            }, function(response) {
              $scope.feed[index].repliesMessage = 'Failed to get more replies; Try Again';
            })['finally'](function() {
              $scope.feed[index].gettingReplies = false;
            });
        } else {
          $scope.feed[index].repliesMessage = '';
        }
      }
    };

    /**
     * Gets more statuses to the event feed. If there are extra statuses
     * that were initally hidden away (only a max of 5 statuses are shown
     * initially), they are shown first. If the user wants to see more and
     * Facebook has provided a link to the next page of statuses, this
     * function makes a call to the server to get that next page. If there are
     * more pages after that, this stores the link to the next page.
     */
    $scope.showMoreFeed = function() {
      if (notGettingMoreFeed) {
        notGettingMoreFeed = false;
        $scope.moreFeedMessage = "Getting more posts";
        if ($scope.extraFeed.length > 0) {
          $scope.feed = $scope.feed.concat($scope.extraFeed);
          $scope.extraFeed = [];
          if (nextFeed) {
            $scope.moreFeedMessage = 'Show more posts';
          } else {
            $scope.moreFeedMessage = '';
          }
          notGettingMoreFeed = true;
        } else if (nextFeed) {
          $scope.moreFeedMessage = 'Getting more posts';
          var params = fbEvents.parseUrl(nextFeed, true);
          params.id = $scope.eventId;
          server.getModalFeed(params, 'feed', $scope.eventId)
            .then(function(response) {
              feedObject = response;
              processFeed();
            }, function() {
              $scope.moreFeedMessage = 'Failed to get more posts; Try again';
            })['finally'](function() {
              notGettingMoreFeed = true;
            });
        }
      }
    };

    var rsvp = ['attending', 'maybe', 'declined']; 

    /**
     * Makes the call to Facebook to perform the action that the user has
     * requested.
     * 
     * @param  {String} action  The Facebook action the user has requested
     *                          (e.g. liking a comment)
     * @param  {String} key     Data needed to either tell Facebook to perform
     *            or            the action (e.g. a status ID) or data needed to
     *         {Number}         get the former or get other data that will be
     *                          needed to show the result of the action on the
     *                          modal (e.g. an index to an array where the
     *                          comment that is being liked can be found)
     * @param  {String} message For posting and commenting, this is the message
     *            or            to be posted/commented. For liking and unliking,
     *         {Number}         the comment is actually the index of the comment
     *                          in the status's array of comments (while the
     *                          key is the id of the comment)
     * @return {Object}         A promise to perform the action
     */
    $scope.interactWithFb = function(action, key, message) {
      var deferred = $q.defer();
      var index;
      if ($scope.settings.commenting) {
        var processed = processAction(action, key, message);
        if (!processed) {
          deferred.reject();
          return;
        } else {
          key = processed.key;
          index = processed.index;
          if (fbSetup.getFbReady()) {
            if (modalFbLogin.checkFirstTime()) {
              modalFbLogin.checkLoginState()
                .then(function() {
                  handleFbInteraction(action, key, message, index, deferred);
                }, function(response) {
                  deferred.reject();
                  setParams(action, key, message, index);
                  handleFailedFbLogin(response);
                });
            } else {
              var permission;
              if (rsvp.indexOf(action) >= 0) {
                permission = 'rsvp_event';
              } else {
                permission = 'publish_actions';
              }
              if (modalFbLogin.checkPermission(permission)) {
                handleFbInteraction(action, key, message, index, deferred);
              } else {
                modalFbLogin.loginWithPermission(permission, false)
                  .then(function() {
                    handleFbInteraction(action, key, message, index, deferred);
                  }, function(response) {
                    deferred.reject();
                    setParams(action, key, message, index);
                    handleFailedFbLogin(response);
                  });
              }
            }
          } else {
            deferred.reject();
            setParams(action, key, message, index);
            $scope.showModal('wait');
          }
        }
      } else {
        deferred.reject();
        location.reload();
      }
      return deferred.promise;
    };

    /**
     * This function processes the action by making sure all necessary
     * components (e.g. the message in a post) are there. If not, it returns
     * false and the action will never be performed.
     *
     * In addition, in some cases, the function takes the key and uses it to 
     * get the data need either for Facebook to perform the action or later
     * when the results of the action need to be shown to the user (e.g. need
     * to figure out which comment is being liked so we can incrememnt the
     * like counter).
     * 
     * @param  {String} action  Facebook action being performed
     * @param  {String} key     Either a necessary data piece to perform the
     *            or            interaction or data necessary to get another
     *         {Number}         piece of neccessary data to perform the action
     * @param  {String} message For posting and commenting, this is the message
     *            or            to be posted/commented. For liking and unliking,
     *         {Number}         the comment is actually the index of the comment
     *                          in the status's array of comments (while the
     *                          key is the id of the comment)
     * @return {Object}         An object containing the data necessary to
     *                          perform the Facebook action the user is
     *                          requesting
     */
    var processAction = function(action, key, message) {
      var index;
      if (action === 'like' || action === 'unlike') {
        if($scope.feed[key].liking) {
        //prevents problems if user mashes like button
          return false;
        } else {
          $scope.feed[key].liking = true;
        }
      } else if (action === 'post' || action === 'comment') {
        if (!message) {
          return false;
        }
      } else if (action === 'deletePost') {
        index = key;
      }
      if (rsvp.indexOf(action) >= 0 || action === 'post') {
        key = $scope.eventId;
      } else if (action === 'like' || action === 'unlike' ||
                action === 'comment' || action === 'deletePost') {
          index = key;
          key = $scope.feed[key].id;
      } else if (action === 'likeComment' || action === 'unlikeComment' ||
                 action === 'deleteComment') {
        for (var i = 0; i < $scope.feed.length; i++) {
          if ($scope.feed[i].comments[message] &&
              $scope.feed[i].comments[message].id === key) {
            index = i;
            break;
          }
        }
        if ($scope.feed[index].comments[message].liking) {
          return false;
        } else {
          $scope.feed[index].comments[message].liking = true;
        }
      }
      return {key: key, index: index};
    };

    /**
     * Makes a call to Facebook to do the action that the user wants. Then, on
     * success, it updates the modal to reflect the action (e.g. new status
     * is added to the feed or "like" button becomes "unlike" button). On
     * failure, an error message is displayed in a modal with the option to
     * try again.
     * 
     * @param  {String} action   Facebook action to be performed
     * @param  {String} key      Data needed by Facebook to perform the action
     * @param  {String} message  For posting and commenting, this is the message
     *            or             to be posted/commented. For liking and 
     *         {Number}          unliking the comment is actually the index of
     *                           the comment in the status's array of comments
     *                           (while the key is the id of the comment)  
     * @param  {Number} index    The index of some component whose location in
     *                           an array must be known to modify the modal
     *                           (e.g. the index of the status in the feed array
     *                           for a comment (whose own index in the status
     *                           array is in the message variable) that is being
     *                           liked)
     * @param  {Object} deferred Promise object to be resolved or reject
     *                           depending on whether the action was
     *                           performed successfully on Facebook
     */
    var handleFbInteraction = function(action, key, message, index, deferred) {
      fbEvents.processInteraction(action, key, message)
        .then(function(response) {
          if (response) {
            if (rsvp.indexOf(action) >= 0) {
              switch(action) {
                case 'attending':
                  $scope.rsvpStatus = 'Going';
                  break;
                case 'maybe':
                  $scope.rsvpStatus = 'Maybe';
                  break;
                case 'declined':
                  $scope.rsvpStatus = 'Declined';
              }
            } else {
              switch(action) {
                case 'post':
                  var status = processor.processStatus(response);
                  status.appPosted = true;
                  $scope.feed.unshift(status);
                  break;
                case 'like':
                  $scope.feed[index].numberLikes++;
                  $scope.feed[index].userLiked = true;
                  break;
                case 'unlike':
                  $scope.feed[index].numberLikes--;
                  $scope.feed[index].userLiked = false;
                  break;
                case 'likeComment':
                  $scope.feed[index].comments[message].numberLikes++;
                  $scope.feed[index].comments[message].userLiked = true;
                  break;
                case 'unlikeComment':
                  $scope.feed[index].comments[message].numberLikes--;
                  $scope.feed[index].comments[message].userLiked = false;
                  break;
                case 'comment':
                  $scope.showMoreReplies(index);
                  var comment = processor.processComments(response);
                  comment.appPosted = true;
                  $('#status' + index).css('border-radius', '0');
                  if ($scope.$$phase) {
                    $scope.feed[index].comments.push(comment);
                  } else {
                    $scope.$apply($scope.feed[index].comments.push(comment));
                  }
                  break;
                case 'deletePost':
                  $scope.feed.splice(index, 1);
                  break;
                case 'deleteComment':
                  $scope.feed[index].comments.splice(message, 1);
              }
            }
            deferred.resolve();
          }
        }, function() {
          setParams(action, key, message, index);
          deferred.reject();
          if (action === 'post' || action === 'comment') {
            $scope.showModal('facebook', message);
          } else {
            $scope.showModal('facebook');
          }
        })['finally'](function() {
            if (action.match(/likeComment/)) {
              $scope.feed[index].comments[message].liking = false;
            } else if (action.match(/like/)) {
              $scope.feed[index].liking = false;
            }
        });
    };

    /**
     * When an error occurs, the parameters that were used in calling the
     * interactWithFb function in the first place are saved so that in the
     * error modal that shows up, we can give the user a one-click option to
     * "Try again".
     *
     * This function makes sure the correct paramters are saved correctly.
     * 
     * @param {String} action    Facebook action user was trying to perform
     * @param {[type]} key       Some important piece of data that varies
     *                           depending on the action. In some cases (e.g.
     *                           liking), it has been modified such that it 
     *                           isn't necessary to start the interactWithFb
     *                           function up again.
     * @param  {String} message  For posting and commenting, this is the message
     *            or             to be posted/commented. For liking and 
     *         {Number}          unliking the comment is actually the index of
     *                           the comment in the status's array of comments
     *                           (while the key is the id of the comment) 
     * @param {Number} index     For some actions (e.g. commenting), this is
     *                           actually the original key that was passed into
     *                           the interactWithFb function, so we save this
     *                           instead of the "key" variable.
     */
    var setParams = function(action, key, message, index) {
      var changedKeyActions = ['like' , 'unlike', 'comment', 'deletePost'];
      if (changedKeyActions.indexOf(action) >= 0) {
        interactionParams = {action: action,
                             key: index,
                             message: message
                            };
      } else {
        interactionParams = {action: action,
                             key: key,
                             message: message
                            };
      }
    };

    /**
     * This function shows the appropriate error message modal when connecting
     * the user's Facebook account with the app fails.
     * 
     * @param  {Object} response The response from Facebook explaining why the
     *                           connecting attempt failed
     */
    var handleFailedFbLogin = function(response) {
      if (['declined', 'not logged in', 'declined permission'].indexOf(response) >= 0) {
        $scope.showModal(response);
      } else {
        $scope.showModal('facebook login');
      }
    };

    /**
     * This function makes sure the modal with the correct message shows up in
     * the correct situation.
     * @param  {String} type    The current sitation (e.g. "declined" when the
     *                          user refused to connect her Facebook account
     *                          with the app)
     * @param  {String} message The message the user was trying to post or
     *                          comment. This is stored so it can be displayed
     *                          in the modal. Thus, if the user doesn't want to
     *                          auto "Try again", they can just copy their
     *                          message and reload the page or just go to the
     *                          actual Facebook event page and paste it rather
     *                          than having to type it all over again.
     */
    $scope.showModal = function(type, message) {
      curErrorType = type;
      $scope.showLink = false;
      $scope.postError = false;
      $scope.permissionError = false;
      if (message) {
        $scope.postError = true;
        $scope.userPost = message;
      }
      var modal = processor.processModal(type);
      $scope.messageTitle = modal.messageTitle;
      $scope.messageBody = modal.messageBody;
      $scope.modalButton = modal.modalButton;
      $scope.showLink = modal.showLink;
      $scope.permissionError = modal.permissionError;
      $timeout(function() {
        $('#message').modal('show');
      }, 500);
    };

    var solveModal = {title: 'Trying again...',
                      message: 'Giving our best effort!'
                     };

    /**
     * If the user clicks "Try again" on the error message modal, this function
     * is called and tries to resolve the problem by calling the original
     * Facebook interaction function again. It also changes the modal message
     * to reflect the fact that the program is trying to resolve the problem.
     */
    $scope.solveError = function() {
      $scope.postError = false;
      $scope.permissionError = false;
      $scope.messageTitle = solveModal.title;
      $scope.messageBody = solveModal.message;
      if (curErrorType === 'declined permission') {
        getDeniedPermission();
      } else if (curErrorType === 'load') {
        location.reload();
      } else if (curErrorType === 'wait') {
        if (interactionParams.action === 'share') {
          $('#message').modal('hide');
          $timeout(function() {
            $scope.shareFbEvent();
          }, 1500);
        } else {
          $timeout(function() {
            tryInteractionAgain();
          }, 1500);
        }
      } else {
        tryInteractionAgain();
      }
    };

    /**
     * This function makes a call to Facebook asking for a permission that
     * the user has denied. This is done uniquely in this function rather than
     * the original interactWithFb function because Facebook has unique protocol
     * when asking again for a permission that the user has denied.
     *
     * On successfully attaining the permission, the original Facebook
     * interation the user wanted to perform is tried again. On failure, an
     * appropriate error message modal is shown.
     */
    var getDeniedPermission = function() {
      var permission;
      if (rsvp.indexOf(interactionParams.action) >= 0) {
        permission = 'rsvp_event';
      } else {
        permission = 'publish_actions';
      }
      modalFbLogin.loginWithPermission(permission, true)
        .then(function() {
          tryInteractionAgain();
        }, function(response) {
          $('#message').modal('hide');
          $timeout(function() {
            handleFailedFbLogin(response);
          }, 1000);
        });
    };

    /**
     * This function tries the Facebook interaction that the user requested
     * again. It is only called if an error happens on the previous attempt
     * and the user clicks the "Try again" button.
     * 
     * On success, a success message is shown and the modal fades. Else, the
     * modal just fades and a new modal appears (triggered by the
     * interactWithFb function failing again) showing the appropriate error
     * message.
     */
    var tryInteractionAgain = function() {
      $scope.interactWithFb(interactionParams.action, interactionParams.key,
                            interactionParams.message)
        .then(function() {
          $scope.messageBody = 'Success!';
          $timeout(function() {
            $('#message').modal('hide');
          }, 1500);
        }, function() {
          $('#message').modal('hide');
        });
      };

    /**
     * Called on load, this massive block of server calls and promises basically
     * says that if we have the event ID, then make a call to the server for
     * the appropriate basic event data. After getting the basic event data, go
     * get the cover photo data. After getting the cover photo data, get the
     * guest statistics, and finally get the feed.
     *
     * The reason for 4 consecutive calls to the server rather than just one is
     * because this allows the client to use some of the waiting time to start
     * processing the data it already has so it can be shown to the visitor,
     * giving the illusion of a faster program (e.g. the basic event data is
     * being processed while the client waits for the server to return the cover
     * photo).
     *
     * If anything fails, either an error modal appears or some message is
     * shown to the user in the current modal to alert them of the situation.
     * 
     * Unfortunately, right now, the server calls are stacked so that they are
     * dependent on the previous call (e.g. failure to get the cover results in
     * guest statistics and feed never getting fetched). This could be resolved
     * by not calling the next server call on success, but rather regardless
     * of success and error (as a "finally" function). But to maintain our
     * 4 vs. 1 call advantage, we would have to include the process functions in
     * the "finally" function as well and make sure they can handle error
     * responses being passed into them.
     */
    if (!$scope.eventId) {
      $scope.showModal('load');
    } else {
      server.getModalEvent($scope.eventId, "all")
        .then(function(response) {
          server.getModalEvent($scope.eventId, "cover")
            .then(function(response) {
              server.getModalEvent($scope.eventId, "guests")
                .then(function(response) {
                  server.getModalEvent($scope.eventId, "feed")
                    .then(function(response) {
                      feedObject = response;
                      processFeed();
                    }, function(response) {
                      $scope.feedFailed = true;
                    });
                  processGuests(response);
                }, function(response) {
                  $scope.guestFailed = true;
                });
              processCover(response);
            }, function(response) {});
          eventInfo = response.event_data;
          $scope.settings = response.settings;
          setSettings();
          processEventInfo();
        }, function() {
          $scope.showModal('load');
        });
    }
});
